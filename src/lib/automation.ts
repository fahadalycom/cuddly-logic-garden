import { supabase } from "@/integrations/supabase/client";

export type AutomationSetting = {
  id: string;
  key: string;
  enabled: boolean;
  description: string | null;
  category: string;
  updated_at: string;
};

export type AutomationLog = {
  id: string;
  rule_key: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  result: string;
  details: Record<string, unknown> | null;
  source: string;
  actor_id: string | null;
  created_at: string;
};

export async function listAutomationSettings(): Promise<AutomationSetting[]> {
  const { data, error } = await supabase
    .from("automation_settings")
    .select("*")
    .order("category")
    .order("key");
  if (error) throw error;
  return (data ?? []) as AutomationSetting[];
}

export async function setAutomationSetting(key: string, enabled: boolean) {
  const { error } = await supabase
    .from("automation_settings")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("key", key);
  if (error) throw error;
}

export async function listAutomationLogs(limit = 100): Promise<AutomationLog[]> {
  const { data, error } = await supabase
    .from("automation_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AutomationLog[];
}

export async function isAutomationEnabled(key: string): Promise<boolean> {
  const { data } = await supabase
    .from("automation_settings")
    .select("enabled")
    .eq("key", key)
    .maybeSingle();
  return data?.enabled ?? true;
}

// ───────── Heuristic suggestions (instant, no AI cost) ─────────

export type ConversationHints = {
  queue: "sales" | "support" | "payment" | "renewal" | "general";
  priority: "low" | "medium" | "high" | "urgent";
  next_action:
    | "send_product_info"
    | "create_order"
    | "create_ticket"
    | "transfer_to_payments"
    | "transfer_to_support"
    | "transfer_to_renewals"
    | "follow_up_later"
    | "request_payment_proof";
  reason: string;
  risks: string[];
};

const KW = {
  payment: ["paid", "payment", "transfer", "screenshot", "proof", "receipt", "raast", "bank", "easypaisa", "jazzcash"],
  support: ["not working", "broken", "error", "cant login", "can't login", "issue", "problem", "expired", "doesn't work", "complaint"],
  renewal: ["renew", "renewal", "extend", "expire", "expiring", "next month"],
  sales: ["price", "cost", "how much", "buy", "purchase", "interested", "available", "plan"],
  urgent: ["urgent", "asap", "immediately", "angry", "refund", "scam", "fake"],
};

export function deriveConversationHints(opts: {
  transcript: string;
  reassignmentCount?: number;
  hasUnresolvedTicket?: boolean;
  expiringSubscription?: boolean;
}): ConversationHints {
  const t = opts.transcript.toLowerCase();
  const has = (list: string[]) => list.some((w) => t.includes(w));

  let queue: ConversationHints["queue"] = "general";
  let next_action: ConversationHints["next_action"] = "follow_up_later";
  let reason = "Routed to general queue based on message content.";

  if (has(KW.payment)) {
    queue = "payment";
    next_action = "request_payment_proof";
    reason = "Payment-related keywords detected.";
  } else if (has(KW.support)) {
    queue = "support";
    next_action = "create_ticket";
    reason = "Issue/complaint keywords detected.";
  } else if (has(KW.renewal)) {
    queue = "renewal";
    next_action = "transfer_to_renewals";
    reason = "Renewal intent detected.";
  } else if (has(KW.sales)) {
    queue = "sales";
    next_action = "send_product_info";
    reason = "Pricing/purchase intent detected.";
  }

  let priority: ConversationHints["priority"] = "medium";
  if (has(KW.urgent) || (opts.reassignmentCount ?? 0) >= 2) priority = "urgent";
  else if (opts.hasUnresolvedTicket || opts.expiringSubscription) priority = "high";
  else if (queue === "general") priority = "low";

  const risks: string[] = [];
  if (has(KW.urgent)) risks.push("Angry / urgent language detected");
  if ((opts.reassignmentCount ?? 0) >= 2) risks.push(`Reassigned ${opts.reassignmentCount}× — risk of escalation`);
  if (opts.hasUnresolvedTicket) risks.push("Open support ticket linked to this conversation");
  if (opts.expiringSubscription) risks.push("Subscription expiring soon");

  return { queue, priority, next_action, reason, risks };
}

// ───────── AI call wrappers ─────────

type AIResp<T> = ({ ok: true } & T) | { ok: false; error: string; status?: number };

async function invokeAssist<T>(type: string, payload: unknown): Promise<AIResp<T>> {
  const { data, error } = await supabase.functions.invoke("ai-assist", { body: { type, payload } });
  if (error) return { ok: false, error: error.message };
  if (data?.error) {
    const msg = data.error === "rate_limited"
      ? "AI is rate-limited. Try again shortly."
      : data.error === "payment_required"
      ? "AI credits exhausted — top up in workspace settings."
      : data.error;
    return { ok: false, error: msg, status: data.status };
  }
  return { ok: true, ...(data as T) };
}

export const aiAssist = {
  classify: (payload: { transcript: string; customer_name?: string }) =>
    invokeAssist<{ result: ConversationHints }>("classify", payload),
  summarize: (payload: { target: "conversation" | "ticket" | "handoff"; context: string }) =>
    invokeAssist<{ summary: string }>("summarize", payload),
  rewriteTemplate: (payload: { template: string; transcript: string; customer_name?: string }) =>
    invokeAssist<{ reply: string }>("rewrite_template", payload),
  suggestReply: (payload: { transcript: string; customer_name?: string }) =>
    invokeAssist<{ reply: string }>("suggest_reply", payload),
};

// ───────── Cross-module risk highlights ─────────

export type SmartHighlight = {
  id: string;
  kind: "task" | "ticket" | "subscription" | "deal" | "request" | "conversation";
  severity: "info" | "warn" | "danger";
  title: string;
  detail: string;
  href?: string;
};

export async function loadSmartHighlights(): Promise<SmartHighlight[]> {
  const out: SmartHighlight[] = [];
  const today = new Date().toISOString();
  const sevenDays = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);

  // Overdue tasks
  const { data: overdueTasks } = await supabase
    .from("tasks")
    .select("id, title, due_date, status")
    .in("status", ["pending", "in_progress", "waiting", "overdue"])
    .lt("due_date", today)
    .order("due_date", { ascending: true })
    .limit(5);
  overdueTasks?.forEach((t) =>
    out.push({
      id: `task-${t.id}`,
      kind: "task",
      severity: "danger",
      title: `Overdue task: ${t.title}`,
      detail: `Due ${new Date(t.due_date!).toLocaleDateString()}`,
      href: "/tasks",
    })
  );

  // High-priority open tickets
  const { data: hotTickets } = await supabase
    .from("support_issues")
    .select("id, summary, ticket_number, priority")
    .in("status", ["open", "in_review", "waiting_internal", "waiting_customer", "reopened"])
    .in("priority", ["high", "urgent"])
    .limit(5);
  hotTickets?.forEach((t) =>
    out.push({
      id: `ticket-${t.id}`,
      kind: "ticket",
      severity: "danger",
      title: `${t.priority?.toUpperCase()} ticket ${t.ticket_number ?? ""}`,
      detail: t.summary ?? "Open ticket needs attention",
      href: "/support",
    })
  );

  // Subscriptions expiring soon
  const { data: expiring } = await supabase
    .from("subscriptions")
    .select("id, end_date, client_id, clients(name), products(name)")
    .eq("status", "active")
    .lte("end_date", sevenDays)
    .order("end_date", { ascending: true })
    .limit(5);
  expiring?.forEach((s: any) =>
    out.push({
      id: `sub-${s.id}`,
      kind: "subscription",
      severity: "warn",
      title: `Expiring: ${s.products?.name ?? "Subscription"}`,
      detail: `${s.clients?.name ?? "Client"} — ${s.end_date}`,
      href: "/renewals",
    })
  );

  // Vendor deals overdue follow-up
  const todayDate = new Date().toISOString().slice(0, 10);
  const { data: overdueDeals } = await supabase
    .from("vendor_deals")
    .select("id, title, follow_up_date, status")
    .in("status", ["new", "contacted", "in_negotiation"])
    .lt("follow_up_date", todayDate)
    .limit(5);
  overdueDeals?.forEach((d) =>
    out.push({
      id: `deal-${d.id}`,
      kind: "deal",
      severity: "warn",
      title: `Overdue follow-up: ${d.title}`,
      detail: `Was due ${d.follow_up_date}`,
      href: "/vendors",
    })
  );

  // High-demand tool requests with no research
  const { data: hotRequests } = await supabase
    .from("tool_requests")
    .select("id, tool_name, demand_count, status")
    .eq("status", "new")
    .gte("demand_count", 3)
    .limit(5);
  hotRequests?.forEach((r) =>
    out.push({
      id: `req-${r.id}`,
      kind: "request",
      severity: "info",
      title: `High demand: ${r.tool_name}`,
      detail: `${r.demand_count} requests — consider starting research`,
      href: "/research",
    })
  );

  return out;
}
