import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState, EmptyState } from "@/components/shared/PageStates";
import { formatCurrency } from "@/lib/template-engine";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Search, CheckCircle, XCircle, CreditCard, Loader2 } from "lucide-react";
import type { Order, Client } from "@/types/database";

export default function PaymentsPage() {
  const [orders, setOrders] = useState<(Order & { clients: Client })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [paymentAmount, setPaymentAmount] = useState<Record<string, number>>({});
  const { user } = useAuth();
  const { submitting, run } = useSubmitGuard();
  const [activeId, setActiveId] = useState<string | null>(null);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders").select("*, clients(*)")
      .in("status", ["paid_unverified"])
      .order("created_at", { ascending: false });
    setOrders((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const verifyPayment = (order: Order & { clients: Client }) => run(async () => {
    setActiveId(order.id);
    try {
      const remaining = Number(order.remaining_due);
      const requested = Number(paymentAmount[order.id] ?? remaining);
      if (requested <= 0) { toast.error("Amount must be greater than zero"); return; }
      if (requested > remaining + 0.001) {
        toast.error(`Amount exceeds remaining due (${formatCurrency(remaining)})`);
        return;
      }
      const { error: payErr } = await supabase.from("payments").insert({
        order_id: order.id, amount: requested, status: "verified",
        verified_by: user!.id, verified_at: new Date().toISOString(),
      });
      if (payErr) { toast.error(payErr.message); return; }

      const newPaid = Number(order.paid_amount) + requested;
      const totalDue = Number(order.total_amount) - Number(order.discount_amount);
      const newRemaining = Math.max(0, totalDue - newPaid);
      const fullyPaid = newRemaining < 0.01;
      const nextStatus = fullyPaid ? "paid_verified" : "pending_payment";

      const { error: updErr } = await supabase.from("orders").update({
        status: nextStatus,
        payment_status: fullyPaid ? "paid" : "unpaid",
        paid_amount: newPaid,
        remaining_due: newRemaining,
      }).eq("id", order.id);
      if (updErr) { toast.error(updErr.message); return; }

      await supabase.from("order_status_history").insert({
        order_id: order.id,
        from_status: "paid_unverified",
        to_status: nextStatus,
        changed_by: user!.id,
        notes: fullyPaid ? "Payment fully verified" : `Partial payment: ${formatCurrency(requested)}`,
      });
      toast.success(fullyPaid ? "Payment verified!" : "Partial payment recorded");
      fetchOrders();
    } finally {
      setActiveId(null);
    }
  });

  const rejectPayment = (order: Order & { clients: Client }) => run(async () => {
    setActiveId(order.id);
    try {
      const { error } = await supabase.from("orders")
        .update({ status: "pending_payment" }).eq("id", order.id);
      if (error) { toast.error(error.message); return; }
      await supabase.from("order_status_history").insert({
        order_id: order.id, from_status: "paid_unverified", to_status: "pending_payment",
        changed_by: user!.id, notes: "Payment rejected",
      });
      toast.info("Payment rejected, moved back to pending");
      fetchOrders();
    } finally {
      setActiveId(null);
    }
  });

  const filtered = orders.filter((o) => o.clients?.name?.toLowerCase().includes(search.toLowerCase()) || o.id.includes(search));

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><CreditCard className="h-6 w-6 text-primary" />Payment Verification</h1>
        <p className="page-subtitle">{orders.length} payments awaiting verification</p>
      </div>

      <div className="search-premium relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 z-10" />
        <Input className="pl-10 bg-card/40 border-border/20 rounded-xl h-11" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No pending verifications" description="All payments have been processed." />
      ) : (
        <div className="premium-table">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20 hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Order</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Client</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Total</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Remaining</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Amount</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((order) => (
                <TableRow key={order.id} className="border-border/10 hover:bg-card/40 transition-colors">
                  <TableCell className="mono text-xs text-muted-foreground">{order.id.slice(0, 8)}</TableCell>
                  <TableCell className="font-medium text-sm">{order.clients?.name}</TableCell>
                  <TableCell className="mono text-sm">{formatCurrency(Number(order.total_amount))}</TableCell>
                  <TableCell className="mono text-sm text-muted-foreground">{formatCurrency(Number(order.remaining_due))}</TableCell>
                  <TableCell>
                    <Input type="number" className="w-28 bg-card/40 border-border/20 rounded-lg h-9 mono text-sm" value={paymentAmount[order.id] ?? Number(order.remaining_due)} onChange={(e) => setPaymentAmount({ ...paymentAmount, [order.id]: Number(e.target.value) })} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        disabled={submitting && activeId === order.id}
                        onClick={() => verifyPayment(order)}
                        className="rounded-lg text-xs h-8 gradient-primary text-white border-0"
                      >
                        {submitting && activeId === order.id
                          ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                          : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                        Verify
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={submitting && activeId === order.id}
                        onClick={() => rejectPayment(order)}
                        className="rounded-lg text-xs h-8 border-destructive/20 text-destructive hover:bg-destructive/10"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
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
