import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  ShoppingCart, Users, Package, CreditCard, RefreshCw, AlertTriangle, TrendingUp, Clock,
  ArrowUpRight, ArrowDownRight, Zap, ChevronRight
} from "lucide-react";
import { LoadingState } from "@/components/shared/PageStates";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/template-engine";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface DashboardStats {
  totalOrders: number;
  pendingPayments: number;
  toDeliver: number;
  totalClients: number;
  activeSubscriptions: number;
  expiringSoon: number;
  totalProducts: number;
  inventoryAlerts: number;
}

const statConfig = [
  { title: "Total Orders", key: "totalOrders" as const, icon: ShoppingCart, bg: "bg-blue-500/8", iconColor: "text-blue-400", trend: "+12%", trendUp: true },
  { title: "Pending Verification", key: "pendingPayments" as const, icon: CreditCard, bg: "bg-amber-500/8", iconColor: "text-amber-400", trend: "3 new", trendUp: false },
  { title: "To Deliver", key: "toDeliver" as const, icon: Clock, bg: "bg-purple-500/8", iconColor: "text-purple-400", trend: "2 today", trendUp: true },
  { title: "Total Clients", key: "totalClients" as const, icon: Users, bg: "bg-emerald-500/8", iconColor: "text-emerald-400", trend: "+5%", trendUp: true },
  { title: "Active Subs", key: "activeSubscriptions" as const, icon: TrendingUp, bg: "bg-green-500/8", iconColor: "text-green-400", trend: "+8%", trendUp: true },
  { title: "Expiring Soon", key: "expiringSoon" as const, icon: RefreshCw, bg: "bg-orange-500/8", iconColor: "text-orange-400", trend: "Action", trendUp: false },
  { title: "Products", key: "totalProducts" as const, icon: Package, bg: "bg-indigo-500/8", iconColor: "text-indigo-400", trend: "Stable", trendUp: true },
  { title: "Inventory", key: "inventoryAlerts" as const, icon: AlertTriangle, bg: "bg-rose-500/8", iconColor: "text-rose-400", trend: "In stock", trendUp: true },
];

const PIE_COLORS = ["hsl(38 92% 50%)", "hsl(142 71% 45%)", "hsl(199 89% 48%)", "hsl(262 83% 58%)", "hsl(0 72% 51%)", "hsl(215 20% 65%)", "hsl(25 95% 53%)"];

export default function DashboardPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<{ date: string; revenue: number }[]>([]);
  const [orderStatusData, setOrderStatusData] = useState<{ name: string; value: number }[]>([]);
  const [recentActivity, setRecentActivity] = useState<{ id: string; action: string; entity_type: string; created_at: string; details: any }[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      const [orders, pendingPay, toDeliver, clients, activeSubs, expiring, products, inventory] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "paid_unverified"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "to_deliver"),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("is_archived", false),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "expiring"),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("software_accounts").select("id", { count: "exact", head: true }).eq("status", "available"),
      ]);
      setStats({
        totalOrders: orders.count || 0, pendingPayments: pendingPay.count || 0,
        toDeliver: toDeliver.count || 0, totalClients: clients.count || 0,
        activeSubscriptions: activeSubs.count || 0, expiringSoon: expiring.count || 0,
        totalProducts: products.count || 0, inventoryAlerts: inventory.count || 0,
      });

      // Revenue trend (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: deliveredOrders } = await supabase.from("orders").select("total_amount, updated_at").eq("status", "delivered").gte("updated_at", thirtyDaysAgo);
      const revenueByDay: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        revenueByDay[d.toISOString().slice(0, 10)] = 0;
      }
      (deliveredOrders || []).forEach(o => {
        const day = new Date(o.updated_at).toISOString().slice(0, 10);
        if (revenueByDay[day] !== undefined) revenueByDay[day] += Number(o.total_amount);
      });
      setRevenueData(Object.entries(revenueByDay).map(([date, revenue]) => ({ date: date.slice(5), revenue })));

      // Order status breakdown
      const { data: allOrders } = await supabase.from("orders").select("status");
      const statusCounts: Record<string, number> = {};
      (allOrders || []).forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });
      setOrderStatusData(Object.entries(statusCounts).map(([name, value]) => ({ name: name.replace(/_/g, " "), value })));

      // Recent activity
      const { data: logs } = await supabase.from("order_status_history").select("*").order("created_at", { ascending: false }).limit(8);
      setRecentActivity((logs || []).map(l => ({ id: l.id, action: `${l.from_status || "new"} → ${l.to_status}`, entity_type: "order", created_at: l.created_at, details: { order_id: l.order_id } })));

      setLoading(false);
    };
    fetchAll();
  }, []);

  if (loading) return <LoadingState />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl gradient-primary p-8 md:p-10 glow-primary">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/5 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-5 w-5 text-white/90" />
            <span className="text-xs font-semibold text-white/75 uppercase tracking-[0.2em]">Dashboard</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{greeting}, {profile?.full_name?.split(' ')[0]}</h1>
          <p className="text-white/72 text-sm mt-2 max-w-md">Track orders, manage clients, and monitor your subscription inventory.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
        {statConfig.map((card) => (
          <div key={card.title} className="premium-card group cursor-default">
            <div className="flex items-start justify-between mb-5">
              <div className={`h-11 w-11 rounded-xl ${card.bg} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
              <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full ${card.trendUp ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                {card.trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {card.trend}
              </span>
            </div>
            <p className="text-3xl font-bold tracking-tight text-foreground leading-none">{stats?.[card.key] ?? 0}</p>
            <p className="text-[11px] font-medium text-muted-foreground mt-2 uppercase tracking-wider">{card.title}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 premium-card !p-6">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Revenue Trend (30 Days)</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(38 92% 50%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(38 92% 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(215 20% 55%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(215 20% 55%)" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip contentStyle={{ background: "hsl(228 16% 10%)", border: "1px solid hsl(225 14% 16%)", borderRadius: "12px", fontSize: "12px", color: "hsl(210 40% 98%)" }}
                  formatter={(value: number) => [formatCurrency(value), "Revenue"]} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(38 92% 50%)" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 premium-card !p-6">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Order Status</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {orderStatusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(228 16% 10%)", border: "1px solid hsl(225 14% 16%)", borderRadius: "12px", fontSize: "12px", color: "hsl(210 40% 98%)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {orderStatusData.map((s, i) => (
              <span key={s.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="capitalize">{s.name}</span>
                <span className="font-semibold text-foreground">({s.value})</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="premium-card !p-6">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Recent Activity</h3>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map(a => (
              <div key={a.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-secondary/20 border border-border/15">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-sm text-foreground capitalize">{a.action.replace(/_/g, " ")}</span>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground/75 uppercase tracking-[0.2em] mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "New Order", icon: ShoppingCart, href: "/orders/new", color: "text-blue-400" },
            { label: "All Clients", icon: Users, href: "/clients", color: "text-emerald-400" },
            { label: "Inventory", icon: Package, href: "/inventory", color: "text-purple-400" },
            { label: "Analytics", icon: TrendingUp, href: "/analytics", color: "text-amber-400" },
          ].map((action) => (
            <button key={action.label} onClick={() => navigate(action.href)}
              className="flex items-center justify-between p-4 rounded-2xl bg-card/40 border border-border/20 hover:bg-card/70 hover:border-border/40 transition-all duration-300 group text-left">
              <div className="flex items-center gap-3">
                <action.icon className={`h-5 w-5 ${action.color} transition-transform duration-300 group-hover:scale-110`} />
                <span className="text-sm font-medium text-foreground/85 group-hover:text-foreground transition-colors">{action.label}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/55 group-hover:translate-x-0.5 transition-all duration-300" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
