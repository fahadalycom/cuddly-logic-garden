import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingState, EmptyState } from "@/components/shared/PageStates";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
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
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Audit Logs</h1>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Filter logs..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      {filtered.length === 0 ? <EmptyState title="No audit logs" /> : (
        <Card><Table><TableHeader><TableRow><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
          <TableBody>{filtered.map((l) => (<TableRow key={l.id}><TableCell>{l.action}</TableCell><TableCell>{l.entity_type}</TableCell><TableCell className="text-xs">{new Date(l.created_at).toLocaleString()}</TableCell></TableRow>))}</TableBody>
        </Table></Card>
      )}
    </div>
  );
}
