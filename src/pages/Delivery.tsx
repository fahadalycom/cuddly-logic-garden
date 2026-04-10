import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useClipboard } from "@/hooks/useClipboard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { LoadingState, EmptyState } from "@/components/shared/PageStates";
import { formatCurrency } from "@/lib/template-engine";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Truck, CheckCircle, Package } from "lucide-react";
import type { Order, Client, SoftwareAccount, OrderItem } from "@/types/database";

export default function DeliveryPage() {
  const [orders, setOrders] = useState<(Order & { clients: Client; order_items: (OrderItem & { products: { name: string } })[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<typeof orders[0] | null>(null);
  const [availableAccounts, setAvailableAccounts] = useState<(SoftwareAccount & { products: { name: string } })[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const { user } = useAuth();
  const { copy } = useClipboard();

  const fetchOrders = async () => {
    const { data } = await supabase.from("orders").select("*, clients(*), order_items(*, products(name))").eq("status", "to_deliver").order("created_at");
    setOrders((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const openAssignDialog = async (order: typeof orders[0]) => {
    setSelectedOrder(order);
    const productIds = order.order_items?.map(i => i.product_id) || [];
    if (productIds.length > 0) {
      const { data } = await supabase.from("software_accounts").select("*, products(name)").in("product_id", productIds).eq("status", "available").eq("is_archived", false);
      setAvailableAccounts((data as any) || []);
    } else {
      setAvailableAccounts([]);
    }
    setSelectedAccountId("");
    setShowAssign(true);
  };

  const deliverWithAccount = async () => {
    if (!selectedOrder || !user) return;
    // Mark delivered
    await supabase.from("orders").update({ status: "delivered" }).eq("id", selectedOrder.id);
    await supabase.from("order_status_history").insert({ order_id: selectedOrder.id, from_status: "to_deliver", to_status: "delivered", changed_by: user.id });

    // Assign account if selected
    if (selectedAccountId) {
      const account = availableAccounts.find(a => a.id === selectedAccountId);
      await supabase.from("account_assignments").insert({
        account_id: selectedAccountId, client_id: selectedOrder.client_id, assigned_by: user.id,
        order_item_id: selectedOrder.order_items?.[0]?.id || null,
      });
      const newSeats = (account?.used_seats || 0) + 1;
      const newStatus = newSeats >= (account?.capacity || 1) ? "exhausted" : "assigned";
      await supabase.from("software_accounts").update({ used_seats: newSeats, status: newStatus as any }).eq("id", selectedAccountId);

      // Copy delivery message
      const msg = `✅ *Delivery Confirmation*\n\nHi ${selectedOrder.clients?.name}!\n\nYour order has been delivered.\n\n🔐 *Account Details:*\n${account?.username ? `Username: ${account.username}` : ""}\n${account?.password_encrypted ? `Password: ${account.password_encrypted}` : ""}\n${account?.login_instructions || ""}\n\nEnjoy! 🎉`;
      copy(msg, "Delivery credentials");
    }

    toast.success("Order delivered!");
    setShowAssign(false);
    fetchOrders();
  };

  const quickDeliver = async (orderId: string) => {
    await supabase.from("orders").update({ status: "delivered" }).eq("id", orderId);
    await supabase.from("order_status_history").insert({ order_id: orderId, from_status: "to_deliver", to_status: "delivered", changed_by: user!.id });
    toast.success("Marked as delivered!");
    fetchOrders();
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <h1 className="page-title flex items-center gap-2"><Truck className="h-6 w-6 text-primary" />To Deliver</h1>
          {orders.length > 0 && <span className="px-2.5 py-1 rounded-full text-[11px] font-bold gradient-primary text-white">{orders.length}</span>}
        </div>
        <p className="page-subtitle">Orders ready for delivery to clients</p>
      </div>

      {orders.length === 0 ? (
        <EmptyState title="Nothing to deliver" description="All verified orders have been delivered. 🎉" />
      ) : (
        <div className="premium-table">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20 hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Order</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Client</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Product</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Total</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Date</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} className="border-border/10 hover:bg-card/40 transition-colors">
                  <TableCell className="mono text-xs text-muted-foreground">{order.id.slice(0, 8)}</TableCell>
                  <TableCell className="font-medium text-sm">{order.clients?.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{order.order_items?.[0]?.products?.name || "—"}</TableCell>
                  <TableCell className="mono text-sm font-medium">{formatCurrency(Number(order.total_amount))}</TableCell>
                  <TableCell className="text-xs text-muted-foreground/60">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      <Button size="sm" onClick={() => openAssignDialog(order)} className="rounded-lg text-xs gradient-primary text-white border-0 h-8">
                        <Package className="h-3.5 w-3.5 mr-1" />Assign & Deliver
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => quickDeliver(order.id)} className="rounded-lg text-xs border-border/20 h-8">
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />Quick
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent className="glass-strong rounded-2xl border-border/30">
          <DialogHeader><DialogTitle>Assign Account & Deliver</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Client: <span className="text-foreground font-medium">{selectedOrder?.clients?.name}</span>
            </div>
            {availableAccounts.length > 0 ? (
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Select Account</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger className="mt-1.5 bg-secondary/30 border-border/30 rounded-xl"><SelectValue placeholder="Select available account" /></SelectTrigger>
                  <SelectContent className="glass-strong rounded-xl border-border/30">
                    {availableAccounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.products?.name} — {a.username || "No username"} ({a.used_seats}/{a.capacity} seats)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="text-sm text-amber-400">No available accounts for this product. You can still deliver without assigning.</p>
            )}
            <Button onClick={deliverWithAccount} className="w-full rounded-xl gradient-primary text-white border-0">
              {selectedAccountId ? "Assign & Deliver" : "Deliver Without Account"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
