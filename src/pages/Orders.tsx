import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClipboard } from "@/hooks/useClipboard";
import { formatCurrency } from "@/lib/template-engine";
import { LoadingState, EmptyState } from "@/components/shared/PageStates";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Search, FileText } from "lucide-react";
import type { Order, Client } from "@/types/database";

export default function OrdersPage() {
  const [orders, setOrders] = useState<(Order & { clients: Client })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { user } = useAuth();

  const fetchOrders = async () => {
    const { data } = await supabase.from("orders").select("*, clients(*)").eq("is_archived", false).order("created_at", { ascending: false });
    setOrders((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const updateOrderStatus = async (orderId: string, newStatus: string, fromStatus: string) => {
    const { error } = await supabase.from("orders").update({ status: newStatus as any }).eq("id", orderId);
    if (error) { toast.error(error.message); return; }
    await supabase.from("order_status_history").insert({ order_id: orderId, from_status: fromStatus as any, to_status: newStatus as any, changed_by: user!.id });
    toast.success("Order updated!");
    fetchOrders();
  };

  const filtered = orders.filter((o) => {
    const matchSearch = o.clients?.name?.toLowerCase().includes(search.toLowerCase()) || o.id.includes(search);
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><FileText className="h-6 w-6 text-primary" />Orders</h1>
        <p className="page-subtitle">{orders.length} total orders</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="search-premium relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 z-10" />
          <Input className="pl-10 bg-card/40 border-border/20 rounded-xl h-11" placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 bg-card/40 border-border/20 rounded-xl h-11"><SelectValue /></SelectTrigger>
          <SelectContent className="glass-strong rounded-xl border-border/30">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_payment">Pending Payment</SelectItem>
            <SelectItem value="paid_unverified">Paid (Unverified)</SelectItem>
            <SelectItem value="paid_verified">Verified</SelectItem>
            <SelectItem value="to_deliver">To Deliver</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No orders found" description="Orders will appear here once created." />
      ) : (
        <div className="premium-table">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20 hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Order ID</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Client</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Total</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Paid</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Due</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Date</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((order) => (
                <TableRow key={order.id} className="border-border/10 hover:bg-card/40 transition-colors">
                  <TableCell className="mono text-xs text-muted-foreground">{order.id.slice(0, 8)}</TableCell>
                  <TableCell className="font-medium text-sm">{order.clients?.name || "—"}</TableCell>
                  <TableCell><StatusBadge status={order.status} /></TableCell>
                  <TableCell className="mono text-sm font-medium">{formatCurrency(Number(order.total_amount))}</TableCell>
                  <TableCell className="mono text-sm text-muted-foreground">{formatCurrency(Number(order.paid_amount))}</TableCell>
                  <TableCell className="mono text-sm text-muted-foreground">{formatCurrency(Number(order.remaining_due))}</TableCell>
                  <TableCell className="text-xs text-muted-foreground/60">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      {order.status === "pending_payment" && (
                        <Button size="sm" variant="outline" onClick={() => updateOrderStatus(order.id, "paid_unverified", order.status)} className="rounded-lg text-xs border-border/20 bg-card/40 hover:bg-card/60 h-8">
                          Mark Paid
                        </Button>
                      )}
                      {order.status === "paid_verified" && (
                        <Button size="sm" variant="outline" onClick={() => updateOrderStatus(order.id, "to_deliver", order.status)} className="rounded-lg text-xs border-border/20 bg-card/40 hover:bg-card/60 h-8">
                          To Deliver
                        </Button>
                      )}
                      {order.status === "to_deliver" && (
                        <Button size="sm" onClick={() => updateOrderStatus(order.id, "delivered", order.status)} className="rounded-lg text-xs gradient-primary text-white border-0 h-8">
                          Delivered
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
