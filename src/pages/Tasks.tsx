import { useEffect, useMemo, useState } from "react";
import { ListChecks, Plus, Search, Filter as FilterIcon } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import {
  listTasks, listStaff, isOverdue,
  STATUS_STYLE, PRIORITY_STYLE, DEPARTMENT_STYLE, labelFor,
  TASK_STATUSES, TASK_PRIORITIES, TASK_DEPARTMENTS, TASK_RELATED_TYPES,
  type Task, type StaffOption, type TaskStatus, type TaskPriority, type TaskDepartment, type TaskRelatedType,
} from "@/lib/tasks";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [fStatus, setFStatus] = useState<string>("all");
  const [fPriority, setFPriority] = useState<string>("all");
  const [fDepartment, setFDepartment] = useState<string>("all");
  const [fAssigned, setFAssigned] = useState<string>("all");
  const [fRelated, setFRelated] = useState<string>("all");
  const [fOverdue, setFOverdue] = useState<boolean>(false);

  async function load() {
    setLoading(true);
    try {
      const [t, s] = await Promise.all([listTasks(), listStaff()]);
      setTasks(t);
      setStaff(s);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const staffMap = useMemo(() => Object.fromEntries(staff.map((s) => [s.user_id, s.full_name])), [staff]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const overdue = isOverdue(t);
      const effStatus = overdue ? "overdue" : t.status;
      if (fStatus !== "all" && effStatus !== fStatus) return false;
      if (fPriority !== "all" && t.priority !== fPriority) return false;
      if (fDepartment !== "all" && t.department !== fDepartment) return false;
      if (fAssigned !== "all") {
        if (fAssigned === "unassigned" ? t.assigned_to !== null : t.assigned_to !== fAssigned) return false;
      }
      if (fRelated !== "all" && t.related_type !== fRelated) return false;
      if (fOverdue && !overdue) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!(t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [tasks, search, fStatus, fPriority, fDepartment, fAssigned, fRelated, fOverdue]);

  const overdueCount = useMemo(() => tasks.filter(isOverdue).length, [tasks]);

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Workflow tasks across orders, conversations, leads and tickets"
        icon={<ListChecks className="h-5 w-5 text-white" />}
        actions={
          <Button onClick={() => { setEditTask(null); setDialogOpen(true); }} className="gradient-primary text-white">
            <Plus className="h-4 w-4 mr-1.5" /> Add Task
          </Button>
        }
      />

      {/* Stat strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-4">
        <StatPill label="Total" value={tasks.length} />
        <StatPill label="Pending" value={tasks.filter((t) => t.status === "pending").length} />
        <StatPill label="In Progress" value={tasks.filter((t) => t.status === "in_progress").length} />
        <StatPill label="Completed" value={tasks.filter((t) => t.status === "completed").length} accent="emerald" />
        <StatPill label="Overdue" value={overdueCount} accent="rose" />
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border/40 bg-card/40 p-3 mb-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 h-9" placeholder="Search tasks…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant={fOverdue ? "default" : "outline"} size="sm" onClick={() => setFOverdue(!fOverdue)}>
            <FilterIcon className="h-3.5 w-3.5 mr-1" /> Overdue only
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <FilterSelect value={fStatus} onChange={setFStatus} placeholder="Status">
            {TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{labelFor(s)}</SelectItem>)}
          </FilterSelect>
          <FilterSelect value={fPriority} onChange={setFPriority} placeholder="Priority">
            {TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{labelFor(p)}</SelectItem>)}
          </FilterSelect>
          <FilterSelect value={fDepartment} onChange={setFDepartment} placeholder="Department">
            {TASK_DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{labelFor(d)}</SelectItem>)}
          </FilterSelect>
          <FilterSelect value={fAssigned} onChange={setFAssigned} placeholder="Assigned">
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {staff.map((s) => <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>)}
          </FilterSelect>
          <FilterSelect value={fRelated} onChange={setFRelated} placeholder="Related">
            {TASK_RELATED_TYPES.map((r) => <SelectItem key={r} value={r}>{labelFor(r)}</SelectItem>)}
          </FilterSelect>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={7} className="text-center py-6 text-sm text-muted-foreground">Loading…</TableCell></TableRow>
            )}
            {!loading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">No tasks found</TableCell></TableRow>
            )}
            {filtered.map((t) => {
              const overdue = isOverdue(t);
              const effStatus = (overdue ? "overdue" : t.status) as TaskStatus;
              return (
                <TableRow key={t.id} className="cursor-pointer" onClick={() => { setEditTask(t); setDialogOpen(true); }}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm text-foreground">{t.title}</p>
                      {t.related_type !== "general" && (
                        <p className="text-[11px] text-muted-foreground">{labelFor(t.related_type)}{t.related_id ? ` · ${t.related_id.slice(0, 8)}` : ""}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${DEPARTMENT_STYLE[t.department]} text-[10px]`}>{labelFor(t.department)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${PRIORITY_STYLE[t.priority]} text-[10px]`}>{labelFor(t.priority)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${STATUS_STYLE[effStatus]} text-[10px]`}>{labelFor(effStatus)}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {t.assigned_to ? (staffMap[t.assigned_to] ?? t.assigned_to.slice(0, 8)) : <span className="italic">Unassigned</span>}
                  </TableCell>
                  <TableCell className={`text-xs ${overdue ? "text-rose-400 font-medium" : "text-muted-foreground"}`}>
                    {t.due_date ? format(new Date(t.due_date), "MMM d, HH:mm") : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(t.created_at), "MMM d")}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) load(); }}
        task={editTask}
      />
    </div>
  );
}

function StatPill({ label, value, accent }: { label: string; value: number; accent?: "emerald" | "rose" }) {
  const color = accent === "emerald" ? "text-emerald-400" : accent === "rose" ? "text-rose-400" : "text-foreground";
  return (
    <div className="rounded-xl border border-border/40 bg-card/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
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
