import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LoadingState } from "@/components/shared/PageStates";
import { formatCurrency } from "@/lib/template-engine";
import { BarChart3, TrendingUp, Users, ShoppingCart, DollarSign, Package } from "lucide-react";

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [orders, clients, subs, products, delivered] = await Promise.all([
        supabase.from("orders").select("total_amount, status"),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("is_archived", false),
        supabase.from("subscriptions").select("id, status"),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("orders").select("total_amount").eq("status", "delivered"),
      ]);

      const totalRevenue = (delivered.data || []).reduce((s, o) => s + Number(o.total_amount), 0);
      const allOrders = orders.data || [];
      const activeSubs = (subs.data || []).filter(s => s.status === "active").length;

      setStats({
        totalRevenue,
        totalOrders: allOrders.length,
        totalClients: clients.count || 0,
        totalProducts: products.count || 0,
        activeSubs,
        avgOrderValue: allOrders.length ? totalRevenue / (delivered.data || []).length : 0,
      });
      setLoading(false);
    };
    fetch();
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
    </div>
  );
}
