import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState, EmptyState } from "@/components/shared/PageStates";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Eye, Users } from "lucide-react";
import type { Client } from "@/types/database";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from("clients").select("*").eq("is_archived", false).order("created_at", { ascending: false }).then(({ data }) => {
      setClients(data || []);
      setLoading(false);
    });
  }, []);

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = c.name.toLowerCase().includes(q) || (c.whatsapp_number ?? "").toLowerCase().includes(q);
    const matchTag = tagFilter === "all" || c.trust_tag === tagFilter;
    return matchSearch && matchTag;
  });

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><Users className="h-6 w-6 text-primary" />Clients</h1>
        <p className="page-subtitle">{clients.length} active clients</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="search-premium relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 z-10" />
          <Input className="pl-10 bg-card/40 border-border/20 rounded-xl h-11" placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger className="w-40 bg-card/40 border-border/20 rounded-xl h-11"><SelectValue /></SelectTrigger>
          <SelectContent className="glass-strong rounded-xl border-border/30">
            <SelectItem value="all">All Tags</SelectItem>
            <SelectItem value="not_trusted">New Client</SelectItem>
            <SelectItem value="trusted">Trusted</SelectItem>
            <SelectItem value="super_client">Super Client</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? <EmptyState title="No clients found" /> : (
        <div className="premium-table">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20 hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Name</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">WhatsApp</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Trust</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/50">Since</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{filtered.map((c) => (
              <TableRow key={c.id} className="border-border/10 hover:bg-card/40 transition-colors cursor-pointer" onClick={() => navigate(`/clients/${c.id}`)}>
                <TableCell className="font-medium text-sm">{c.name}</TableCell>
                <TableCell className="mono text-xs text-muted-foreground">{c.whatsapp_number}</TableCell>
                <TableCell><StatusBadge status={c.trust_tag} /></TableCell>
                <TableCell className="text-xs text-muted-foreground/60">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" className="rounded-lg h-8 w-8 text-muted-foreground/40 hover:text-foreground" onClick={(e) => { e.stopPropagation(); navigate(`/clients/${c.id}`); }}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
