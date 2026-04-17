import { useEffect, useMemo, useState } from "react";
import { FlaskConical, Plus, Search, Lightbulb, TrendingUp, CheckCircle2, XCircle, Rocket } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DemandRequestDialog } from "@/components/research/DemandRequestDialog";
import { ResearchRecordDialog } from "@/components/research/ResearchRecordDialog";
import {
  listToolRequests, listResearchRecords, listStaff,
  REQUEST_STATUSES, REQUEST_SOURCES, PRIORITIES, RESEARCH_STATUSES, RECOMMENDATIONS,
  REQUEST_STATUS_STYLE, PRIORITY_STYLE, RESEARCH_STATUS_STYLE, RECOMMENDATION_STYLE,
  labelFor, avgScore,
  type ToolRequest, type ResearchRecord,
} from "@/lib/research";
import { cn } from "@/lib/utils";

export default function ResearchPage() {
  const [requests, setRequests] = useState<ToolRequest[]>([]);
  const [records, setRecords] = useState<ResearchRecord[]>([]);
  const [staff, setStaff] = useState<{ user_id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [demandOpen, setDemandOpen] = useState(false);
  const [editRequest, setEditRequest] = useState<ToolRequest | null>(null);
  const [researchOpen, setResearchOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<ResearchRecord | null>(null);
  const [researchPrefill, setResearchPrefill] = useState<{ tool_name?: string; category?: string | null; related_request_id?: string | null } | undefined>();

  // Filters
  const [search, setSearch] = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [fPriority, setFPriority] = useState("all");
  const [fSource, setFSource] = useState("all");
  const [fResearchStatus, setFResearchStatus] = useState("all");
  const [fRec, setFRec] = useState("all");
  const [fAssigned, setFAssigned] = useState("all");

  async function load() {
    setLoading(true);
    try {
      const [r, rec, s] = await Promise.all([listToolRequests(), listResearchRecords(), listStaff()]);
      setRequests(r); setRecords(rec); setStaff(s);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const staffMap = useMemo(() => Object.fromEntries(staff.map((s) => [s.user_id, s.full_name])), [staff]);

  const filteredRequests = useMemo(() => requests.filter((r) => {
    if (fStatus !== "all" && r.status !== fStatus) return false;
    if (fPriority !== "all" && r.priority !== fPriority) return false;
    if (fSource !== "all" && r.source !== fSource) return false;
    if (search && !r.tool_name.toLowerCase().includes(search.toLowerCase())
      && !(r.category ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [requests, fStatus, fPriority, fSource, search]);

  const filteredRecords = useMemo(() => records.filter((r) => {
    if (fResearchStatus !== "all" && r.status !== fResearchStatus) return false;
    if (fRec !== "all" && r.recommendation !== fRec) return false;
    if (fAssigned !== "all") {
      if (fAssigned === "unassigned" ? r.assigned_to !== null : r.assigned_to !== fAssigned) return false;
    }
    if (search && !r.tool_name.toLowerCase().includes(search.toLowerCase())
      && !(r.category ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [records, fResearchStatus, fRec, fAssigned, search]);

  // Stats
  const topRequested = useMemo(() => [...requests].sort((a, b) => b.demand_count - a.demand_count).slice(0, 5), [requests]);
  const stats = {
    totalDemand: requests.reduce((s, r) => s + r.demand_count, 0),
    inResearch: records.filter((r) => r.status === "in_progress").length,
    approved: records.filter((r) => r.recommendation === "approve").length,
    rejected: records.filter((r) => r.recommendation === "reject").length,
    readyForLaunch: records.filter((r) => r.recommendation === "approve" || r.recommendation === "test_first").length,
  };

  return (
    <div>
      <PageHeader
        title="Research & Demand"
        description="Track customer demand and run structured research on new tools"
        icon={<FlaskConical className="h-5 w-5 text-white" />}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setEditRecord(null); setResearchPrefill(undefined); setResearchOpen(true); }}>
              <FlaskConical className="h-3.5 w-3.5 mr-1.5" /> New research
            </Button>
            <Button onClick={() => { setEditRequest(null); setDemandOpen(true); }} className="gradient-primary text-white">
              <Plus className="h-4 w-4 mr-1.5" /> Log demand
            </Button>
          </div>
        }
      />

      {/* Dashboard widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-4">
        <StatPill label="Total Demand" value={stats.totalDemand} icon={<TrendingUp className="h-3.5 w-3.5" />} />
        <StatPill label="Researching" value={stats.inResearch} icon={<FlaskConical className="h-3.5 w-3.5" />} accent="amber" />
        <StatPill label="Approved" value={stats.approved} icon={<CheckCircle2 className="h-3.5 w-3.5" />} accent="emerald" />
        <StatPill label="Ready to Launch" value={stats.readyForLaunch} icon={<Rocket className="h-3.5 w-3.5" />} accent="emerald" />
        <StatPill label="Rejected" value={stats.rejected} icon={<XCircle className="h-3.5 w-3.5" />} accent="rose" />
      </div>

      {/* Most-requested tools */}
      {topRequested.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-card/40 p-3 mb-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Lightbulb className="h-3 w-3" /> Most requested tools
          </p>
          <div className="flex flex-wrap gap-2">
            {topRequested.map((r) => (
              <button
                key={r.id}
                onClick={() => { setEditRequest(r); setDemandOpen(true); }}
                className="group flex items-center gap-2 rounded-lg border border-border/40 bg-background/50 px-2.5 py-1.5 text-xs hover:border-primary/40 transition-colors"
              >
                <span className="font-medium text-foreground">{r.tool_name}</span>
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">×{r.demand_count}</Badge>
              </button>
            ))}
          </div>
        </div>
      )}

      <Tabs defaultValue="requests" className="w-full">
        <TabsList>
          <TabsTrigger value="requests">Demand Requests ({requests.length})</TabsTrigger>
          <TabsTrigger value="research">Research Records ({records.length})</TabsTrigger>
        </TabsList>

        {/* DEMAND REQUESTS */}
        <TabsContent value="requests" className="mt-3 space-y-3">
          <div className="rounded-xl border border-border/40 bg-card/40 p-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8 h-9" placeholder="Search by tool or category…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <FilterSelect value={fStatus} onChange={setFStatus} placeholder="Status">
                {REQUEST_STATUSES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </FilterSelect>
              <FilterSelect value={fPriority} onChange={setFPriority} placeholder="Priority">
                {PRIORITIES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </FilterSelect>
              <FilterSelect value={fSource} onChange={setFSource} placeholder="Source">
                {REQUEST_SOURCES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </FilterSelect>
            </div>
          </div>

          <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tool</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Demand</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && <TableRow><TableCell colSpan={7} className="text-center py-6 text-sm text-muted-foreground">Loading…</TableCell></TableRow>}
                {!loading && filteredRequests.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">No demand requests yet</TableCell></TableRow>}
                {filteredRequests.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => { setEditRequest(r); setDemandOpen(true); }}>
                    <TableCell>
                      <p className="font-medium text-sm text-foreground">{r.tool_name}</p>
                      {r.requested_by_name && <p className="text-[11px] text-muted-foreground">by {r.requested_by_name}</p>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.category ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] border-primary/30 text-primary">×{r.demand_count}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground capitalize">{r.source}</TableCell>
                    <TableCell><Badge variant="outline" className={cn("text-[10px]", PRIORITY_STYLE[r.priority])}>{r.priority}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={cn("text-[10px]", REQUEST_STATUS_STYLE[r.status])}>{labelFor(REQUEST_STATUSES, r.status)}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(r.created_at), "MMM d")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* RESEARCH RECORDS */}
        <TabsContent value="research" className="mt-3 space-y-3">
          <div className="rounded-xl border border-border/40 bg-card/40 p-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8 h-9" placeholder="Search by tool or category…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <FilterSelect value={fResearchStatus} onChange={setFResearchStatus} placeholder="Status">
                {RESEARCH_STATUSES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </FilterSelect>
              <FilterSelect value={fRec} onChange={setFRec} placeholder="Recommendation">
                {RECOMMENDATIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </FilterSelect>
              <FilterSelect value={fAssigned} onChange={setFAssigned} placeholder="Researcher">
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {staff.map((s) => <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>)}
              </FilterSelect>
            </div>
          </div>

          <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tool</TableHead>
                  <TableHead>Researcher</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Recommendation</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && <TableRow><TableCell colSpan={6} className="text-center py-6 text-sm text-muted-foreground">Loading…</TableCell></TableRow>}
                {!loading && filteredRecords.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">No research records yet</TableCell></TableRow>}
                {filteredRecords.map((r) => {
                  const score = avgScore(r);
                  return (
                    <TableRow key={r.id} className="cursor-pointer" onClick={() => { setEditRecord(r); setResearchPrefill(undefined); setResearchOpen(true); }}>
                      <TableCell>
                        <p className="font-medium text-sm text-foreground">{r.tool_name}</p>
                        {r.category && <p className="text-[11px] text-muted-foreground">{r.category}</p>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.assigned_to ? (staffMap[r.assigned_to] ?? r.assigned_to.slice(0, 8)) : <span className="italic">Unassigned</span>}
                      </TableCell>
                      <TableCell><Badge variant="outline" className={cn("text-[10px]", RESEARCH_STATUS_STYLE[r.status])}>{labelFor(RESEARCH_STATUSES, r.status)}</Badge></TableCell>
                      <TableCell>
                        {score != null
                          ? <span className={cn("text-xs font-semibold tabular-nums", score >= 7 ? "text-emerald-400" : score >= 4 ? "text-amber-400" : "text-rose-400")}>{score}/10</span>
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell><Badge variant="outline" className={cn("text-[10px]", RECOMMENDATION_STYLE[r.recommendation])}>{labelFor(RECOMMENDATIONS, r.recommendation)}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(r.updated_at), "MMM d")}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <DemandRequestDialog
        open={demandOpen}
        onOpenChange={(o) => { setDemandOpen(o); if (!o) load(); }}
        request={editRequest}
        onResearchCreated={load}
      />
      <ResearchRecordDialog
        open={researchOpen}
        onOpenChange={(o) => { setResearchOpen(o); if (!o) load(); }}
        record={editRecord}
        prefill={researchPrefill}
      />
    </div>
  );
}

function StatPill({ label, value, icon, accent }: { label: string; value: number; icon?: React.ReactNode; accent?: "emerald" | "rose" | "amber" }) {
  const color = accent === "emerald" ? "text-emerald-400" : accent === "rose" ? "text-rose-400" : accent === "amber" ? "text-amber-400" : "text-foreground";
  return (
    <div className="rounded-xl border border-border/40 bg-card/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">{icon}{label}</p>
      <p className={cn("text-lg font-bold", color)}>{value}</p>
    </div>
  );
}

function FilterSelect({ value, onChange, placeholder, children }: { value: string; onChange: (v: string) => void; placeholder: string; children: React.ReactNode }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {placeholder}</SelectItem>
        {children}
      </SelectContent>
    </Select>
  );
}
