import { supabase } from "@/integrations/supabase/client";

export type DateRange = "today" | "7d" | "30d" | "90d";

export function rangeStart(range: DateRange): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (range === "today") return d;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  d.setDate(d.getDate() - days);
  return d;
}

export interface FounderKpis {
  ordersToday: number;
  revenueToday: number;
  revenueMonth: number;
  activeConversations: number;
  pendingOrders: number;
  tasksPending: number;
  ticketsOpen: number;
  overdueTasks: number;
  unresolvedTickets: number;
  expiringAccounts: number;
  overflowQueue: number;
}

export interface SalesKpis {
  leads: number;
  leadsConverted: number;
  ordersCreated: number;
  avgOrderValue: number;
  topProducts: { name: string; count: number }[];
}

export interface ConvKpis {
  total: number;
  active: number;
  waiting: number;
  resolved: number;
  highPriority: number;
}

export interface TaskKpis {
  total: number;
  pending: number;
  overdue: number;
  completedToday: number;
  byStatus: { status: string; count: number }[];
}

export interface TicketKpis {
  total: number;
  open: number;
  resolved: number;
  highPriority: number;
  byStatus: { status: string; count: number }[];
}

export interface AccountKpis {
  total: number;
  active: number;
  full: number;
  expiringSoon: number;
}

export interface DealKpis {
  active: number;
  inNegotiation: number;
  closed: number;
  followUpsDue: number;
}

export interface OrdersTimeseries {
  date: string;
  orders: number;
  revenue: number;
}

async function count(table: string, filters: (q: any) => any = (q) => q): Promise<number> {
  const q = filters((supabase as any).from(table).select("*", { count: "exact", head: true }));
  const { count: c } = await q;
  return c ?? 0;
}

export async function loadFounderKpis(): Promise<FounderKpis> {
  const startToday = rangeStart("today").toISOString();
  const startMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const in7d = new Date(); in7d.setDate(in7d.getDate() + 7);

  const [
    ordersTodayRes,
    revTodayRes,
    revMonthRes,
    activeConvs,
    pendingOrders,
    tasksPending,
    ticketsOpen,
    overdueTasks,
    unresolvedTickets,
    expiringAccounts,
    overflowQueue,
  ] = await Promise.all([
    (supabase as any).from("orders").select("id, total_amount", { count: "exact" }).gte("created_at", startToday),
    (supabase as any).from("orders").select("total_amount").gte("created_at", startToday).eq("payment_status", "paid"),
    (supabase as any).from("orders").select("total_amount").gte("created_at", startMonth).eq("payment_status", "paid"),
    count("wa_conversations", (q) => q.in("status", ["active", "waiting"])),
    count("orders", (q) => q.in("payment_status", ["unpaid", "pending_verification"])),
    count("tasks", (q) => q.in("status", ["pending", "in_progress", "waiting"])),
    count("support_issues", (q) => q.in("status", ["open", "in_progress", "waiting_internal"])),
    count("tasks", (q) => q.eq("status", "overdue")),
    count("support_issues", (q) => q.not("status", "in", "(resolved,closed)")),
    count("subscriptions", (q) => q.lte("end_date", in7d.toISOString().slice(0, 10)).eq("status", "active")),
    count("wa_queue", (q) => q.eq("queue_type", "overflow").eq("status", "waiting")),
  ]);

  const sum = (rows: any[] | null) => (rows ?? []).reduce((a, r) => a + Number(r.total_amount || 0), 0);

  return {
    ordersToday: ordersTodayRes.count ?? 0,
    revenueToday: sum(revTodayRes.data as any[]),
    revenueMonth: sum(revMonthRes.data as any[]),
    activeConversations: activeConvs,
    pendingOrders,
    tasksPending,
    ticketsOpen,
    overdueTasks,
    unresolvedTickets,
    expiringAccounts,
    overflowQueue,
  };
}

export async function loadSalesKpis(range: DateRange): Promise<SalesKpis> {
  const start = rangeStart(range).toISOString();
  const [leadsRes, convertedRes, ordersRes, itemsRes] = await Promise.all([
    (supabase as any).from("leads").select("id", { count: "exact", head: true }).gte("created_at", start),
    (supabase as any).from("leads").select("id", { count: "exact", head: true }).gte("created_at", start).not("converted_client_id", "is", null),
    (supabase as any).from("orders").select("total_amount").gte("created_at", start),
    (supabase as any).from("order_items").select("product_name").gte("created_at", start),
  ]);
  const orders = (ordersRes.data ?? []) as any[];
  const totalRev = orders.reduce((a, r) => a + Number(r.total_amount || 0), 0);
  const counts: Record<string, number> = {};
  for (const it of (itemsRes.data ?? []) as any[]) {
    const k = it.product_name || "Unknown";
    counts[k] = (counts[k] || 0) + 1;
  }
  const topProducts = Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  return {
    leads: leadsRes.count ?? 0,
    leadsConverted: convertedRes.count ?? 0,
    ordersCreated: orders.length,
    avgOrderValue: orders.length ? Math.round(totalRev / orders.length) : 0,
    topProducts,
  };
}

export async function loadConvKpis(range: DateRange): Promise<ConvKpis> {
  const start = rangeStart(range).toISOString();
  const [total, active, waiting, resolved, high] = await Promise.all([
    count("wa_conversations", (q) => q.gte("created_at", start)),
    count("wa_conversations", (q) => q.eq("status", "active")),
    count("wa_conversations", (q) => q.eq("status", "waiting")),
    count("wa_conversations", (q) => q.eq("status", "resolved").gte("updated_at", start)),
    count("wa_conversations", (q) => q.in("priority", ["high", "urgent"])),
  ]);
  return { total, active, waiting, resolved, highPriority: high };
}

export async function loadTaskKpis(range: DateRange): Promise<TaskKpis> {
  const start = rangeStart(range).toISOString();
  const startToday = rangeStart("today").toISOString();
  const [{ data: all }, completedTodayRes] = await Promise.all([
    (supabase as any).from("tasks").select("status").gte("created_at", start),
    (supabase as any).from("tasks").select("id", { count: "exact", head: true }).eq("status", "done").gte("completed_at", startToday),
  ]);
  const rows = (all ?? []) as { status: string }[];
  const byStatus: Record<string, number> = {};
  for (const r of rows) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  return {
    total: rows.length,
    pending: (byStatus.pending || 0) + (byStatus.in_progress || 0) + (byStatus.waiting || 0),
    overdue: byStatus.overdue || 0,
    completedToday: completedTodayRes.count ?? 0,
    byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
  };
}

export async function loadTicketKpis(range: DateRange): Promise<TicketKpis> {
  const start = rangeStart(range).toISOString();
  const { data } = await (supabase as any).from("support_issues").select("status, priority").gte("created_at", start);
  const rows = (data ?? []) as { status: string; priority: string }[];
  const byStatus: Record<string, number> = {};
  for (const r of rows) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  return {
    total: rows.length,
    open: (byStatus.open || 0) + (byStatus.in_progress || 0) + (byStatus.waiting_internal || 0),
    resolved: (byStatus.resolved || 0) + (byStatus.closed || 0),
    highPriority: rows.filter((r) => r.priority === "high" || r.priority === "urgent").length,
    byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
  };
}

export async function loadAccountKpis(): Promise<AccountKpis> {
  const in7d = new Date(); in7d.setDate(in7d.getDate() + 7);
  const [total, active, full, expiringSubs] = await Promise.all([
    count("software_accounts", (q) => q.eq("is_archived", false)),
    count("software_accounts", (q) => q.eq("status", "available")),
    count("software_accounts", (q) => q.eq("status", "full")),
    count("subscriptions", (q) => q.eq("status", "active").lte("end_date", in7d.toISOString().slice(0, 10))),
  ]);
  return { total, active, full, expiringSoon: expiringSubs };
}

export async function loadDealKpis(): Promise<DealKpis> {
  const today = new Date().toISOString().slice(0, 10);
  const [active, neg, closed, followUps] = await Promise.all([
    count("vendor_deals", (q) => q.in("status", ["new", "contacted", "in_negotiation"])),
    count("vendor_deals", (q) => q.eq("status", "in_negotiation")),
    count("vendor_deals", (q) => q.eq("status", "agreed")),
    count("vendor_deals", (q) => q.lte("follow_up_date", today).not("follow_up_date", "is", null).not("status", "in", "(agreed,rejected,expired)")),
  ]);
  return { active, inNegotiation: neg, closed, followUpsDue: followUps };
}

export async function loadOrdersTimeseries(range: DateRange): Promise<OrdersTimeseries[]> {
  const start = rangeStart(range);
  const { data } = await (supabase as any)
    .from("orders")
    .select("created_at, total_amount, payment_status")
    .gte("created_at", start.toISOString());
  const buckets: Record<string, { orders: number; revenue: number }> = {};
  const days = range === "today" ? 1 : range === "7d" ? 7 : range === "30d" ? 30 : 90;
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    buckets[d.toISOString().slice(0, 10)] = { orders: 0, revenue: 0 };
  }
  for (const r of (data ?? []) as any[]) {
    const k = new Date(r.created_at).toISOString().slice(0, 10);
    if (!buckets[k]) buckets[k] = { orders: 0, revenue: 0 };
    buckets[k].orders += 1;
    if (r.payment_status === "paid") buckets[k].revenue += Number(r.total_amount || 0);
  }
  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date: date.slice(5), orders: v.orders, revenue: v.revenue }));
}
