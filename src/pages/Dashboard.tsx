import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  ShoppingCart, Users, Package, CreditCard, RefreshCw, AlertTriangle, TrendingUp, Clock,
  ArrowUpRight, ArrowDownRight, Zap, ChevronRight
} from "lucide-react";
import { LoadingState } from "@/components/shared/PageStates";
import { useNavigate } from "react-router-dom";

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
  { title: "Total Orders", key: "totalOrders" as const, icon: ShoppingCart, color: "from-blue-500 to-blue-600", bg: "bg-blue-500/8", iconColor: "text-blue-400", trend: "+12%", trendUp: true },
  { title: "Pending Verification", key: "pendingPayments" as const, icon: CreditCard, color: "from-amber-500 to-orange-500", bg: "bg-amber-500/8", iconColor: "text-amber-400", trend: "3 new", trendUp: false },
  { title: "To Deliver", key: "toDeliver" as const, icon: Clock, color: "from-purple-500 to-violet-500", bg: "bg-purple-500/8", iconColor: "text-purple-400", trend: "2 today", trendUp: true },
  { title: "Total Clients", key: "totalClients" as const, icon: Users, color: "from-emerald-500 to-green-500", bg: "bg-emerald-500/8", iconColor: "text-emerald-400", trend: "+5%", trendUp: true },
  { title: "Active Subs", key: "activeSubscriptions" as const, icon: TrendingUp, color: "from-green-500 to-emerald-500", bg: "bg-green-500/8", iconColor: "text-green-400", trend: "+8%", trendUp: true },
  { title: "Expiring Soon", key: "expiringSoon" as const, icon: RefreshCw, color: "from-orange-500 to-red-500", bg: "bg-orange-500/8", iconColor: "text-orange-400", trend: "Action", trendUp: false },
  { title: "Products", key: "totalProducts" as const, icon: Package, color: "from-indigo-500 to-blue-500", bg: "bg-indigo-500/8", iconColor: "text-indigo-400", trend: "Stable", trendUp: true },
  { title: "Inventory", key: "inventoryAlerts" as const, icon: AlertTriangle, color: "from-rose-500 to-pink-500", bg: "bg-rose-500/8", iconColor: "text-rose-400", trend: "In stock", trendUp: true },
];

export default function DashboardPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
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
        totalOrders: orders.count || 0,
        pendingPayments: pendingPay.count || 0,
        toDeliver: toDeliver.count || 0,
        totalClients: clients.count || 0,
        activeSubscriptions: activeSubs.count || 0,
        expiringSoon: expiring.count || 0,
        totalProducts: products.count || 0,
        inventoryAlerts: inventory.count || 0,
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) return <LoadingState />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="space-y-10">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl gradient-primary p-8 md:p-10 glow-primary">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-white/5 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-5 w-5 text-white/80" />
            <span className="text-xs font-semibold text-white/60 uppercase tracking-[0.2em]">Dashboard</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            {greeting}, {profile?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-white/50 text-sm mt-2 max-w-md">
            Here's your business overview. Track orders, manage clients, and monitor your subscription inventory.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
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
            <p className="text-3xl font-bold tracking-tight text-foreground leading-none">
              {stats?.[card.key] ?? 0}
            </p>
            <p className="text-[11px] font-medium text-muted-foreground mt-2 uppercase tracking-wider">{card.title}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-[0.2em] mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "New Order", icon: ShoppingCart, href: "/orders/new", color: "text-blue-400" },
            { label: "All Clients", icon: Users, href: "/clients", color: "text-emerald-400" },
            { label: "Inventory", icon: Package, href: "/inventory", color: "text-purple-400" },
            { label: "Analytics", icon: TrendingUp, href: "/analytics", color: "text-amber-400" },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.href)}
              className="flex items-center justify-between p-4 rounded-2xl bg-card/40 border border-border/20 hover:bg-card/70 hover:border-border/40 transition-all duration-300 group text-left"
            >
              <div className="flex items-center gap-3">
                <action.icon className={`h-5 w-5 ${action.color} transition-transform duration-300 group-hover:scale-110`} />
                <span className="text-sm font-medium text-foreground/70 group-hover:text-foreground transition-colors">{action.label}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 group-hover:translate-x-0.5 transition-all duration-300" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
