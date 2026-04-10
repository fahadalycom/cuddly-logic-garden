import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LoadingState, EmptyState } from "@/components/shared/PageStates";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/template-engine";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle } from "lucide-react";
import type { Order, Client } from "@/types/database";

export default function CompletedPage() {
  const [orders, setOrders] = useState<(Order & { clients: Client })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("orders").select("*, clients(*)").eq("status", "delivered").order("updated_at", { ascending: false }).then(({ data }) => {
      setOrders((data as any) || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><CheckCircle className="h-6 w-6 text-success" />Completed Orders</h1>
        <p className="page-subtitle">{orders.length} orders successfully delivered</p>
      </div>
      {orders.length === 0 ? (
        <EmptyState title="No completed orders yet" description="Delivered orders will appear here." />
      ) : (
        <div className="premium-table">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20 hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Order</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Client</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Total</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Completed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id} className="border-border/10 hover:bg-card/40 transition-colors">
                  <TableCell className="mono text-xs text-muted-foreground">{o.id.slice(0, 8)}</TableCell>
                  <TableCell className="font-medium text-sm">{o.clients?.name}</TableCell>
                  <TableCell className="mono text-sm font-medium">{formatCurrency(Number(o.total_amount))}</TableCell>
                  <TableCell><StatusBadge status={o.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground/60">{new Date(o.updated_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
