import { supabase } from "@/integrations/supabase/client";

export type TaskStatus = "pending" | "in_progress" | "waiting" | "completed" | "cancelled" | "overdue";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskDepartment = "sales" | "support" | "payments" | "fulfillment" | "renewals" | "operations" | "general";
export type TaskRelatedType = "conversation" | "order" | "ticket" | "payment" | "renewal" | "account" | "lead" | "general";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  department: TaskDepartment;
  related_type: TaskRelatedType;
  related_id: string | null;
  assigned_to: string | null;
  created_by: string;
  due_date: string | null;
  completed_at: string | null;
  internal_note: string | null;
  template_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  actor_id: string | null;
  event_type: string;
  from_value: string | null;
  to_value: string | null;
  note: string | null;
  created_at: string;
}

export const TASK_STATUSES: TaskStatus[] = ["pending", "in_progress", "waiting", "completed", "cancelled", "overdue"];
export const TASK_PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];
export const TASK_DEPARTMENTS: TaskDepartment[] = ["sales", "support", "payments", "fulfillment", "renewals", "operations", "general"];
export const TASK_RELATED_TYPES: TaskRelatedType[] = ["conversation", "order", "ticket", "payment", "renewal", "account", "lead", "general"];

export const STATUS_STYLE: Record<TaskStatus, string> = {
  pending: "bg-muted/40 text-muted-foreground border-border/40",
  in_progress: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  waiting: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  cancelled: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  overdue: "bg-rose-600/15 text-rose-300 border-rose-500/30 animate-pulse",
};

export const PRIORITY_STYLE: Record<TaskPriority, string> = {
  low: "bg-muted/50 text-muted-foreground border-border/30",
  medium: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  high: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  urgent: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

export const DEPARTMENT_STYLE: Record<TaskDepartment, string> = {
  sales: "bg-primary/10 text-primary border-primary/20",
  support: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  payments: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  fulfillment: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  renewals: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  operations: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  general: "bg-muted/40 text-muted-foreground border-border/40",
};

export const labelFor = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const TASK_TEMPLATES: { key: string; title: string; department: TaskDepartment; priority: TaskPriority; due_in_hours: number }[] = [
  { key: "verify_payment", title: "Verify payment", department: "payments", priority: "high", due_in_hours: 6 },
  { key: "deliver_subscription", title: "Deliver subscription", department: "fulfillment", priority: "high", due_in_hours: 12 },
  { key: "follow_up_customer", title: "Follow up customer", department: "sales", priority: "medium", due_in_hours: 24 },
  { key: "resolve_complaint", title: "Resolve complaint", department: "support", priority: "high", due_in_hours: 24 },
  { key: "check_account_issue", title: "Check account issue", department: "support", priority: "medium", due_in_hours: 8 },
  { key: "renewal_reminder", title: "Send renewal reminder", department: "renewals", priority: "medium", due_in_hours: 48 },
  { key: "replacement_review", title: "Review replacement request", department: "operations", priority: "high", due_in_hours: 24 },
];

// Mark overdue tasks (run client-side filter; trigger fires server-side periodically)
export function isOverdue(t: Pick<Task, "due_date" | "status">): boolean {
  if (!t.due_date) return false;
  if (["completed", "cancelled"].includes(t.status)) return false;
  return new Date(t.due_date).getTime() < Date.now();
}

// ----- API -----
export async function listTasks(filters: {
  status?: TaskStatus;
  priority?: TaskPriority;
  department?: TaskDepartment;
  assigned_to?: string;
  related_type?: TaskRelatedType;
  related_id?: string;
  overdue?: boolean;
} = {}): Promise<Task[]> {
  let q = supabase.from("tasks").select("*").order("created_at", { ascending: false });
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.priority) q = q.eq("priority", filters.priority);
  if (filters.department) q = q.eq("department", filters.department as any);
  if (filters.assigned_to) q = q.eq("assigned_to", filters.assigned_to);
  if (filters.related_type) q = q.eq("related_type", filters.related_type);
  if (filters.related_id) q = q.eq("related_id", filters.related_id);
  const { data, error } = await q;
  if (error) throw error;
  let rows = (data || []) as unknown as Task[];
  if (filters.overdue) rows = rows.filter(isOverdue);
  return rows;
}

export async function listRelatedTasks(related_type: TaskRelatedType, related_id: string) {
  return listTasks({ related_type, related_id });
}

export async function listTaskActivity(task_id: string): Promise<TaskActivity[]> {
  const { data, error } = await supabase
    .from("task_activity" as any)
    .select("*")
    .eq("task_id", task_id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as TaskActivity[];
}

export interface TaskInput {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  department?: TaskDepartment;
  related_type?: TaskRelatedType;
  related_id?: string | null;
  assigned_to?: string | null;
  due_date?: string | null;
  internal_note?: string | null;
  template_key?: string | null;
}

export async function createTask(input: TaskInput): Promise<Task> {
  const { data: user } = await supabase.auth.getUser();
  const created_by = user.user?.id;
  if (!created_by) throw new Error("Not authenticated");
  const payload: any = {
    title: input.title,
    description: input.description ?? null,
    status: input.status ?? "pending",
    priority: input.priority ?? "medium",
    department: input.department ?? "general",
    related_type: input.related_type ?? "general",
    related_id: input.related_id ?? null,
    assigned_to: input.assigned_to ?? null,
    due_date: input.due_date ?? null,
    internal_note: input.internal_note ?? null,
    template_key: input.template_key ?? null,
    created_by,
  };
  const { data, error } = await supabase.from("tasks").insert(payload).select("*").single();
  if (error) throw error;
  return data as unknown as Task;
}

export async function updateTask(id: string, patch: Partial<TaskInput>): Promise<Task> {
  const { data, error } = await supabase.from("tasks").update(patch as any).eq("id", id).select("*").single();
  if (error) throw error;
  return data as unknown as Task;
}

export async function setTaskStatus(id: string, status: TaskStatus) {
  return updateTask(id, { status });
}

export async function setTaskPriority(id: string, priority: TaskPriority) {
  return updateTask(id, { priority });
}

export async function reassignTask(id: string, assigned_to: string | null) {
  return updateTask(id, { assigned_to });
}

export async function addTaskNote(task_id: string, note: string) {
  const { data: user } = await supabase.auth.getUser();
  const { error } = await supabase.from("task_activity" as any).insert({
    task_id, actor_id: user.user?.id ?? null, event_type: "note_added", note,
  });
  if (error) throw error;
}

export interface StaffOption { user_id: string; full_name: string; email: string; }
export async function listStaff(): Promise<StaffOption[]> {
  const { data, error } = await supabase
    .from("staff_profiles")
    .select("user_id, full_name, email")
    .eq("is_active", true)
    .order("full_name");
  if (error) throw error;
  return (data || []) as StaffOption[];
}
