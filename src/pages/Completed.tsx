import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { LoadingState, EmptyState } from "@/components/shared/PageStates";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/template-engine";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Completed Orders</h1>
      {orders.length === 0 ? (
        <EmptyState title="No completed orders yet" />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Completed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}</TableCell>
                  <TableCell>{o.clients?.name}</TableCell>
                  <TableCell>{formatCurrency(Number(o.total_amount))}</TableCell>
                  <TableCell><StatusBadge status={o.status} /></TableCell>
                  <TableCell className="text-xs">{new Date(o.updated_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
