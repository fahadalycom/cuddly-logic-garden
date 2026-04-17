import { supabase } from "@/integrations/supabase/client";

export type RequestStatus = "new" | "researching" | "approved" | "rejected" | "sourced" | "launched" | "revisit_later";
export type RequestSource = "whatsapp" | "facebook" | "instagram" | "internal" | "other";
export type RequesterType = "customer" | "team_member" | "admin";
export type Priority = "low" | "medium" | "high" | "urgent";
export type ResearchStatus = "not_started" | "in_progress" | "completed" | "on_hold";
export type Recommendation = "approve" | "reject" | "test_first" | "revisit_later" | "undecided";

export interface ToolRequest {
  id: string;
  tool_name: string;
  category: string | null;
  description: string | null;
  notes: string | null;
  demand_count: number;
  status: RequestStatus;
  priority: Priority;
  source: RequestSource;
  requester_type: RequesterType;
  requested_by_name: string | null;
  requested_by_client_id: string | null;
  requested_by_user_id: string | null;
  assigned_to: string | null;
  last_requested_at: string;
  created_at: string;
  updated_at: string;
}

export interface ResearchRecord {
  id: string;
  tool_name: string;
  category: string | null;
  related_request_id: string | null;
  assigned_to: string | null;
  status: ResearchStatus;
  feasibility_score: number | null;
  demand_score: number | null;
  support_complexity_score: number | null;
  risk_score: number | null;
  notes: string | null;
  recommendation: Recommendation;
  decided_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const REQUEST_STATUSES: { value: RequestStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "researching", label: "Researching" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "sourced", label: "Sourced" },
  { value: "launched", label: "Launched" },
  { value: "revisit_later", label: "Revisit Later" },
];

export const REQUEST_SOURCES: { value: RequestSource; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "internal", label: "Internal" },
  { value: "other", label: "Other" },
];

export const REQUESTER_TYPES: { value: RequesterType; label: string }[] = [
  { value: "customer", label: "Customer" },
  { value: "team_member", label: "Team Member" },
  { value: "admin", label: "Admin" },
];

export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export const RESEARCH_STATUSES: { value: ResearchStatus; label: string }[] = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On Hold" },
];

export const RECOMMENDATIONS: { value: Recommendation; label: string }[] = [
  { value: "undecided", label: "Undecided" },
  { value: "approve", label: "Approve" },
  { value: "test_first", label: "Test First" },
  { value: "revisit_later", label: "Revisit Later" },
  { value: "reject", label: "Reject" },
];

export const REQUEST_STATUS_STYLE: Record<RequestStatus, string> = {
  new: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  researching: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  rejected: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  sourced: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  launched: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  revisit_later: "bg-muted/50 text-muted-foreground border-border/30",
};

export const RESEARCH_STATUS_STYLE: Record<ResearchStatus, string> = {
  not_started: "bg-muted/50 text-muted-foreground border-border/30",
  in_progress: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  on_hold: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

export const PRIORITY_STYLE: Record<Priority, string> = {
  low: "bg-muted/50 text-muted-foreground border-border/30",
  medium: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  high: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  urgent: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

export const RECOMMENDATION_STYLE: Record<Recommendation, string> = {
  undecided: "bg-muted/50 text-muted-foreground border-border/30",
  approve: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  test_first: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  revisit_later: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  reject: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

export function labelFor<T extends string>(opts: { value: T; label: string }[], v: T): string {
  return opts.find((o) => o.value === v)?.label ?? v;
}

const sb = supabase as any;

export async function listToolRequests(): Promise<ToolRequest[]> {
  const { data, error } = await sb.from("tool_requests").select("*").order("last_requested_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ToolRequest[];
}

export async function listResearchRecords(): Promise<ResearchRecord[]> {
  const { data, error } = await sb.from("research_records").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ResearchRecord[];
}

export async function listStaff(): Promise<{ user_id: string; full_name: string }[]> {
  const { data } = await sb.from("staff_profiles").select("user_id, full_name").eq("is_active", true).order("full_name");
  return (data ?? []) as { user_id: string; full_name: string }[];
}

export async function upsertToolRequest(payload: Partial<ToolRequest> & { tool_name: string }): Promise<ToolRequest> {
  if (payload.id) {
    const { data, error } = await sb.from("tool_requests").update(payload).eq("id", payload.id).select("*").maybeSingle();
    if (error) throw error;
    return data as ToolRequest;
  }
  const { data, error } = await sb.from("tool_requests").insert(payload).select("*").maybeSingle();
  if (error) throw error;
  return data as ToolRequest;
}

export async function incrementDemand(id: string, current: number): Promise<void> {
  const { error } = await sb.from("tool_requests").update({ demand_count: current + 1, last_requested_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function upsertResearch(payload: Partial<ResearchRecord> & { tool_name: string; created_by: string }): Promise<ResearchRecord> {
  if (payload.id) {
    const { data, error } = await sb.from("research_records").update(payload).eq("id", payload.id).select("*").maybeSingle();
    if (error) throw error;
    return data as ResearchRecord;
  }
  const { data, error } = await sb.from("research_records").insert(payload).select("*").maybeSingle();
  if (error) throw error;
  return data as ResearchRecord;
}

export function avgScore(r: ResearchRecord): number | null {
  const xs = [r.feasibility_score, r.demand_score, r.support_complexity_score == null ? null : 10 - r.support_complexity_score, r.risk_score == null ? null : 10 - r.risk_score].filter((v) => v != null) as number[];
  if (!xs.length) return null;
  return Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;
}
