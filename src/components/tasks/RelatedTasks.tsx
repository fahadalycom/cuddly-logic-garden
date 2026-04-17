import { useEffect, useState } from "react";
import { ListChecks, Plus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TaskDialog } from "./TaskDialog";
import {
  listRelatedTasks, setTaskStatus, isOverdue,
  STATUS_STYLE, PRIORITY_STYLE, labelFor,
  type Task, type TaskRelatedType, type TaskDepartment,
} from "@/lib/tasks";
import { format } from "date-fns";
import { toast } from "sonner";

interface Props {
  relatedType: TaskRelatedType;
  relatedId: string;
  defaultDepartment?: TaskDepartment;
  defaultTitle?: string;
  compact?: boolean;
}

export function RelatedTasks({ relatedType, relatedId, defaultDepartment, defaultTitle, compact }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await listRelatedTasks(relatedType, relatedId);
      setTasks(data);
    } catch (e: any) {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (relatedId) load(); }, [relatedType, relatedId]);

  async function handleComplete(t: Task) {
    try {
      await setTaskStatus(t.id, "completed");
      toast.success("Task completed");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    }
  }

  return (
    <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Tasks</h4>
          <Badge variant="outline" className="text-[10px]">{tasks.length}</Badge>
        </div>
        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setEditTask(null); setDialogOpen(true); }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> New
        </Button>
      </div>
      <div className={compact ? "max-h-48 overflow-y-auto" : ""}>
        {loading && <p className="text-xs text-muted-foreground p-3 text-center">Loading…</p>}
        {!loading && tasks.length === 0 && (
          <p className="text-xs text-muted-foreground p-3 text-center">No tasks yet</p>
        )}
        {tasks.map((t) => {
          const overdue = isOverdue(t);
          const effStatus = overdue ? "overdue" : t.status;
          return (
            <div key={t.id} className="px-3 py-2 border-b border-border/20 last:border-0 hover:bg-muted/30 cursor-pointer"
                 onClick={() => { setEditTask(t); setDialogOpen(true); }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <Badge variant="outline" className={`${STATUS_STYLE[effStatus as keyof typeof STATUS_STYLE]} text-[10px] px-1.5 py-0`}>
                      {labelFor(effStatus)}
                    </Badge>
                    <Badge variant="outline" className={`${PRIORITY_STYLE[t.priority]} text-[10px] px-1.5 py-0`}>
                      {labelFor(t.priority)}
                    </Badge>
                    {t.due_date && (
                      <span className={`text-[10px] flex items-center gap-0.5 ${overdue ? "text-rose-400" : "text-muted-foreground"}`}>
                        <Clock className="h-2.5 w-2.5" />
                        {format(new Date(t.due_date), "MMM d, HH:mm")}
                      </span>
                    )}
                  </div>
                </div>
                {t.status !== "completed" && (
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]"
                          onClick={(e) => { e.stopPropagation(); handleComplete(t); }}>
                    Done
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <TaskDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) load(); }}
        task={editTask}
        defaults={{ related_type: relatedType, related_id: relatedId, department: defaultDepartment, title: defaultTitle }}
      />
    </div>
  );
}
