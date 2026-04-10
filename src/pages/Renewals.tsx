import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LoadingState, EmptyState } from "@/components/shared/PageStates";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClipboard } from "@/hooks/useClipboard";
import { RefreshCw, MessageSquare, AlertTriangle } from "lucide-react";
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

  const expiring = subs.filter(s => s.status === "expiring").length;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <h1 className="page-title flex items-center gap-2"><RefreshCw className="h-6 w-6 text-primary" />Renewals</h1>
          {expiring > 0 && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />{expiring} expiring
            </span>
          )}
        </div>
        <p className="page-subtitle">{subs.length} active & expiring subscriptions</p>
      </div>
      {subs.length === 0 ? <EmptyState title="No active subscriptions" /> : (
        <div className="premium-table">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20 hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Client</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Product</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">End Date</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Days Left</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{subs.map((s) => {
              const dl = daysLeft(s.end_date);
              return (
                <TableRow key={s.id} className="border-border/10 hover:bg-card/40 transition-colors">
                  <TableCell className="font-medium text-sm">{s.clients?.name}</TableCell>
                  <TableCell className="mono text-xs text-muted-foreground">{s.product_id.slice(0, 8)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.end_date}</TableCell>
                  <TableCell>
                    <span className={`mono text-sm font-bold ${dl <= 3 ? 'text-red-400' : dl <= 7 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {dl}d
                    </span>
                  </TableCell>
                  <TableCell><StatusBadge status={s.status} /></TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" className="rounded-lg text-xs border-border/20 bg-card/40 hover:bg-card/60 h-8" onClick={() => copy(`Hi ${s.clients?.name}, your subscription is expiring in ${dl} days. Would you like to renew?`, "Reminder")}>
                      <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Remind
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}</TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
