import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingState, EmptyState } from "@/components/shared/PageStates";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClipboard } from "@/hooks/useClipboard";
import { MessageSquare } from "lucide-react";
import type { Subscription, Client } from "@/types/database";

export default function RenewalsPage() {
  const [subs, setSubs] = useState<(Subscription & { clients: Client })[]>([]);
  const [loading, setLoading] = useState(true);
  const { copy } = useClipboard();

  useEffect(() => {
    supabase.from("subscriptions").select("*, clients(*)").in("status", ["active", "expiring"]).order("end_date").then(({ data }) => {
      setSubs((data as any) || []);
      setLoading(false);
    });
  }, []);

  const daysLeft = (end: string) => Math.ceil((new Date(end).getTime() - Date.now()) / 86400000);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Renewals</h1>
      {subs.length === 0 ? <EmptyState title="No active subscriptions" /> : (
        <Card>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Client</TableHead><TableHead>Product</TableHead><TableHead>End Date</TableHead><TableHead>Days Left</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>{subs.map((s) => {
              const dl = daysLeft(s.end_date);
              return (
                <TableRow key={s.id}>
                  <TableCell>{s.clients?.name}</TableCell>
                  <TableCell className="text-xs">{s.product_id.slice(0, 8)}</TableCell>
                  <TableCell>{s.end_date}</TableCell>
                  <TableCell><span className={dl <= 3 ? "text-destructive font-bold" : dl <= 7 ? "text-amber-600 font-medium" : ""}>{dl}d</span></TableCell>
                  <TableCell><StatusBadge status={s.status} /></TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => copy(`Hi ${s.clients?.name}, your subscription is expiring in ${dl} days. Would you like to renew?`, "Reminder")}>
                      <MessageSquare className="h-4 w-4 mr-1" /> Remind
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}</TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
