import { useEffect, useMemo, useState } from "react";
import {
  BarChart3, DollarSign, ShoppingCart, Users, MessageSquare, ListTodo, LifeBuoy,
  AlertTriangle, Clock, CalendarClock, Server, Handshake, TrendingUp, Inbox,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/analytics/KpiCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Line, LineChart, CartesianGrid, XAxis, YAxis, Bar, BarChart, Cell, Pie, PieChart, Legend,
} from "recharts";
import {
  loadFounderKpis, loadSalesKpis, loadConvKpis, loadTaskKpis, loadTicketKpis,
  loadAccountKpis, loadDealKpis, loadOrdersTimeseries,
  type DateRange, type FounderKpis, type SalesKpis, type ConvKpis,
  type TaskKpis, type TicketKpis, type AccountKpis, type DealKpis, type OrdersTimeseries,
} from "@/lib/analytics";

const STATUS_COLORS = ["hsl(var(--primary))", "hsl(45 93% 58%)", "hsl(160 84% 50%)", "hsl(0 84% 60%)", "hsl(220 90% 60%)", "hsl(280 70% 60%)"];

function fmtMoney(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(n);
}

export default function ReportsPage() {
  const [range, setRange] = useState<DateRange>("30d");
  const [loading, setLoading] = useState(true);
  const [founder, setFounder] = useState<FounderKpis | null>(null);
  const [sales, setSales] = useState<SalesKpis | null>(null);
  const [conv, setConv] = useState<ConvKpis | null>(null);
  const [tasks, setTasks] = useState<TaskKpis | null>(null);
  const [tickets, setTickets] = useState<TicketKpis | null>(null);
  const [accounts, setAccounts] = useState<AccountKpis | null>(null);
  const [deals, setDeals] = useState<DealKpis | null>(null);
  const [series, setSeries] = useState<OrdersTimeseries[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      loadFounderKpis(),
      loadSalesKpis(range),
      loadConvKpis(range),
      loadTaskKpis(range),
      loadTicketKpis(range),
      loadAccountKpis(),
      loadDealKpis(),
      loadOrdersTimeseries(range),
    ])
      .then(([f, s, c, t, k, a, d, ts]) => {
        if (cancelled) return;
        setFounder(f); setSales(s); setConv(c); setTasks(t); setTickets(k);
        setAccounts(a); setDeals(d); setSeries(ts);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [range]);

  const conversionRate = useMemo(() => {
    if (!sales || !sales.leads) return "—";
    return `${Math.round((sales.leadsConverted / sales.leads) * 100)}%`;
  }, [sales]);

  const taskBars = tasks?.byStatus ?? [];
  const ticketPie = tickets?.byStatus ?? [];

  const ranges: { key: DateRange; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "7d", label: "7 days" },
    { key: "30d", label: "30 days" },
    { key: "90d", label: "90 days" },
  ];

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="Real-time KPIs, workload, and operational insights"
        icon={<BarChart3 className="h-5 w-5 text-primary-foreground" />}
        actions={
          <div className="flex items-center gap-1 p-1 rounded-xl border border-border/40 bg-card/40">
            {ranges.map((r) => (
              <Button
                key={r.key}
                size="sm"
                variant={range === r.key ? "default" : "ghost"}
                className="h-8 text-xs"
                onClick={() => setRange(r.key)}
              >
                {r.label}
              </Button>
            ))}
          </div>
        }
      />

      {/* Alerts */}
      {founder && (founder.overdueTasks > 0 || founder.unresolvedTickets > 0 || founder.expiringAccounts > 0 || founder.overflowQueue > 0) && (
        <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {founder.overdueTasks > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
              <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />
              <div className="text-xs"><span className="font-bold text-rose-300">{founder.overdueTasks}</span> overdue tasks</div>
            </div>
          )}
          {founder.unresolvedTickets > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
              <LifeBuoy className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <div className="text-xs"><span className="font-bold text-amber-300">{founder.unresolvedTickets}</span> open tickets</div>
            </div>
          )}
          {founder.expiringAccounts > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
              <CalendarClock className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <div className="text-xs"><span className="font-bold text-amber-300">{founder.expiringAccounts}</span> expiring in 7d</div>
            </div>
          )}
          {founder.overflowQueue > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
              <Inbox className="h-4 w-4 text-rose-400 flex-shrink-0" />
              <div className="text-xs"><span className="font-bold text-rose-300">{founder.overflowQueue}</span> in overflow queue</div>
            </div>
          )}
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList className="mb-5 flex flex-wrap h-auto bg-card/40 border border-border/40 rounded-xl p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <KpiCard label="Orders Today" value={founder?.ordersToday ?? 0} icon={ShoppingCart} tone="neutral" loading={loading} />
            <KpiCard label="Revenue Today" value={fmtMoney(founder?.revenueToday ?? 0)} icon={DollarSign} tone="good" loading={loading} />
            <KpiCard label="Revenue (Month)" value={fmtMoney(founder?.revenueMonth ?? 0)} icon={TrendingUp} tone="good" loading={loading} />
            <KpiCard label="Conversion" value={conversionRate} icon={Users} tone="neutral" hint="Leads → clients" loading={loading} />
            <KpiCard label="Active Chats" value={founder?.activeConversations ?? 0} icon={MessageSquare} tone="neutral" loading={loading} />
            <KpiCard label="Pending Orders" value={founder?.pendingOrders ?? 0} icon={ShoppingCart} tone="warning" loading={loading} />
            <KpiCard label="Tasks Pending" value={founder?.tasksPending ?? 0} icon={ListTodo} tone="warning" loading={loading} />
            <KpiCard label="Tickets Open" value={founder?.ticketsOpen ?? 0} icon={LifeBuoy} tone="warning" loading={loading} />
          </div>

          <div className="rounded-2xl border border-border/40 bg-card/50 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Orders & Revenue Trend</h3>
              <span className="text-xs text-muted-foreground/60">Last {range}</span>
            </div>
            <ChartContainer
              config={{
                orders: { label: "Orders", color: "hsl(var(--primary))" },
                revenue: { label: "Revenue", color: "hsl(160 84% 50%)" },
              }}
              className="h-[260px] w-full"
            >
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line yAxisId="left" type="monotone" dataKey="orders" stroke="var(--color-orders)" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </div>
        </TabsContent>

        {/* SALES */}
        <TabsContent value="sales" className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Leads" value={sales?.leads ?? 0} icon={Users} loading={loading} />
            <KpiCard label="Converted" value={sales?.leadsConverted ?? 0} icon={TrendingUp} tone="good" loading={loading} />
            <KpiCard label="Orders Created" value={sales?.ordersCreated ?? 0} icon={ShoppingCart} loading={loading} />
            <KpiCard label="Avg Order Value" value={fmtMoney(sales?.avgOrderValue ?? 0)} icon={DollarSign} tone="good" loading={loading} />
          </div>
          <div className="rounded-2xl border border-border/40 bg-card/50 p-5">
            <h3 className="text-sm font-semibold mb-4">Top Products</h3>
            {sales?.topProducts.length ? (
              <ul className="space-y-2">
                {sales.topProducts.map((p, i) => (
                  <li key={p.name} className="flex items-center justify-between text-sm py-2 border-b border-border/30 last:border-0">
                    <span className="flex items-center gap-3">
                      <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
                      <span>{p.name}</span>
                    </span>
                    <span className="text-muted-foreground tabular-nums">{p.count} sold</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground/60">No sales data in this range.</p>
            )}
          </div>
        </TabsContent>

        {/* CONVERSATIONS */}
        <TabsContent value="conversations" className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <KpiCard label="Total" value={conv?.total ?? 0} icon={MessageSquare} loading={loading} />
            <KpiCard label="Active" value={conv?.active ?? 0} icon={MessageSquare} tone="good" loading={loading} />
            <KpiCard label="Waiting" value={conv?.waiting ?? 0} icon={Clock} tone="warning" loading={loading} />
            <KpiCard label="Resolved" value={conv?.resolved ?? 0} icon={MessageSquare} tone="good" loading={loading} />
            <KpiCard label="High Priority" value={conv?.highPriority ?? 0} icon={AlertTriangle} tone="bad" loading={loading} />
          </div>
        </TabsContent>

        {/* TASKS */}
        <TabsContent value="tasks" className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Total" value={tasks?.total ?? 0} icon={ListTodo} loading={loading} />
            <KpiCard label="Pending" value={tasks?.pending ?? 0} icon={Clock} tone="warning" loading={loading} />
            <KpiCard label="Overdue" value={tasks?.overdue ?? 0} icon={AlertTriangle} tone="bad" loading={loading} />
            <KpiCard label="Done Today" value={tasks?.completedToday ?? 0} icon={ListTodo} tone="good" loading={loading} />
          </div>
          <div className="rounded-2xl border border-border/40 bg-card/50 p-5">
            <h3 className="text-sm font-semibold mb-4">Tasks by Status</h3>
            <ChartContainer
              config={{ count: { label: "Tasks", color: "hsl(var(--primary))" } }}
              className="h-[240px] w-full"
            >
              <BarChart data={taskBars}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {taskBars.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        </TabsContent>

        {/* SUPPORT */}
        <TabsContent value="support" className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Total Tickets" value={tickets?.total ?? 0} icon={LifeBuoy} loading={loading} />
            <KpiCard label="Open" value={tickets?.open ?? 0} icon={Clock} tone="warning" loading={loading} />
            <KpiCard label="Resolved" value={tickets?.resolved ?? 0} icon={LifeBuoy} tone="good" loading={loading} />
            <KpiCard label="High Priority" value={tickets?.highPriority ?? 0} icon={AlertTriangle} tone="bad" loading={loading} />
          </div>
          <div className="rounded-2xl border border-border/40 bg-card/50 p-5">
            <h3 className="text-sm font-semibold mb-4">Ticket Status Distribution</h3>
            {ticketPie.length ? (
              <ChartContainer config={{}} className="h-[260px] w-full">
                <PieChart>
                  <Pie data={ticketPie} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={90} label>
                    {ticketPie.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <p className="text-xs text-muted-foreground/60">No ticket data in this range.</p>
            )}
          </div>
        </TabsContent>

        {/* ACCOUNTS */}
        <TabsContent value="accounts" className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Total Accounts" value={accounts?.total ?? 0} icon={Server} loading={loading} />
            <KpiCard label="Available" value={accounts?.active ?? 0} icon={Server} tone="good" loading={loading} />
            <KpiCard label="Full Capacity" value={accounts?.full ?? 0} icon={AlertTriangle} tone="warning" loading={loading} />
            <KpiCard label="Expiring (7d)" value={accounts?.expiringSoon ?? 0} icon={CalendarClock} tone="bad" loading={loading} />
          </div>
        </TabsContent>

        {/* VENDORS */}
        <TabsContent value="vendors" className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Active Deals" value={deals?.active ?? 0} icon={Handshake} loading={loading} />
            <KpiCard label="In Negotiation" value={deals?.inNegotiation ?? 0} icon={Handshake} tone="warning" loading={loading} />
            <KpiCard label="Closed (Agreed)" value={deals?.closed ?? 0} icon={Handshake} tone="good" loading={loading} />
            <KpiCard label="Follow-ups Due" value={deals?.followUpsDue ?? 0} icon={CalendarClock} tone="bad" loading={loading} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
