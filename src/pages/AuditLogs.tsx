import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { LoadingState, EmptyState } from "@/components/shared/PageStates";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, FileText, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AuditLog } from "@/types/database";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200).then(({ data }) => { setLogs(data || []); setLoading(false); });
  }, []);

  const filtered = logs.filter((l) => l.action.toLowerCase().includes(search.toLowerCase()) || l.entity_type.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><Activity className="h-6 w-6 text-primary" />Audit Logs</h1>
        <p className="page-subtitle">{logs.length} recent events tracked</p>
      </div>
      <div className="search-premium relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 z-10" />
        <Input className="pl-10 bg-card/40 border-border/20 rounded-xl h-11" placeholder="Filter logs..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {filtered.length === 0 ? <EmptyState title="No audit logs" description="System activities will be logged here." /> : (
        <div className="premium-table">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20 hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Action</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Entity</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{filtered.map((l) => (
              <TableRow key={l.id} className="border-border/10 hover:bg-card/40 transition-colors">
                <TableCell className="font-medium text-sm">{l.action}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] bg-secondary/30 text-muted-foreground border-border/20 rounded-lg font-medium">{l.entity_type}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground/60 mono">{new Date(l.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
