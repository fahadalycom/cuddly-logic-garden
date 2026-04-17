import { useEffect, useMemo, useState } from "react";
import { Loader2, FlaskConical, Gauge } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  upsertResearch, listToolRequests, listStaff,
  RESEARCH_STATUSES, RECOMMENDATIONS, RESEARCH_STATUS_STYLE, RECOMMENDATION_STYLE,
  type ResearchRecord, type ResearchStatus, type Recommendation, type ToolRequest,
  labelFor, avgScore,
} from "@/lib/research";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  record?: ResearchRecord | null;
  prefill?: { tool_name?: string; category?: string | null; related_request_id?: string | null };
  onSaved?: () => void;
}

export function ResearchRecordDialog({ open, onOpenChange, record, prefill, onSaved }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [requests, setRequests] = useState<ToolRequest[]>([]);
  const [agents, setAgents] = useState<{ user_id: string; full_name: string }[]>([]);
  const isEdit = !!record;

  const [toolName, setToolName] = useState("");
  const [category, setCategory] = useState("");
  const [relatedRequestId, setRelatedRequestId] = useState<string>("__none__");
  const [assignedTo, setAssignedTo] = useState<string>("__unassigned__");
  const [status, setStatus] = useState<ResearchStatus>("not_started");
  const [recommendation, setRecommendation] = useState<Recommendation>("undecided");
  const [feasibility, setFeasibility] = useState<number>(5);
  const [demand, setDemand] = useState<number>(5);
  const [supportComplexity, setSupportComplexity] = useState<number>(5);
  const [risk, setRisk] = useState<number>(5);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [r, s] = await Promise.all([listToolRequests(), listStaff()]);
      setRequests(r);
      setAgents(s);
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (record) {
      setToolName(record.tool_name);
      setCategory(record.category ?? "");
      setRelatedRequestId(record.related_request_id ?? "__none__");
      setAssignedTo(record.assigned_to ?? "__unassigned__");
      setStatus(record.status);
      setRecommendation(record.recommendation);
      setFeasibility(record.feasibility_score ?? 5);
      setDemand(record.demand_score ?? 5);
      setSupportComplexity(record.support_complexity_score ?? 5);
      setRisk(record.risk_score ?? 5);
      setNotes(record.notes ?? "");
    } else {
      setToolName(prefill?.tool_name ?? "");
      setCategory(prefill?.category ?? "");
      setRelatedRequestId(prefill?.related_request_id ?? "__none__");
      setAssignedTo("__unassigned__");
      setStatus("not_started"); setRecommendation("undecided");
      setFeasibility(5); setDemand(5); setSupportComplexity(5); setRisk(5);
      setNotes("");
    }
  }, [open, record, prefill]);

  const liveAvg = useMemo(() => avgScore({
    feasibility_score: feasibility, demand_score: demand,
    support_complexity_score: supportComplexity, risk_score: risk,
  } as ResearchRecord), [feasibility, demand, supportComplexity, risk]);

  const handleSave = async () => {
    if (!toolName.trim()) { toast({ title: "Tool name required", variant: "destructive" }); return; }
    if (!user) { toast({ title: "Not signed in", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await upsertResearch({
        id: record?.id,
        tool_name: toolName.trim(),
        category: category.trim() || null,
        related_request_id: relatedRequestId === "__none__" ? null : relatedRequestId,
        assigned_to: assignedTo === "__unassigned__" ? null : assignedTo,
        status, recommendation,
        feasibility_score: feasibility,
        demand_score: demand,
        support_complexity_score: supportComplexity,
        risk_score: risk,
        notes: notes.trim() || null,
        created_by: user.id,
      });
      toast({ title: isEdit ? "Research updated" : "Research record created" });
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="h-4 w-4 text-primary" />
            {isEdit ? `Research: ${record?.tool_name}` : "New research record"}
            {isEdit && (
              <>
                <Badge variant="outline" className={cn("ml-1 text-[10px]", RESEARCH_STATUS_STYLE[status])}>
                  {labelFor(RESEARCH_STATUSES, status)}
                </Badge>
                <Badge variant="outline" className={cn("text-[10px]", RECOMMENDATION_STYLE[recommendation])}>
                  {labelFor(RECOMMENDATIONS, recommendation)}
                </Badge>
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Score, evaluate and decide whether to add this tool to the catalog.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Tool Name *">
              <Input value={toolName} onChange={(e) => setToolName(e.target.value)} />
            </Field>
            <Field label="Category">
              <Input value={category} onChange={(e) => setCategory(e.target.value)} />
            </Field>
            <Field label="Related Demand Request">
              <Select value={relatedRequestId} onValueChange={setRelatedRequestId}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— No linked request —</SelectItem>
                  {requests.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.tool_name} · demand {r.demand_count}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Assigned Researcher">
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unassigned__">Unassigned</SelectItem>
                  {agents.map((a) => <SelectItem key={a.user_id} value={a.user_id}>{a.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={status} onValueChange={(v) => setStatus(v as ResearchStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RESEARCH_STATUSES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Recommendation">
              <Select value={recommendation} onValueChange={(v) => setRecommendation(v as Recommendation)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RECOMMENDATIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>

          <div className="rounded-xl border border-border/40 bg-card/40 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1.5"><Gauge className="h-3.5 w-3.5" /> Evaluation Scores (0–10)</Label>
              {liveAvg != null && (
                <Badge variant="outline" className="text-[10px]">Composite · {liveAvg}/10</Badge>
              )}
            </div>
            <ScoreInput label="Feasibility" hint="how realistic to source/operate" value={feasibility} setValue={setFeasibility} positive />
            <ScoreInput label="Demand" hint="customer interest level" value={demand} setValue={setDemand} positive />
            <ScoreInput label="Support Complexity" hint="lower is better" value={supportComplexity} setValue={setSupportComplexity} />
            <ScoreInput label="Risk" hint="account/policy risk — lower is better" value={risk} setValue={setRisk} />
          </div>

          <Field label="Research Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Findings, vendor info, pricing, sharing constraints, decision rationale…" rows={4} />
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gradient-primary text-white">
            {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {isEdit ? "Save research" : "Create research"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ScoreInput({ label, hint, value, setValue, positive }: { label: string; hint: string; value: number; setValue: (v: number) => void; positive?: boolean }) {
  const tone = positive
    ? value >= 7 ? "text-emerald-400" : value >= 4 ? "text-amber-400" : "text-rose-400"
    : value <= 3 ? "text-emerald-400" : value <= 6 ? "text-amber-400" : "text-rose-400";
  return (
    <div className="grid grid-cols-[1fr_auto_64px] gap-3 items-center">
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground">{hint}</p>
      </div>
      <input
        type="range" min={0} max={10} step={1} value={value}
        onChange={(e) => setValue(parseInt(e.target.value))}
        className="w-32 accent-primary"
      />
      <span className={cn("text-sm font-bold tabular-nums text-right", tone)}>{value}/10</span>
    </div>
  );
}
