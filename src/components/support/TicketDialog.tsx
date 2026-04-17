import { useEffect, useMemo, useState } from "react";
import { Loader2, Ticket, History, StickyNote, ShoppingCart, User as UserIcon, Link2, Unlink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ISSUE_TYPES, TICKET_STATUSES, TICKET_PRIORITIES,
  STATUS_STYLE, PRIORITY_STYLE, labelFor,
  type IssueType, type TicketPriority, type TicketStatus,
  type TicketRow, type TicketActivity,
} from "@/lib/support-tickets";

interface Agent { user_id: string; full_name: string; }
interface OrderOption { id: string; order_number: string | null; total_amount: number; status: string; }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId?: string | null;
  // Prefill (for create from conversation)
  prefill?: {
    conversationId?: string | null;
    clientId?: string | null;
    customerName?: string | null;
    customerPhone?: string | null;
    summary?: string | null;
    assignedTo?: string | null;
  };
  onSaved?: (ticket: TicketRow) => void;
}

export function TicketDialog({ open, onOpenChange, ticketId, prefill, onSaved }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ticket, setTicket] = useState<TicketRow | null>(null);
  const [activity, setActivity] = useState<TicketActivity[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [newNote, setNewNote] = useState("");

  // Form fields
  const [issueType, setIssueType] = useState<IssueType>("general_support");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [status, setStatus] = useState<TicketStatus>("open");
  const [assignedTo, setAssignedTo] = useState<string>("__unassigned__");
  const [orderId, setOrderId] = useState<string>("__none__");
  const [internalNotes, setInternalNotes] = useState("");

  const isEdit = !!ticketId;

  // Load agents + orders for the customer/conversation
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: staff } = await supabase
        .from("staff_profiles")
        .select("user_id, full_name")
        .eq("is_active", true)
        .order("full_name");
      setAgents((staff as Agent[]) || []);
    })();
  }, [open]);

  // Load orders for the linked client/conversation
  useEffect(() => {
    if (!open) return;
    const clientId = ticket?.client_id ?? prefill?.clientId ?? null;
    const conversationId = ticket?.conversation_id ?? prefill?.conversationId ?? null;
    if (!clientId && !conversationId) { setOrders([]); return; }
    (async () => {
      let q = (supabase as any).from("orders")
        .select("id, order_number, total_amount, status")
        .order("created_at", { ascending: false })
        .limit(20);
      if (clientId) q = q.eq("client_id", clientId);
      else if (conversationId) q = q.eq("conversation_id", conversationId);
      const { data } = await q;
      setOrders((data as OrderOption[]) || []);
    })();
  }, [open, ticket?.client_id, ticket?.conversation_id, prefill?.clientId, prefill?.conversationId]);

  // Load existing ticket
  useEffect(() => {
    if (!open) return;
    if (!ticketId) {
      // Reset for create
      setTicket(null);
      setActivity([]);
      setIssueType("general_support");
      setSummary(prefill?.summary ?? "");
      setDescription("");
      setPriority("medium");
      setStatus("open");
      setAssignedTo(prefill?.assignedTo ?? "__unassigned__");
      setOrderId("__none__");
      setInternalNotes("");
      return;
    }
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("support_issues").select("*").eq("id", ticketId).maybeSingle();
      if (!error && data) {
        const t = data as TicketRow;
        setTicket(t);
        setIssueType(t.issue_type_v2 ?? "general_support");
        setSummary(t.summary ?? "");
        setDescription(t.description ?? "");
        setPriority(t.priority);
        setStatus(t.status);
        setAssignedTo(t.assigned_to ?? "__unassigned__");
        setOrderId(t.order_id ?? "__none__");
        setInternalNotes(t.internal_notes ?? "");
      }
      const { data: acts } = await (supabase as any)
        .from("ticket_activity").select("*").eq("ticket_id", ticketId)
        .order("created_at", { ascending: false });
      setActivity((acts as TicketActivity[]) || []);
      setLoading(false);
    })();
  }, [open, ticketId]);

  const agentMap = useMemo(() => {
    const m = new Map<string, string>();
    agents.forEach((a) => m.set(a.user_id, a.full_name));
    return m;
  }, [agents]);

  const logActivity = async (
    ticketIdLocal: string,
    event_type: string,
    from_value?: string | null,
    to_value?: string | null,
    note?: string | null,
  ) => {
    await (supabase as any).from("ticket_activity").insert({
      ticket_id: ticketIdLocal,
      actor_id: user?.id ?? null,
      event_type,
      from_value: from_value ?? null,
      to_value: to_value ?? null,
      note: note ?? null,
    });
  };

  const handleSave = async () => {
    if (!user) { toast({ title: "Not signed in", variant: "destructive" }); return; }
    if (!summary.trim() && !description.trim()) {
      toast({ title: "Add a summary or description", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (!isEdit) {
        // CREATE
        const payload: any = {
          client_id: prefill?.clientId ?? null,
          conversation_id: prefill?.conversationId ?? null,
          order_id: orderId === "__none__" ? null : orderId,
          created_by: user.id,
          assigned_to: assignedTo === "__unassigned__" ? null : assignedTo,
          issue_type_v2: issueType,
          type: issueType, // keep legacy text col in sync
          summary: summary.trim() || null,
          description: description.trim() || summary.trim() || "(no description)",
          internal_notes: internalNotes.trim() || null,
          priority,
          status,
        };
        // client_id is NOT NULL in original schema — guard
        if (!payload.client_id) {
          toast({ title: "Customer required", description: "Link a customer/client before creating a ticket.", variant: "destructive" });
          setSaving(false);
          return;
        }
        const { data, error } = await (supabase as any)
          .from("support_issues").insert(payload).select("*").maybeSingle();
        if (error) throw error;
        const created = data as TicketRow;
        await logActivity(created.id, "created", null, created.ticket_number, summary.trim() || null);
        if (created.assigned_to) {
          await logActivity(created.id, "assigned", null, agentMap.get(created.assigned_to) ?? created.assigned_to);
        }
        if (created.order_id) {
          await logActivity(created.id, "order_linked", null, created.order_id);
        }
        toast({ title: "Ticket created", description: created.ticket_number ?? undefined });
        onSaved?.(created);
        onOpenChange(false);
      } else if (ticket) {
        // UPDATE
        const updates: any = {
          issue_type_v2: issueType,
          type: issueType,
          summary: summary.trim() || null,
          description: description.trim() || summary.trim() || ticket.description,
          internal_notes: internalNotes.trim() || null,
          priority,
          status,
          assigned_to: assignedTo === "__unassigned__" ? null : assignedTo,
          order_id: orderId === "__none__" ? null : orderId,
        };
        if (status === "resolved" && !ticket.resolved_at) updates.resolved_at = new Date().toISOString();
        if (status === "closed" && !ticket.closed_at) updates.closed_at = new Date().toISOString();
        if (status === "reopened") { updates.resolved_at = null; updates.closed_at = null; }

        const { data, error } = await (supabase as any)
          .from("support_issues").update(updates).eq("id", ticket.id).select("*").maybeSingle();
        if (error) throw error;
        const updated = data as TicketRow;

        // Diff activity log
        if (ticket.status !== updated.status) {
          await logActivity(updated.id, "status_changed", ticket.status, updated.status);
          if (updated.status === "resolved") await logActivity(updated.id, "resolved");
          if (updated.status === "closed") await logActivity(updated.id, "closed");
          if (updated.status === "reopened") await logActivity(updated.id, "reopened");
        }
        if (ticket.priority !== updated.priority) {
          await logActivity(updated.id, "priority_changed", ticket.priority, updated.priority);
        }
        if ((ticket.assigned_to ?? null) !== (updated.assigned_to ?? null)) {
          await logActivity(
            updated.id, "assigned",
            ticket.assigned_to ? (agentMap.get(ticket.assigned_to) ?? ticket.assigned_to) : "Unassigned",
            updated.assigned_to ? (agentMap.get(updated.assigned_to) ?? updated.assigned_to) : "Unassigned",
          );
        }
        if ((ticket.order_id ?? null) !== (updated.order_id ?? null)) {
          await logActivity(
            updated.id,
            updated.order_id ? "order_linked" : "order_unlinked",
            ticket.order_id ?? null,
            updated.order_id ?? null,
          );
        }
        toast({ title: "Ticket updated" });
        onSaved?.(updated);
        onOpenChange(false);
      }
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!ticket || !newNote.trim()) return;
    const next = [internalNotes, `[${new Date().toLocaleString()}] ${newNote.trim()}`].filter(Boolean).join("\n");
    const { error } = await (supabase as any).from("support_issues")
      .update({ internal_notes: next }).eq("id", ticket.id);
    if (!error) {
      setInternalNotes(next);
      await logActivity(ticket.id, "note_added", null, null, newNote.trim());
      const { data: acts } = await (supabase as any).from("ticket_activity")
        .select("*").eq("ticket_id", ticket.id).order("created_at", { ascending: false });
      setActivity((acts as TicketActivity[]) || []);
      setNewNote("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="p-4 border-b border-border/40">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Ticket className="h-4 w-4 text-amber-400" />
            {isEdit ? `Ticket ${ticket?.ticket_number ?? ""}` : "Create Support Ticket"}
            {isEdit && (
              <>
                <Badge variant="outline" className={cn("ml-1 text-[10px] capitalize", STATUS_STYLE[status])}>
                  {labelFor(TICKET_STATUSES, status)}
                </Badge>
                <Badge variant="outline" className={cn("text-[10px] capitalize", PRIORITY_STYLE[priority])}>
                  {priority}
                </Badge>
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {prefill?.customerName || ticket ? (
              <span className="flex items-center gap-3 text-muted-foreground">
                <span className="flex items-center gap-1"><UserIcon className="h-3 w-3" /> {prefill?.customerName ?? "Customer"}</span>
                {prefill?.customerPhone && <span>· {prefill.customerPhone}</span>}
              </span>
            ) : "Track customer issues, complaints, and resolutions."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-4 mt-3 self-start">
              <TabsTrigger value="details">Details</TabsTrigger>
              {isEdit && <TabsTrigger value="notes">Internal Notes</TabsTrigger>}
              {isEdit && <TabsTrigger value="activity">Activity ({activity.length})</TabsTrigger>}
            </TabsList>

            <TabsContent value="details" className="flex-1 overflow-hidden m-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Issue Type">
                      <Select value={issueType} onValueChange={(v) => setIssueType(v as IssueType)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ISSUE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Priority">
                      <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TICKET_PRIORITIES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Status">
                      <Select value={status} onValueChange={(v) => setStatus(v as TicketStatus)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TICKET_STATUSES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Assigned Agent">
                      <Select value={assignedTo} onValueChange={setAssignedTo}>
                        <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__unassigned__">Unassigned</SelectItem>
                          {agents.map((a) => <SelectItem key={a.user_id} value={a.user_id}>{a.full_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <Field label="Summary">
                    <Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Short headline (e.g. Cannot log into ChatGPT account)" />
                  </Field>

                  <Field label="Description">
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Customer's reported issue, troubleshooting steps tried, etc." rows={4} />
                  </Field>

                  <Field label={
                    <span className="flex items-center gap-1.5">
                      <ShoppingCart className="h-3.5 w-3.5" /> Linked Order (optional)
                    </span>
                  }>
                    <div className="flex gap-2">
                      <Select value={orderId} onValueChange={setOrderId}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="No order linked" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No order linked</SelectItem>
                          {orders.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.order_number ?? o.id.slice(0, 8)} — PKR {Number(o.total_amount).toLocaleString()} ({o.status.replace(/_/g, " ")})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {orderId !== "__none__" && (
                        <Button variant="outline" size="sm" onClick={() => setOrderId("__none__")} title="Unlink">
                          <Unlink className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    {orders.length === 0 && (
                      <p className="text-[10px] text-muted-foreground/70 mt-1">No orders found for this customer.</p>
                    )}
                  </Field>

                  {!isEdit && (
                    <Field label="Internal Notes (optional)">
                      <Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} placeholder="Notes only visible to staff" rows={2} />
                    </Field>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {isEdit && (
              <TabsContent value="notes" className="flex-1 overflow-hidden m-0">
                <div className="flex flex-col h-full">
                  <ScrollArea className="flex-1 p-4">
                    {internalNotes ? (
                      <pre className="text-xs text-foreground/90 whitespace-pre-wrap font-sans bg-amber-500/5 border border-amber-500/20 rounded-md p-3">
                        {internalNotes}
                      </pre>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No internal notes yet.</p>
                    )}
                  </ScrollArea>
                  <div className="border-t border-border/40 p-3 flex gap-2">
                    <Textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add internal note (staff only)..."
                      rows={2}
                      className="resize-none bg-amber-500/5 border-amber-500/20 text-sm"
                    />
                    <Button onClick={handleAddNote} disabled={!newNote.trim()} className="self-end" size="sm">
                      <StickyNote className="h-3.5 w-3.5 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              </TabsContent>
            )}

            {isEdit && (
              <TabsContent value="activity" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-2">
                    {activity.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No activity yet.</p>
                    ) : activity.map((a) => (
                      <div key={a.id} className="flex gap-2 text-xs border-l-2 border-border/40 pl-3 py-1">
                        <History className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium capitalize">{a.event_type.replace(/_/g, " ")}</span>
                            {a.from_value && a.to_value && (
                              <span className="text-muted-foreground">
                                <span className="line-through opacity-70">{a.from_value}</span> → <span>{a.to_value}</span>
                              </span>
                            )}
                            {!a.from_value && a.to_value && (
                              <span className="text-muted-foreground">{a.to_value}</span>
                            )}
                          </div>
                          {a.note && <p className="text-muted-foreground mt-0.5">{a.note}</p>}
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                            {new Date(a.created_at).toLocaleString()}
                            {a.actor_id && agentMap.get(a.actor_id) && ` · by ${agentMap.get(a.actor_id)}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            )}
          </Tabs>
        )}

        <div className="border-t border-border/40 p-3 flex items-center justify-between gap-2 bg-card/40">
          <div className="text-[10px] text-muted-foreground">
            {ticket && (
              <span>Created {new Date(ticket.created_at).toLocaleDateString()}
                {ticket.resolved_at && ` · Resolved ${new Date(ticket.resolved_at).toLocaleDateString()}`}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Ticket"}
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
