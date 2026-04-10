import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useClipboard } from "@/hooks/useClipboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/template-engine";
import { LoadingState, EmptyState } from "@/components/shared/PageStates";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, FileText, Eye, Download, ExternalLink } from "lucide-react";
import type { Order, Client, OrderItem, OrderStatusHistory } from "@/types/database";

export default function OrdersPage() {
  const [orders, setOrders] = useState<(Order & { clients: Client })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<(OrderItem & { products: { name: string }; product_variants: { name: string } | null })[]>([]);
  const [orderHistory, setOrderHistory] = useState<OrderStatusHistory[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const { copy } = useClipboard();

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

  const viewOrderDetail = async (orderId: string) => {
    setSelectedOrder(orderId);
    const [items, history] = await Promise.all([
      supabase.from("order_items").select("*, products(name), product_variants(name)").eq("order_id", orderId),
      supabase.from("order_status_history").select("*").eq("order_id", orderId).order("created_at", { ascending: false }),
    ]);
    setOrderItems((items.data as any) || []);
    setOrderHistory(history.data || []);
  };

  const bulkUpdateStatus = async (newStatus: string) => {
    for (const id of selectedIds) {
      const order = orders.find(o => o.id === id);
      if (order) await updateOrderStatus(id, newStatus, order.status);
    }
    setSelectedIds(new Set());
  };

  const exportCSV = () => {
    const headers = "Order ID,Client,Status,Total,Paid,Due,Date\n";
    const rows = filtered.map(o => `${o.id.slice(0, 8)},${o.clients?.name || ""},${o.status},${o.total_amount},${o.paid_amount},${o.remaining_due},${new Date(o.created_at).toLocaleDateString()}`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "orders.csv"; a.click();
    toast.success("CSV exported!");
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const filtered = orders.filter((o) => {
    const matchSearch = o.clients?.name?.toLowerCase().includes(search.toLowerCase()) || o.id.includes(search);
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const selectedOrderData = orders.find(o => o.id === selectedOrder);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="page-header mb-0">
          <h1 className="page-title flex items-center gap-2"><FileText className="h-6 w-6 text-primary" />Orders</h1>
          <p className="page-subtitle">{orders.length} total orders</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <Select onValueChange={bulkUpdateStatus}>
              <SelectTrigger className="w-40 bg-card/40 border-border/20 rounded-xl h-9 text-xs"><SelectValue placeholder={`Bulk (${selectedIds.size})`} /></SelectTrigger>
              <SelectContent className="glass-strong rounded-xl border-border/30">
                <SelectItem value="paid_unverified">Mark Paid</SelectItem>
                <SelectItem value="to_deliver">To Deliver</SelectItem>
                <SelectItem value="cancelled">Cancel</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button size="sm" variant="outline" onClick={exportCSV} className="rounded-xl border-border/20 h-9 text-xs">
            <Download className="h-3.5 w-3.5 mr-1" />CSV
          </Button>
        </div>
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

      {filtered.length === 0 ? <EmptyState title="No orders found" /> : (
        <div className="premium-table">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20 hover:bg-transparent">
                <TableHead className="w-8"></TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Order ID</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Client</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Total</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Due</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Date</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((order) => (
                <TableRow key={order.id} className="border-border/10 hover:bg-card/40 transition-colors">
                  <TableCell><input type="checkbox" checked={selectedIds.has(order.id)} onChange={() => toggleSelect(order.id)} className="rounded border-border/40" /></TableCell>
                  <TableCell className="mono text-xs text-muted-foreground">{order.id.slice(0, 8)}</TableCell>
                  <TableCell className="font-medium text-sm">{order.clients?.name || "—"}</TableCell>
                  <TableCell><StatusBadge status={order.status} /></TableCell>
                  <TableCell className="mono text-sm font-medium">{formatCurrency(Number(order.total_amount))}</TableCell>
                  <TableCell className="mono text-sm text-muted-foreground">{formatCurrency(Number(order.remaining_due))}</TableCell>
                  <TableCell className="text-xs text-muted-foreground/60">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="ghost" onClick={() => viewOrderDetail(order.id)} className="h-7 w-7 rounded-lg"><Eye className="h-3.5 w-3.5" /></Button>
                      {order.status === "pending_payment" && <Button size="sm" variant="outline" onClick={() => updateOrderStatus(order.id, "paid_unverified", order.status)} className="rounded-lg text-xs h-8">Mark Paid</Button>}
                      {order.status === "paid_verified" && <Button size="sm" variant="outline" onClick={() => updateOrderStatus(order.id, "to_deliver", order.status)} className="rounded-lg text-xs h-8">To Deliver</Button>}
                      {order.status === "to_deliver" && <Button size="sm" onClick={() => updateOrderStatus(order.id, "delivered", order.status)} className="rounded-lg text-xs gradient-primary text-white border-0 h-8">Delivered</Button>}
                      {order.clients?.whatsapp_number && (
                        <Button size="sm" variant="ghost" onClick={() => window.open(`https://wa.me/${order.clients.whatsapp_number?.replace(/\D/g, "")}`, "_blank")} className="h-7 w-7 rounded-lg text-emerald-400">
                          <ExternalLink className="h-3.5 w-3.5" />
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

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="glass-strong rounded-2xl border-border/30 max-w-2xl">
          <DialogHeader><DialogTitle>Order #{selectedOrderData?.id.slice(0, 8)}</DialogTitle></DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><span className="text-muted-foreground text-xs">Client</span><p className="font-medium">{selectedOrderData?.clients?.name}</p></div>
              <div><span className="text-muted-foreground text-xs">Total</span><p className="font-medium mono">{formatCurrency(Number(selectedOrderData?.total_amount || 0))}</p></div>
              <div><span className="text-muted-foreground text-xs">Status</span><p>{selectedOrderData && <StatusBadge status={selectedOrderData.status} />}</p></div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Order Items</h4>
              {orderItems.length === 0 ? <p className="text-sm text-muted-foreground">No items</p> : (
                <div className="space-y-2">
                  {orderItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-secondary/20 border border-border/20">
                      <div>
                        <span className="text-sm font-medium">{item.products?.name}</span>
                        {item.product_variants && <span className="text-xs text-muted-foreground ml-2">({item.product_variants.name})</span>}
                        {item.duration_value && <Badge variant="outline" className="ml-2 text-[9px] rounded-lg">{item.duration_value} {item.duration_type}</Badge>}
                      </div>
                      <span className="mono text-sm font-medium">{formatCurrency(Number(item.line_total))}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Status Timeline</h4>
              <div className="space-y-2">
                {orderHistory.map(h => (
                  <div key={h.id} className="flex items-center gap-3 text-sm">
                    <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                    <span className="capitalize text-foreground">{h.from_status ? `${h.from_status.replace(/_/g, " ")} → ` : ""}{h.to_status.replace(/_/g, " ")}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{new Date(h.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
