import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useClipboard } from "@/hooks/useClipboard";
import { formatCurrency, renderTemplate } from "@/lib/template-engine";
import { LoadingState, EmptyState } from "@/components/shared/PageStates";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Plus, Search } from "lucide-react";
import type { Order, Client, Product, ProductVariant, ProductDuration } from "@/types/database";

export default function OrdersPage() {
  const [orders, setOrders] = useState<(Order & { clients: Client })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { user } = useAuth();
  const { copy } = useClipboard();

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*, clients(*)")
      .eq("is_archived", false)
      .order("created_at", { ascending: false });
    setOrders((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const updateOrderStatus = async (orderId: string, newStatus: string, fromStatus: string) => {
    const { error } = await supabase.from("orders").update({ status: newStatus as any }).eq("id", orderId);
    if (error) { toast.error(error.message); return; }
    await supabase.from("order_status_history").insert({
      order_id: orderId,
      from_status: fromStatus as any,
      to_status: newStatus as any,
      changed_by: user!.id,
    });
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
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Orders</h1>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
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
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}</TableCell>
                  <TableCell>{order.clients?.name || "—"}</TableCell>
                  <TableCell><StatusBadge status={order.status} /></TableCell>
                  <TableCell>{formatCurrency(Number(order.total_amount))}</TableCell>
                  <TableCell>{formatCurrency(Number(order.paid_amount))}</TableCell>
                  <TableCell>{formatCurrency(Number(order.remaining_due))}</TableCell>
                  <TableCell className="text-xs">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {order.status === "pending_payment" && (
                        <Button size="sm" variant="outline" onClick={() => updateOrderStatus(order.id, "paid_unverified", order.status)}>
                          Mark Paid
                        </Button>
                      )}
                      {order.status === "paid_verified" && (
                        <Button size="sm" variant="outline" onClick={() => updateOrderStatus(order.id, "to_deliver", order.status)}>
                          To Deliver
                        </Button>
                      )}
                      {order.status === "to_deliver" && (
                        <Button size="sm" variant="outline" onClick={() => updateOrderStatus(order.id, "delivered", order.status)}>
                          Delivered
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
