import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LoadingState, EmptyState } from "@/components/shared/PageStates";
import { formatCurrency } from "@/lib/template-engine";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Truck, CheckCircle, Phone, DollarSign } from "lucide-react";
import type { Order, Client } from "@/types/database";

export default function DeliveryPage() {
  const [orders, setOrders] = useState<(Order & { clients: Client })[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchOrders = async () => {
    const { data } = await supabase.from("orders").select("*, clients(*)").eq("status", "to_deliver").order("created_at");
    setOrders((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const markDelivered = async (orderId: string) => {
    await supabase.from("orders").update({ status: "delivered" }).eq("id", orderId);
    await supabase.from("order_status_history").insert({ order_id: orderId, from_status: "to_deliver", to_status: "delivered", changed_by: user!.id });
    toast.success("Marked as delivered!");
    fetchOrders();
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      {/* Header with count badge */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <h1 className="page-title flex items-center gap-2"><Truck className="h-6 w-6 text-primary" />To Deliver</h1>
          {orders.length > 0 && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold gradient-primary text-white">{orders.length}</span>
          )}
        </div>
        <p className="page-subtitle">Orders ready for delivery to clients</p>
      </div>

      {orders.length === 0 ? (
        <EmptyState title="Nothing to deliver" description="All verified orders have been delivered. Great work! 🎉" />
      ) : (
        <div className="premium-table">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20 hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Order</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Client</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Phone</TableHead>
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
                  <TableCell className="mono text-xs text-muted-foreground">{order.clients?.phone}</TableCell>
                  <TableCell className="mono text-sm font-medium">{formatCurrency(Number(order.total_amount))}</TableCell>
                  <TableCell className="text-xs text-muted-foreground/60">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button size="sm" onClick={() => markDelivered(order.id)} className="rounded-lg text-xs gradient-primary text-white border-0 h-8 shadow-lg shadow-primary/20">
                      <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Deliver
                    </Button>
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
