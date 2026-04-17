import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { CalendarIcon, MessageSquarePlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useAuth } from "@/hooks/useAuth";
import {
  upsertDeal, listOutreachForDeal, createOutreach,
  DEAL_TYPES, DEAL_STATUSES, PRIORITIES, OUTREACH_METHODS, OUTREACH_STATUSES,
  OUTREACH_STATUS_STYLE, labelFor,
  type VendorDeal, type Vendor, type VendorOutreach,
} from "@/lib/vendors";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  deal?: VendorDeal | null;
  vendors: Vendor[];
  staff: { user_id: string; full_name: string }[];
  research: { id: string; tool_name: string }[];
  prefillVendorId?: string;
  onSaved?: () => void;
}

export function DealDialog({ open, onOpenChange, deal, vendors, staff, research, prefillVendorId, onSaved }: Props) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("details");
  const [outreach, setOutreach] = useState<VendorOutreach[]>([]);
  const [loadingOutreach, setLoadingOutreach] = useState(false);

  const [form, setForm] = useState({
    vendor_id: "", title: "", description: "", deal_type: "coupon", discount_details: "",
    expected_cost: "", expected_selling_price: "", status: "new", priority: "medium",
    assigned_to: "_none", follow_up_date: undefined as Date | undefined, related_research_id: "_none", notes: "",
  });

  const [orForm, setOrForm] = useState({
    method: "email", message_summary: "", response_summary: "",
    next_follow_up_date: undefined as Date | undefined, status: "no_response",
  });

  useEffect(() => {
    if (open) {
      setTab("details");
      setForm({
        vendor_id: deal?.vendor_id ?? prefillVendorId ?? (vendors[0]?.id ?? ""),
        title: deal?.title ?? "",
        description: deal?.description ?? "",
        deal_type: deal?.deal_type ?? "coupon",
        discount_details: deal?.discount_details ?? "",
        expected_cost: deal?.expected_cost?.toString() ?? "",
        expected_selling_price: deal?.expected_selling_price?.toString() ?? "",
        status: deal?.status ?? "new",
        priority: deal?.priority ?? "medium",
        assigned_to: deal?.assigned_to ?? "_none",
        follow_up_date: deal?.follow_up_date ? new Date(deal.follow_up_date) : undefined,
        related_research_id: deal?.related_research_id ?? "_none",
        notes: deal?.notes ?? "",
      });
      if (deal?.id) loadOutreach(deal.id); else setOutreach([]);
    }
  }, [open, deal, prefillVendorId, vendors]);

  async function loadOutreach(id: string) {
    setLoadingOutreach(true);
    try { setOutreach(await listOutreachForDeal(id)); }
    finally { setLoadingOutreach(false); }
  }

  const margin = useMemo(() => {
    const c = parseFloat(form.expected_cost), s = parseFloat(form.expected_selling_price);
    if (isNaN(c) || isNaN(s)) return null;
    return s - c;
  }, [form.expected_cost, form.expected_selling_price]);

  async function handleSave() {
    if (!form.vendor_id) { toast.error("Pick a vendor"); return; }
    if (!form.title.trim()) { toast.error("Deal title is required"); return; }
    if (!user) return;
    setSaving(true);
    try {
      await upsertDeal({
        id: deal?.id,
        vendor_id: form.vendor_id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        deal_type: form.deal_type as any,
        discount_details: form.discount_details.trim() || null,
        expected_cost: form.expected_cost ? Number(form.expected_cost) : 0,
        expected_selling_price: form.expected_selling_price ? Number(form.expected_selling_price) : 0,
        status: form.status as any,
        priority: form.priority as any,
        assigned_to: form.assigned_to === "_none" ? null : form.assigned_to,
        follow_up_date: form.follow_up_date ? format(form.follow_up_date, "yyyy-MM-dd") : null,
        related_research_id: form.related_research_id === "_none" ? null : form.related_research_id,
        notes: form.notes.trim() || null,
        created_by: user.id,
      });
      toast.success(deal ? "Deal updated" : "Deal created");
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save deal");
    } finally { setSaving(false); }
  }

  async function handleAddOutreach() {
    if (!deal?.id) { toast.error("Save the deal first"); return; }
    setSaving(true);
    try {
      await createOutreach({
        deal_id: deal.id,
        vendor_id: deal.vendor_id,
        method: orForm.method as any,
        message_summary: orForm.message_summary.trim() || null,
        response_summary: orForm.response_summary.trim() || null,
        next_follow_up_date: orForm.next_follow_up_date ? format(orForm.next_follow_up_date, "yyyy-MM-dd") : null,
        status: orForm.status as any,
        logged_by: user?.id,
      });
      toast.success("Outreach logged");
      setOrForm({ method: "email", message_summary: "", response_summary: "", next_follow_up_date: undefined, status: "no_response" });
      await loadOutreach(deal.id);
      onSaved?.();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to log outreach");
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{deal ? "Edit Deal" : "New Deal"}</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="outreach" disabled={!deal?.id}>Outreach ({outreach.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vendor *</Label>
                <Select value={form.vendor_id} onValueChange={(v) => setForm({ ...form, vendor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pick vendor" /></SelectTrigger>
                  <SelectContent>{vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Deal type</Label>
                <Select value={form.deal_type} onValueChange={(v) => setForm({ ...form, deal_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DEAL_TYPES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="20% bulk discount on annual plans" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Description</Label>
                <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Discount details</Label>
                <Input value={form.discount_details} onChange={(e) => setForm({ ...form, discount_details: e.target.value })} placeholder="e.g. 20% off, $50 flat, 1 month free" />
              </div>
              <div className="space-y-2">
                <Label>Expected cost</Label>
                <Input type="number" value={form.expected_cost} onChange={(e) => setForm({ ...form, expected_cost: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Expected selling price</Label>
                <Input type="number" value={form.expected_selling_price} onChange={(e) => setForm({ ...form, expected_selling_price: e.target.value })} />
              </div>
              {margin != null && (
                <div className="col-span-2 text-sm text-muted-foreground">
                  Estimated margin: <span className={cn("font-medium", margin >= 0 ? "text-emerald-400" : "text-rose-400")}>{margin.toFixed(2)}</span>
                </div>
              )}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DEAL_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assigned to</Label>
                <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Unassigned</SelectItem>
                    {staff.map((s) => <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Follow-up date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.follow_up_date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.follow_up_date ? format(form.follow_up_date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.follow_up_date} onSelect={(d) => setForm({ ...form, follow_up_date: d })} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Linked research record</Label>
                <Select value={form.related_research_id} onValueChange={(v) => setForm({ ...form, related_research_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— None —</SelectItem>
                    {research.map((r) => <SelectItem key={r.id} value={r.id}>{r.tool_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Notes</Label>
                <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="outreach" className="space-y-4 pt-2">
            <div className="rounded-lg border border-border/40 p-4 space-y-3">
              <div className="text-sm font-medium flex items-center gap-2"><MessageSquarePlus className="h-4 w-4" /> Log new outreach</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select value={orForm.method} onValueChange={(v) => setOrForm({ ...orForm, method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{OUTREACH_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={orForm.status} onValueChange={(v) => setOrForm({ ...orForm, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{OUTREACH_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Message summary</Label>
                  <Textarea rows={2} value={orForm.message_summary} onChange={(e) => setOrForm({ ...orForm, message_summary: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Response summary</Label>
                  <Textarea rows={2} value={orForm.response_summary} onChange={(e) => setOrForm({ ...orForm, response_summary: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Next follow-up</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !orForm.next_follow_up_date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {orForm.next_follow_up_date ? format(orForm.next_follow_up_date, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={orForm.next_follow_up_date} onSelect={(d) => setOrForm({ ...orForm, next_follow_up_date: d })} initialFocus className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddOutreach} disabled={saving} className="w-full">Log outreach</Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">History</div>
              {loadingOutreach && <div className="text-sm text-muted-foreground">Loading…</div>}
              {!loadingOutreach && outreach.length === 0 && <div className="text-sm text-muted-foreground">No outreach logged yet.</div>}
              {outreach.map((o) => (
                <div key={o.id} className="rounded-md border border-border/40 p-3 text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[11px]">{labelFor(OUTREACH_METHODS, o.method)}</Badge>
                      <Badge variant="outline" className={cn("text-[11px]", OUTREACH_STATUS_STYLE[o.status])}>{labelFor(OUTREACH_STATUSES, o.status)}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{format(new Date(o.contact_date), "MMM d, yyyy")}</div>
                  </div>
                  {o.message_summary && <div><span className="text-muted-foreground">Sent:</span> {o.message_summary}</div>}
                  {o.response_summary && <div><span className="text-muted-foreground">Reply:</span> {o.response_summary}</div>}
                  {o.next_follow_up_date && <div className="text-xs text-amber-400">Next follow-up: {format(new Date(o.next_follow_up_date), "MMM d, yyyy")}</div>}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Close</Button>
          {tab === "details" && <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : deal ? "Save changes" : "Create deal"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
