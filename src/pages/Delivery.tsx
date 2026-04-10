import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingState, EmptyState } from "@/components/shared/PageStates";
import { formatCurrency } from "@/lib/template-engine";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Truck, CheckCircle } from "lucide-react";
import type { Order, Client } from "@/types/database";

export default function DeliveryPage() {
  const [orders, setOrders] = useState<(Order & { clients: Client })[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*, clients(*)")
      .eq("status", "to_deliver")
      .order("created_at");
    setOrders((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const markDelivered = async (orderId: string) => {
    await supabase.from("orders").update({ status: "delivered" }).eq("id", orderId);
    await supabase.from("order_status_history").insert({
      order_id: orderId,
      from_status: "to_deliver",
      to_status: "delivered",
      changed_by: user!.id,
    });
    toast.success("Marked as delivered!");
    fetchOrders();
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">To Deliver</h1>
      {orders.length === 0 ? (
        <EmptyState title="Nothing to deliver" description="All verified orders have been delivered." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}</TableCell>
                  <TableCell>{order.clients?.name}</TableCell>
                  <TableCell>{order.clients?.phone}</TableCell>
                  <TableCell>{formatCurrency(Number(order.total_amount))}</TableCell>
                  <TableCell className="text-xs">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button size="sm" onClick={() => markDelivered(order.id)}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Mark Delivered
                    </Button>
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
