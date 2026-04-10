import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LoadingState } from "@/components/shared/PageStates";
import { formatCurrency } from "@/lib/template-engine";
import { BarChart3, TrendingUp, Users, ShoppingCart, DollarSign, Package } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const COLORS = ["hsl(38 92% 50%)", "hsl(142 71% 45%)", "hsl(199 89% 48%)", "hsl(262 83% 58%)", "hsl(0 72% 51%)", "hsl(25 95% 53%)"];

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<any[]>([]);
  const [subsByStatus, setSubsByStatus] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      const [orders, clients, subs, products, delivered, orderItems] = await Promise.all([
        supabase.from("orders").select("total_amount, status, created_at"),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("is_archived", false),
        supabase.from("subscriptions").select("id, status"),
        supabase.from("products").select("id, name", { count: "exact" }).eq("is_active", true),
        supabase.from("orders").select("total_amount").eq("status", "delivered"),
        supabase.from("order_items").select("product_id, line_total, products(name)"),
      ]);

      const totalRevenue = (delivered.data || []).reduce((s, o) => s + Number(o.total_amount), 0);
      const allOrders = orders.data || [];
      const activeSubs = (subs.data || []).filter(s => s.status === "active").length;

      setStats({
        totalRevenue, totalOrders: allOrders.length, totalClients: clients.count || 0,
        totalProducts: products.count || 0, activeSubs,
        avgOrderValue: (delivered.data || []).length ? totalRevenue / (delivered.data || []).length : 0,
      });

      // Revenue by month
      const monthlyRev: Record<string, number> = {};
      allOrders.forEach(o => {
        const month = new Date(o.created_at).toISOString().slice(0, 7);
        monthlyRev[month] = (monthlyRev[month] || 0) + Number(o.total_amount);
      });
      const sorted = Object.entries(monthlyRev).sort(([a], [b]) => a.localeCompare(b)).slice(-12);
      setRevenueData(sorted.map(([month, revenue]) => ({ month: month.slice(2), revenue })));

      // Orders by status
      const statusCount: Record<string, number> = {};
      allOrders.forEach(o => { statusCount[o.status] = (statusCount[o.status] || 0) + 1; });
      setOrdersByStatus(Object.entries(statusCount).map(([name, value]) => ({ name: name.replace(/_/g, " "), value })));

      // Subs by status
      const subCount: Record<string, number> = {};
      (subs.data || []).forEach(s => { subCount[s.status] = (subCount[s.status] || 0) + 1; });
      setSubsByStatus(Object.entries(subCount).map(([name, value]) => ({ name: name.replace(/_/g, " "), value })));

      // Top products
      const productRev: Record<string, { name: string; revenue: number; count: number }> = {};
      (orderItems.data as any[] || []).forEach((item: any) => {
        const name = item.products?.name || "Unknown";
        if (!productRev[item.product_id]) productRev[item.product_id] = { name, revenue: 0, count: 0 };
        productRev[item.product_id].revenue += Number(item.line_total);
        productRev[item.product_id].count++;
      });
      setTopProducts(Object.values(productRev).sort((a, b) => b.revenue - a.revenue).slice(0, 5));

      setLoading(false);
    };
    fetchAll();
  }, []);

  if (loading) return <LoadingState />;

  const metrics = [
    { label: "Total Revenue", value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/8" },
    { label: "Total Orders", value: stats.totalOrders, icon: ShoppingCart, color: "text-blue-400", bg: "bg-blue-500/8" },
    { label: "Active Clients", value: stats.totalClients, icon: Users, color: "text-purple-400", bg: "bg-purple-500/8" },
    { label: "Active Subscriptions", value: stats.activeSubs, icon: TrendingUp, color: "text-amber-400", bg: "bg-amber-500/8" },
    { label: "Products", value: stats.totalProducts, icon: Package, color: "text-indigo-400", bg: "bg-indigo-500/8" },
    { label: "Avg Order Value", value: formatCurrency(stats.avgOrderValue), icon: BarChart3, color: "text-rose-400", bg: "bg-rose-500/8" },
  ];

  const tooltipStyle = { background: "hsl(228 16% 10%)", border: "1px solid hsl(225 14% 16%)", borderRadius: "12px", fontSize: "12px", color: "hsl(210 40% 98%)" };

  return (
    <div className="space-y-8">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><BarChart3 className="h-6 w-6 text-primary" />Analytics</h1>
        <p className="page-subtitle">Business performance overview</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
        {metrics.map((m) => (
          <div key={m.label} className="premium-card group">
            <div className="flex items-start justify-between mb-4">
              <div className={`h-12 w-12 rounded-xl ${m.bg} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                <m.icon className={`h-6 w-6 ${m.color}`} />
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight text-foreground leading-none">{m.value}</p>
            <p className="text-[11px] font-medium text-muted-foreground mt-2 uppercase tracking-wider">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="premium-card !p-6">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Monthly Revenue</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="analyticsRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(38 92% 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(38 92% 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 14% 14%)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(215 20% 55%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(215 20% 55%)" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatCurrency(value), "Revenue"]} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(38 92% 50%)" strokeWidth={2} fill="url(#analyticsRevGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="premium-card !p-6">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Orders by Status</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ordersByStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 14% 14%)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(215 20% 55%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(215 20% 55%)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill="hsl(38 92% 50%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="premium-card !p-6">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Subscription Status</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={subsByStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {subsByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {subsByStatus.map((s, i) => (
              <span key={s.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="capitalize">{s.name}</span> <span className="font-semibold text-foreground">({s.value})</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className="premium-card !p-6">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Top Products by Revenue</h3>
        <div className="space-y-3">
          {topProducts.map((p, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className="text-xs font-bold text-primary w-6 text-center">#{i + 1}</span>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-foreground">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{p.count} orders</span>
                </div>
                <div className="h-2 rounded-full bg-secondary/40 overflow-hidden">
                  <div className="h-full rounded-full gradient-primary transition-all duration-500" style={{ width: `${(p.revenue / (topProducts[0]?.revenue || 1)) * 100}%` }} />
                </div>
              </div>
              <span className="mono text-sm font-semibold text-foreground w-24 text-right">{formatCurrency(p.revenue)}</span>
            </div>
          ))}
          {topProducts.length === 0 && <p className="text-sm text-muted-foreground">No product data yet</p>}
        </div>
      </div>
    </div>
  );
}
