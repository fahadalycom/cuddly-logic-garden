// Support ticket helpers — types, labels, and styling

export type TicketStatus =
  | "open"
  | "in_progress"
  | "waiting_customer"
  | "waiting_internal"
  | "resolved"
  | "closed"
  | "reopened";

export type TicketPriority = "low" | "medium" | "high" | "urgent";

export type IssueType =
  | "login_issue"
  | "access_issue"
  | "wrong_plan"
  | "payment_issue"
  | "renewal_issue"
  | "account_problem"
  | "product_not_working"
  | "replacement_request"
  | "refund_request"
  | "general_support"
  | "other";

export const ISSUE_TYPES: { value: IssueType; label: string }[] = [
  { value: "login_issue", label: "Login Issue" },
  { value: "access_issue", label: "Access Issue" },
  { value: "wrong_plan", label: "Wrong Plan" },
  { value: "payment_issue", label: "Payment Issue" },
  { value: "renewal_issue", label: "Renewal Issue" },
  { value: "account_problem", label: "Account Problem" },
  { value: "product_not_working", label: "Product Not Working" },
  { value: "replacement_request", label: "Replacement Request" },
  { value: "refund_request", label: "Refund Request" },
  { value: "general_support", label: "General Support" },
  { value: "other", label: "Other" },
];

export const TICKET_STATUSES: { value: TicketStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_customer", label: "Waiting on Customer" },
  { value: "waiting_internal", label: "Waiting Internal" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
  { value: "reopened", label: "Reopened" },
];

export const TICKET_PRIORITIES: { value: TicketPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export const STATUS_STYLE: Record<TicketStatus, string> = {
  open: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  in_progress: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  waiting_customer: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  waiting_internal: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  resolved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  closed: "bg-muted/40 text-muted-foreground border-border/40",
  reopened: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

export const PRIORITY_STYLE: Record<TicketPriority, string> = {
  low: "bg-muted/40 text-muted-foreground border-border/40",
  medium: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  high: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  urgent: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

export function labelFor<T extends { value: string; label: string }>(
  list: T[],
  value: string,
): string {
  return list.find((x) => x.value === value)?.label ?? value;
}

export interface TicketRow {
  id: string;
  ticket_number: string | null;
  customer_name?: string | null;
  client_id: string | null;
  conversation_id: string | null;
  order_id: string | null;
  assigned_to: string | null;
  created_by: string | null;
  issue_type_v2: IssueType;
  summary: string | null;
  description: string;
  internal_notes: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
}

export interface TicketActivity {
  id: string;
  ticket_id: string;
  actor_id: string | null;
  event_type: string;
  from_value: string | null;
  to_value: string | null;
  note: string | null;
  created_at: string;
}
