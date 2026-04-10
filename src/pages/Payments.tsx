import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState, EmptyState } from "@/components/shared/PageStates";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/template-engine";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Search, CheckCircle, XCircle } from "lucide-react";
import type { Order, Client, Payment } from "@/types/database";

export default function PaymentsPage() {
  const [orders, setOrders] = useState<(Order & { clients: Client })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [paymentAmount, setPaymentAmount] = useState<Record<string, number>>({});
  const { user } = useAuth();

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*, clients(*)")
      .in("status", ["paid_unverified"])
      .order("created_at", { ascending: false });
    setOrders((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const verifyPayment = async (order: Order & { clients: Client }) => {
    const amount = paymentAmount[order.id] || Number(order.remaining_due);
    
    await supabase.from("payments").insert({
      order_id: order.id,
      amount,
      status: "verified",
      verified_by: user!.id,
      verified_at: new Date().toISOString(),
    });

    const newPaid = Number(order.paid_amount) + amount;
    const newRemaining = Number(order.total_amount) - Number(order.discount_amount) - newPaid;

    await supabase.from("orders").update({
      status: "paid_verified",
      paid_amount: newPaid,
      remaining_due: Math.max(0, newRemaining),
    }).eq("id", order.id);

    await supabase.from("order_status_history").insert({
      order_id: order.id,
      from_status: "paid_unverified",
      to_status: "paid_verified",
      changed_by: user!.id,
    });

    toast.success("Payment verified!");
    fetchOrders();
  };

  const rejectPayment = async (order: Order & { clients: Client }) => {
    await supabase.from("orders").update({ status: "pending_payment" }).eq("id", order.id);
    await supabase.from("order_status_history").insert({
      order_id: order.id,
      from_status: "paid_unverified",
      to_status: "pending_payment",
      changed_by: user!.id,
      notes: "Payment rejected",
    });
    toast.info("Payment rejected, moved back to pending");
    fetchOrders();
  };

  const filtered = orders.filter((o) =>
    o.clients?.name?.toLowerCase().includes(search.toLowerCase()) || o.id.includes(search)
  );

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Payment Verification</h1>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No pending verifications" description="All payments have been processed." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Verify Amount</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}</TableCell>
                  <TableCell>{order.clients?.name}</TableCell>
                  <TableCell>{formatCurrency(Number(order.total_amount))}</TableCell>
                  <TableCell>{formatCurrency(Number(order.remaining_due))}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-28"
                      value={paymentAmount[order.id] ?? Number(order.remaining_due)}
                      onChange={(e) => setPaymentAmount({ ...paymentAmount, [order.id]: Number(e.target.value) })}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => verifyPayment(order)}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Verify
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => rejectPayment(order)}>
                        <XCircle className="h-4 w-4 mr-1" /> Reject
                      </Button>
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
