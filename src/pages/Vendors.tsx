import { useEffect, useMemo, useState } from "react";
import { format, isThisMonth } from "date-fns";
import { Handshake, Plus, Search, Building2, TrendingUp, AlertTriangle, CheckCircle2, Flame } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VendorDialog } from "@/components/vendors/VendorDialog";
import { DealDialog } from "@/components/vendors/DealDialog";
import {
  listVendors, listDeals, listStaff, listResearchOptions,
  VENDOR_STATUSES, VENDOR_SOURCES, DEAL_TYPES, DEAL_STATUSES, PRIORITIES,
  VENDOR_STATUS_STYLE, DEAL_STATUS_STYLE, PRIORITY_STYLE,
  labelFor, isOverdue, isDueToday,
  type Vendor, type VendorDeal,
} from "@/lib/vendors";
import { cn } from "@/lib/utils";

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [deals, setDeals] = useState<VendorDeal[]>([]);
  const [staff, setStaff] = useState<{ user_id: string; full_name: string }[]>([]);
  const [research, setResearch] = useState<{ id: string; tool_name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [vendorOpen, setVendorOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [dealOpen, setDealOpen] = useState(false);
  const [editDeal, setEditDeal] = useState<VendorDeal | null>(null);
  const [prefillVendorId, setPrefillVendorId] = useState<string | undefined>();

  const [search, setSearch] = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [fType, setFType] = useState("all");
  const [fPriority, setFPriority] = useState("all");
  const [fVendor, setFVendor] = useState("all");
  const [fAssigned, setFAssigned] = useState("all");

  async function load() {
    setLoading(true);
    try {
      const [v, d, s, r] = await Promise.all([listVendors(), listDeals(), listStaff(), listResearchOptions()]);
      setVendors(v); setDeals(d); setStaff(s); setResearch(r);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const vendorMap = useMemo(() => Object.fromEntries(vendors.map((v) => [v.id, v])), [vendors]);
  const staffMap = useMemo(() => Object.fromEntries(staff.map((s) => [s.user_id, s.full_name])), [staff]);

  const filteredDeals = useMemo(() => deals.filter((d) => {
    if (fStatus !== "all" && d.status !== fStatus) return false;
    if (fType !== "all" && d.deal_type !== fType) return false;
    if (fPriority !== "all" && d.priority !== fPriority) return false;
    if (fVendor !== "all" && d.vendor_id !== fVendor) return false;
    if (fAssigned !== "all") {
      if (fAssigned === "unassigned" ? d.assigned_to !== null : d.assigned_to !== fAssigned) return false;
    }
    if (search) {
      const v = vendorMap[d.vendor_id];
      const hay = `${d.title} ${d.description ?? ""} ${v?.name ?? ""}`.toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  }), [deals, fStatus, fType, fPriority, fVendor, fAssigned, search, vendorMap]);

  const filteredVendors = useMemo(() => vendors.filter((v) => {
    if (search && !`${v.name} ${v.category ?? ""} ${v.contact_name ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [vendors, search]);

  const dealsPerVendor = useMemo(() => {
    const m: Record<string, number> = {};
    for (const d of deals) m[d.vendor_id] = (m[d.vendor_id] ?? 0) + 1;
    return m;
  }, [deals]);

  const stats = {
    activeDeals: deals.filter((d) => ["new", "contacted", "in_negotiation", "active", "negotiation", "agreed"].includes(d.status)).length,
    inNegotiation: deals.filter((d) => ["in_negotiation", "negotiation"].includes(d.status)).length,
    dueToday: deals.filter((d) => isDueToday(d.follow_up_date)).length,
    overdue: deals.filter((d) => isOverdue(d.follow_up_date) && !["agreed", "rejected", "expired"].includes(d.status)).length,
    highPriority: deals.filter((d) => (d.priority === "high" || d.priority === "urgent") && !["agreed", "rejected", "expired"].includes(d.status)).length,
    agreedThisMonth: deals.filter((d) => d.status === "agreed" && isThisMonth(new Date(d.updated_at))).length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendors & Deals"
        description="Sourcing pipeline for vendors, coupons, and partnership deals."
        icon={<Handshake className="h-5 w-5 text-primary-foreground" />}
        actions={
          <>
            <Button variant="outline" onClick={() => { setEditVendor(null); setVendorOpen(true); }}>
              <Building2 className="mr-2 h-4 w-4" /> New vendor
            </Button>
            <Button onClick={() => { setEditDeal(null); setPrefillVendorId(undefined); setDealOpen(true); }} disabled={vendors.length === 0}>
              <Plus className="mr-2 h-4 w-4" /> New deal
            </Button>
          </>
        }
      />

      {/* Stat widgets */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">
        <StatPill icon={TrendingUp} label="Active deals" value={stats.activeDeals} tone="primary" />
        <StatPill icon={Flame} label="In negotiation" value={stats.inNegotiation} tone="amber" />
        <StatPill icon={AlertTriangle} label="Due today" value={stats.dueToday} tone="amber" />
        <StatPill icon={AlertTriangle} label="Overdue" value={stats.overdue} tone="rose" />
        <StatPill icon={Flame} label="High priority" value={stats.highPriority} tone="rose" />
        <StatPill icon={CheckCircle2} label="Agreed this month" value={stats.agreedThisMonth} tone="emerald" />
      </div>

      <Tabs defaultValue="deals">
        <TabsList>
          <TabsTrigger value="deals">Deals ({deals.length})</TabsTrigger>
          <TabsTrigger value="vendors">Vendors ({vendors.length})</TabsTrigger>
        </TabsList>

        {/* Deals tab */}
        <TabsContent value="deals" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search deals or vendors…" className="pl-9" />
            </div>
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {DEAL_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fType} onValueChange={setFType}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {DEAL_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fPriority} onValueChange={setFPriority}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fVendor} onValueChange={setFVendor}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Vendor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All vendors</SelectItem>
                {vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fAssigned} onValueChange={setFAssigned}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Assigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All assignees</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {staff.map((s) => <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-border/40 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Follow-up</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>}
                {!loading && filteredDeals.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No deals found.</TableCell></TableRow>}
                {filteredDeals.map((d) => {
                  const v = vendorMap[d.vendor_id];
                  const overdue = isOverdue(d.follow_up_date) && !["agreed", "rejected", "expired"].includes(d.status);
                  const today = isDueToday(d.follow_up_date);
                  return (
                    <TableRow key={d.id} className="cursor-pointer" onClick={() => { setEditDeal(d); setDealOpen(true); }}>
                      <TableCell><div className="font-medium text-foreground">{d.title}</div>{d.discount_details && <div className="text-xs text-muted-foreground">{d.discount_details}</div>}</TableCell>
                      <TableCell className="text-sm">{v?.name ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[11px]">{labelFor(DEAL_TYPES, d.deal_type)}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className={cn("text-[11px]", DEAL_STATUS_STYLE[d.status])}>{labelFor(DEAL_STATUSES, d.status as any) || d.status}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className={cn("text-[11px]", PRIORITY_STYLE[d.priority])}>{labelFor(PRIORITIES, d.priority)}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{d.assigned_to ? staffMap[d.assigned_to] ?? "—" : <span className="text-xs">Unassigned</span>}</TableCell>
                      <TableCell>
                        {d.follow_up_date ? (
                          <span className={cn("text-xs", overdue && "text-rose-400 font-medium", today && !overdue && "text-amber-400 font-medium")}>
                            {format(new Date(d.follow_up_date), "MMM d")}
                            {overdue && " (overdue)"}
                            {today && !overdue && " (today)"}
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right text-sm">{d.estimated_margin != null && d.estimated_margin !== 0 ? <span className={cn("font-medium", d.estimated_margin >= 0 ? "text-emerald-400" : "text-rose-400")}>{d.estimated_margin.toFixed(0)}</span> : "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Vendors tab */}
        <TabsContent value="vendors" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendors…" className="pl-9" />
            </div>
          </div>

          <div className="rounded-lg border border-border/40 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Deals</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>}
                {!loading && filteredVendors.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No vendors yet. Click "New vendor" to add one.</TableCell></TableRow>}
                {filteredVendors.map((v) => (
                  <TableRow key={v.id} className="cursor-pointer" onClick={() => { setEditVendor(v); setVendorOpen(true); }}>
                    <TableCell>
                      <div className="font-medium text-foreground">{v.name}</div>
                      {v.website && <div className="text-xs text-muted-foreground truncate max-w-[220px]">{v.website}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{v.category ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[11px]">{labelFor(VENDOR_SOURCES, v.source_type)}</Badge></TableCell>
                    <TableCell className="text-sm">
                      {v.contact_name ?? "—"}
                      {v.contact_email && <div className="text-xs text-muted-foreground">{v.contact_email}</div>}
                    </TableCell>
                    <TableCell><Badge variant="outline" className={cn("text-[11px]", VENDOR_STATUS_STYLE[v.status])}>{labelFor(VENDOR_STATUSES, v.status)}</Badge></TableCell>
                    <TableCell className="text-right text-sm">{dealsPerVendor[v.id] ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditDeal(null); setPrefillVendorId(v.id); setDealOpen(true); }}>+ Deal</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <VendorDialog open={vendorOpen} onOpenChange={setVendorOpen} vendor={editVendor} onSaved={load} />
      <DealDialog open={dealOpen} onOpenChange={setDealOpen} deal={editDeal} vendors={vendors} staff={staff} research={research} prefillVendorId={prefillVendorId} onSaved={load} />
    </div>
  );
}

function StatPill({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: "primary" | "amber" | "rose" | "emerald" }) {
  const toneClass = {
    primary: "text-primary bg-primary/10",
    amber: "text-amber-400 bg-amber-500/10",
    rose: "text-rose-400 bg-rose-500/10",
    emerald: "text-emerald-400 bg-emerald-500/10",
  }[tone];
  return (
    <div className="rounded-lg border border-border/40 p-3 flex items-center gap-3">
      <div className={cn("h-9 w-9 rounded-md flex items-center justify-center", toneClass)}><Icon className="h-4 w-4" /></div>
      <div className="min-w-0">
        <div className="text-xl font-semibold leading-tight">{value}</div>
        <div className="text-xs text-muted-foreground truncate">{label}</div>
      </div>
    </div>
  );
}
