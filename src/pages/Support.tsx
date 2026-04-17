import { useEffect, useMemo, useState } from "react";
import { LifeBuoy, Plus, Search, Loader2, Ticket as TicketIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { TicketDialog } from "@/components/support/TicketDialog";
import {
  ISSUE_TYPES, TICKET_STATUSES, TICKET_PRIORITIES,
  STATUS_STYLE, PRIORITY_STYLE, labelFor,
  type TicketRow, type IssueType, type TicketPriority, type TicketStatus,
} from "@/lib/support-tickets";
import { cn } from "@/lib/utils";

interface Row extends TicketRow {
  client_name?: string | null;
  agent_name?: string | null;
  order_number?: string | null;
}

export default function SupportPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState<string>("all");
  const [priorityF, setPriorityF] = useState<string>("all");
  const [typeF, setTypeF] = useState<string>("all");
  const [agentF, setAgentF] = useState<string>("all");
  const [orderF, setOrderF] = useState<string>("all"); // all | with | without

  const load = async () => {
    setLoading(true);
    const { data: tickets } = await (supabase as any)
      .from("support_issues").select("*")
      .order("created_at", { ascending: false }).limit(200);
    const list = (tickets as TicketRow[]) || [];

    const clientIds = [...new Set(list.map((t) => t.client_id).filter(Boolean) as string[])];
    const agentIds = [...new Set(list.map((t) => t.assigned_to).filter(Boolean) as string[])];
    const orderIds = [...new Set(list.map((t) => t.order_id).filter(Boolean) as string[])];

    const [clientsRes, agentsRes, ordersRes] = await Promise.all([
      clientIds.length ? supabase.from("clients").select("id, name").in("id", clientIds) : Promise.resolve({ data: [] as any[] }),
      agentIds.length ? supabase.from("staff_profiles").select("user_id, full_name").in("user_id", agentIds) : Promise.resolve({ data: [] as any[] }),
      orderIds.length ? (supabase as any).from("orders").select("id, order_number").in("id", orderIds) : Promise.resolve({ data: [] as any[] }),
    ]);

    const clientMap = new Map((clientsRes.data || []).map((c: any) => [c.id, c.name]));
    const agentMap = new Map((agentsRes.data || []).map((a: any) => [a.user_id, a.full_name]));
    const orderMap = new Map<string, string>((ordersRes.data || []).map((o: any) => [o.id as string, (o.order_number ?? "") as string]));

    setRows(list.map<Row>((t) => ({
      ...t,
      client_name: t.client_id ? (clientMap.get(t.client_id) as string | undefined) ?? null : null,
      agent_name: t.assigned_to ? (agentMap.get(t.assigned_to) as string | undefined) ?? null : null,
      order_number: t.order_id ? (orderMap.get(t.order_id) ?? null) : null,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const agents = useMemo(() => {
    const set = new Map<string, string>();
    rows.forEach((r) => { if (r.assigned_to && r.agent_name) set.set(r.assigned_to, r.agent_name); });
    return [...set.entries()].map(([id, name]) => ({ id, name }));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusF !== "all" && r.status !== statusF) return false;
      if (priorityF !== "all" && r.priority !== priorityF) return false;
      if (typeF !== "all" && r.issue_type_v2 !== typeF) return false;
      if (agentF !== "all" && r.assigned_to !== agentF) return false;
      if (orderF === "with" && !r.order_id) return false;
      if (orderF === "without" && r.order_id) return false;
      if (q) {
        const hay = `${r.ticket_number ?? ""} ${r.summary ?? ""} ${r.description ?? ""} ${r.client_name ?? ""} ${r.order_number ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, statusF, priorityF, typeF, agentF, orderF]);

  return (
    <div>
      <PageHeader
        title="Support Tickets"
        description="Customer issues, complaints and resolutions"
        icon={<LifeBuoy className="h-5 w-5 text-white" />}
        actions={
          <Button className="rounded-xl gradient-primary text-white shadow-lg" onClick={() => { setEditingId(null); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1.5" /> New Ticket
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tickets..." className="pl-8 h-9" />
        </div>
        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {TICKET_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityF} onValueChange={setPriorityF}>
          <SelectTrigger className="h-9 w-[120px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {TICKET_PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeF} onValueChange={setTypeF}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {ISSUE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={agentF} onValueChange={setAgentF}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Agent" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All agents</SelectItem>
            {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={orderF} onValueChange={setOrderF}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Order: any</SelectItem>
            <SelectItem value="with">With order</SelectItem>
            <SelectItem value="without">Without order</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 bg-muted/20">
                {["Ticket", "Customer", "Issue Type", "Order", "Agent", "Priority", "Status", "Created"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] uppercase tracking-[0.12em] font-semibold text-muted-foreground/70">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading...
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  <TicketIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No tickets match your filters.
                </td></tr>
              ) : filtered.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border/20 hover:bg-muted/15 transition-colors cursor-pointer"
                  onClick={() => { setEditingId(r.id); setOpen(true); }}
                >
                  <td className="px-4 py-3 font-mono text-xs text-foreground/90">{r.ticket_number ?? r.id.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground/90">{r.client_name ?? "—"}</div>
                    {r.summary && <div className="text-[11px] text-muted-foreground truncate max-w-[260px]">{r.summary}</div>}
                  </td>
                  <td className="px-4 py-3 text-foreground/85">{labelFor(ISSUE_TYPES, r.issue_type_v2)}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{r.order_number ?? "—"}</td>
                  <td className="px-4 py-3 text-foreground/85">{r.agent_name ?? <span className="text-muted-foreground/50">Unassigned</span>}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={cn("text-[10px] capitalize", PRIORITY_STYLE[r.priority])}>{r.priority}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={cn("text-[10px] capitalize", STATUS_STYLE[r.status as TicketStatus])}>
                      {labelFor(TICKET_STATUSES, r.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <TicketDialog
        open={open}
        onOpenChange={setOpen}
        ticketId={editingId}
        onSaved={() => load()}
      />
    </div>
  );
}
