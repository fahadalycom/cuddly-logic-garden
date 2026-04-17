import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  TASK_STATUSES, TASK_PRIORITIES, TASK_DEPARTMENTS, TASK_RELATED_TYPES,
  TASK_TEMPLATES, STATUS_STYLE, PRIORITY_STYLE, DEPARTMENT_STYLE, labelFor,
  createTask, updateTask, addTaskNote, listTaskActivity, listStaff,
  type Task, type TaskStatus, type TaskPriority, type TaskDepartment, type TaskRelatedType,
  type TaskActivity, type StaffOption,
} from "@/lib/tasks";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  defaults?: {
    related_type?: TaskRelatedType;
    related_id?: string | null;
    department?: TaskDepartment;
    title?: string;
    description?: string;
  };
  onSaved?: (task: Task) => void;
}

export function TaskDialog({ open, onOpenChange, task, defaults, onSaved }: Props) {
  const [tab, setTab] = useState("details");
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [activity, setActivity] = useState<TaskActivity[]>([]);
  const [newNote, setNewNote] = useState("");

  // Form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("pending");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [department, setDepartment] = useState<TaskDepartment>("general");
  const [relatedType, setRelatedType] = useState<TaskRelatedType>("general");
  const [relatedId, setRelatedId] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("unassigned");
  const [dueDate, setDueDate] = useState<string>("");
  const [internalNote, setInternalNote] = useState("");
  const [templateKey, setTemplateKey] = useState<string>("none");

  useEffect(() => {
    if (!open) return;
    listStaff().then(setStaff).catch(() => {});
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setStatus(task.status);
      setPriority(task.priority);
      setDepartment(task.department);
      setRelatedType(task.related_type);
      setRelatedId(task.related_id ?? "");
      setAssignedTo(task.assigned_to ?? "unassigned");
      setDueDate(task.due_date ? task.due_date.slice(0, 16) : "");
      setInternalNote(task.internal_note ?? "");
      setTemplateKey(task.template_key ?? "none");
      listTaskActivity(task.id).then(setActivity).catch(() => {});
    } else {
      setTitle(defaults?.title ?? "");
      setDescription(defaults?.description ?? "");
      setStatus("pending");
      setPriority("medium");
      setDepartment(defaults?.department ?? "general");
      setRelatedType(defaults?.related_type ?? "general");
      setRelatedId(defaults?.related_id ?? "");
      setAssignedTo("unassigned");
      setDueDate("");
      setInternalNote("");
      setTemplateKey("none");
      setActivity([]);
    }
    setTab("details");
  }, [open, task, defaults]);

  function applyTemplate(key: string) {
    setTemplateKey(key);
    if (key === "none") return;
    const tpl = TASK_TEMPLATES.find((t) => t.key === key);
    if (!tpl) return;
    if (!title) setTitle(tpl.title);
    setDepartment(tpl.department);
    setPriority(tpl.priority);
    const due = new Date(Date.now() + tpl.due_in_hours * 3600_000);
    setDueDate(due.toISOString().slice(0, 16));
  }

  async function handleSave() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description || null,
        status,
        priority,
        department,
        related_type: relatedType,
        related_id: relatedId || null,
        assigned_to: assignedTo === "unassigned" ? null : assignedTo,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        internal_note: internalNote || null,
        template_key: templateKey === "none" ? null : templateKey,
      };
      const saved = task ? await updateTask(task.id, payload) : await createTask(payload);
      toast.success(task ? "Task updated" : "Task created");
      onSaved?.(saved);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddNote() {
    if (!task || !newNote.trim()) return;
    try {
      await addTaskNote(task.id, newNote.trim());
      setNewNote("");
      const a = await listTaskActivity(task.id);
      setActivity(a);
      toast.success("Note added");
    } catch (e: any) {
      toast.error(e?.message || "Failed to add note");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {task ? "Edit Task" : "Create Task"}
            {task && (
              <>
                <Badge variant="outline" className={STATUS_STYLE[task.status]}>{labelFor(task.status)}</Badge>
                <Badge variant="outline" className={PRIORITY_STYLE[task.priority]}>{labelFor(task.priority)}</Badge>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="notes">Internal Notes</TabsTrigger>
            <TabsTrigger value="activity" disabled={!task}>Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="flex-1 overflow-auto space-y-3 mt-3">
            {!task && (
              <div>
                <Label>Quick Template</Label>
                <Select value={templateKey} onValueChange={applyTemplate}>
                  <SelectTrigger><SelectValue placeholder="Choose a template…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {TASK_TEMPLATES.map((t) => (
                      <SelectItem key={t.key} value={t.key}>{t.title} ({t.department})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Department</Label>
                <Select value={department} onValueChange={(v) => setDepartment(v as TaskDepartment)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{labelFor(d)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{labelFor(p)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{labelFor(s)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assigned to</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">— Unassigned ({labelFor(department)} queue) —</SelectItem>
                    {staff.map((s) => <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Related Type</Label>
                <Select value={relatedType} onValueChange={(v) => setRelatedType(v as TaskRelatedType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_RELATED_TYPES.map((t) => <SelectItem key={t} value={t}>{labelFor(t)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Due date</Label>
                <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
            {relatedType !== "general" && (
              <div>
                <Label>Related ID</Label>
                <Input value={relatedId} onChange={(e) => setRelatedId(e.target.value)} placeholder="UUID of related record" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="notes" className="flex-1 overflow-auto space-y-2 mt-3">
            <Label>Internal note (staff-only)</Label>
            <Textarea value={internalNote} onChange={(e) => setInternalNote(e.target.value)} rows={6} placeholder="Visible to staff only" />
          </TabsContent>

          <TabsContent value="activity" className="flex-1 overflow-hidden mt-3 flex flex-col">
            {task && (
              <div className="flex gap-2 mb-2">
                <Input placeholder="Add activity note…" value={newNote} onChange={(e) => setNewNote(e.target.value)} />
                <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim()}>Add</Button>
              </div>
            )}
            <ScrollArea className="flex-1 border rounded-md">
              <div className="p-2 space-y-2">
                {activity.length === 0 && <p className="text-xs text-muted-foreground p-3 text-center">No activity yet</p>}
                {activity.map((a) => (
                  <div key={a.id} className="text-xs border-l-2 border-primary/30 pl-3 py-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{labelFor(a.event_type)}</span>
                      <span className="text-muted-foreground">{format(new Date(a.created_at), "MMM d, HH:mm")}</span>
                    </div>
                    {(a.from_value || a.to_value) && (
                      <p className="text-muted-foreground">
                        {a.from_value && <>from <span className="text-foreground">{a.from_value}</span> </>}
                        {a.to_value && <>→ <span className="text-foreground">{a.to_value}</span></>}
                      </p>
                    )}
                    {a.note && <p className="text-muted-foreground italic">{a.note}</p>}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : task ? "Save Changes" : "Create Task"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
