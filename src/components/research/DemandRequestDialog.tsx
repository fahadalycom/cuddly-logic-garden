import { useEffect, useState } from "react";
import { Loader2, Lightbulb, Plus, FlaskConical } from "lucide-react";
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
  upsertToolRequest, incrementDemand, upsertResearch,
  REQUEST_STATUSES, REQUEST_SOURCES, REQUESTER_TYPES, PRIORITIES,
  REQUEST_STATUS_STYLE, PRIORITY_STYLE,
  type ToolRequest, type RequestStatus, type RequestSource, type RequesterType, type Priority,
  labelFor,
} from "@/lib/research";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  request?: ToolRequest | null;
  onSaved?: () => void;
  onResearchCreated?: () => void;
}

export function DemandRequestDialog({ open, onOpenChange, request, onSaved, onResearchCreated }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const isEdit = !!request;

  const [toolName, setToolName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<RequestStatus>("new");
  const [priority, setPriority] = useState<Priority>("medium");
  const [source, setSource] = useState<RequestSource>("internal");
  const [requesterType, setRequesterType] = useState<RequesterType>("team_member");
  const [requestedByName, setRequestedByName] = useState("");
  const [demandCount, setDemandCount] = useState(1);

  useEffect(() => {
    if (!open) return;
    if (request) {
      setToolName(request.tool_name);
      setCategory(request.category ?? "");
      setDescription(request.description ?? "");
      setNotes(request.notes ?? "");
      setStatus(request.status);
      setPriority(request.priority);
      setSource(request.source);
      setRequesterType(request.requester_type);
      setRequestedByName(request.requested_by_name ?? "");
      setDemandCount(request.demand_count);
    } else {
      setToolName(""); setCategory(""); setDescription(""); setNotes("");
      setStatus("new"); setPriority("medium"); setSource("internal");
      setRequesterType("team_member"); setRequestedByName(""); setDemandCount(1);
    }
  }, [open, request]);

  const handleSave = async () => {
    if (!toolName.trim()) {
      toast({ title: "Tool name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await upsertToolRequest({
        id: request?.id,
        tool_name: toolName.trim(),
        category: category.trim() || null,
        description: description.trim() || null,
        notes: notes.trim() || null,
        status, priority, source,
        requester_type: requesterType,
        requested_by_name: requestedByName.trim() || null,
        demand_count: demandCount,
      });
      toast({ title: isEdit ? "Request updated" : "Demand logged" });
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleIncrement = async () => {
    if (!request) return;
    await incrementDemand(request.id, request.demand_count);
    setDemandCount((c) => c + 1);
    toast({ title: "Demand +1", description: `${request.tool_name} now ${request.demand_count + 1}` });
    onSaved?.();
  };

  const handleStartResearch = async () => {
    if (!request || !user) return;
    setSaving(true);
    try {
      await upsertResearch({
        tool_name: request.tool_name,
        category: request.category,
        related_request_id: request.id,
        status: "in_progress",
        recommendation: "undecided",
        created_by: user.id,
      });
      await upsertToolRequest({ id: request.id, tool_name: request.tool_name, status: "researching" });
      toast({ title: "Research started", description: request.tool_name });
      onResearchCreated?.();
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            {isEdit ? `Demand: ${request?.tool_name}` : "Log new demand request"}
            {isEdit && (
              <>
                <Badge variant="outline" className={cn("ml-1 text-[10px]", REQUEST_STATUS_STYLE[status])}>
                  {labelFor(REQUEST_STATUSES, status)}
                </Badge>
                <Badge variant="outline" className={cn("text-[10px]", PRIORITY_STYLE[priority])}>
                  {priority}
                </Badge>
                <Badge variant="outline" className="text-[10px] ml-auto">
                  Demand · {demandCount}
                </Badge>
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Capture customer requests and prioritize tools to evaluate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Tool Name *">
              <Input value={toolName} onChange={(e) => setToolName(e.target.value)} placeholder="e.g. Runway ML" />
            </Field>
            <Field label="Category">
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="AI Video, Design, Productivity…" />
            </Field>
            <Field label="Status">
              <Select value={status} onValueChange={(v) => setStatus(v as RequestStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REQUEST_STATUSES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Source">
              <Select value={source} onValueChange={(v) => setSource(v as RequestSource)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REQUEST_SOURCES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Requested By">
              <Select value={requesterType} onValueChange={(v) => setRequesterType(v as RequesterType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REQUESTER_TYPES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Requester Name (optional)">
              <Input value={requestedByName} onChange={(e) => setRequestedByName(e.target.value)} placeholder="Person, channel or segment" />
            </Field>
            <Field label="Demand Count">
              <div className="flex gap-2">
                <Input type="number" min={1} value={demandCount} onChange={(e) => setDemandCount(Math.max(1, parseInt(e.target.value) || 1))} />
                {isEdit && (
                  <Button variant="outline" size="sm" onClick={handleIncrement} title="Increment demand">
                    <Plus className="h-3.5 w-3.5" /> 1
                  </Button>
                )}
              </div>
            </Field>
          </div>

          <Field label="Description">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Why are customers asking for this? What problem does it solve?" rows={3} />
          </Field>

          <Field label="Internal Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Staff-only context, links, pricing notes…" rows={2} />
          </Field>
        </div>

        <div className="flex justify-between items-center gap-2 pt-3 border-t border-border/40">
          {isEdit ? (
            <Button variant="outline" size="sm" onClick={handleStartResearch} disabled={saving}>
              <FlaskConical className="h-3.5 w-3.5 mr-1.5" /> Start research
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gradient-primary text-white">
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {isEdit ? "Save changes" : "Log demand"}
            </Button>
          </div>
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
