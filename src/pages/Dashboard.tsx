import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  ShoppingCart, Users, Package, CreditCard, RefreshCw, AlertTriangle, TrendingUp, Clock,
  ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { LoadingState } from "@/components/shared/PageStates";

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
  {
    title: "Total Orders",
    key: "totalOrders" as const,
    icon: ShoppingCart,
    gradient: "from-blue-500/10 to-blue-600/5",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
    trend: "+12%",
    trendUp: true,
  },
  {
    title: "Pending Verification",
    key: "pendingPayments" as const,
    icon: CreditCard,
    gradient: "from-amber-500/10 to-amber-600/5",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-400",
    trend: "3 new",
    trendUp: false,
  },
  {
    title: "To Deliver",
    key: "toDeliver" as const,
    icon: Clock,
    gradient: "from-purple-500/10 to-purple-600/5",
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-400",
    trend: "2 today",
    trendUp: true,
  },
  {
    title: "Total Clients",
    key: "totalClients" as const,
    icon: Users,
    gradient: "from-emerald-500/10 to-emerald-600/5",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
    trend: "+5%",
    trendUp: true,
  },
  {
    title: "Active Subscriptions",
    key: "activeSubscriptions" as const,
    icon: TrendingUp,
    gradient: "from-green-500/10 to-green-600/5",
    iconBg: "bg-green-500/10",
    iconColor: "text-green-400",
    trend: "+8%",
    trendUp: true,
  },
  {
    title: "Expiring Soon",
    key: "expiringSoon" as const,
    icon: RefreshCw,
    gradient: "from-orange-500/10 to-orange-600/5",
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-400",
    trend: "Action needed",
    trendUp: false,
  },
  {
    title: "Active Products",
    key: "totalProducts" as const,
    icon: Package,
    gradient: "from-indigo-500/10 to-indigo-600/5",
    iconBg: "bg-indigo-500/10",
    iconColor: "text-indigo-400",
    trend: "Stable",
    trendUp: true,
  },
  {
    title: "Available Accounts",
    key: "inventoryAlerts" as const,
    icon: AlertTriangle,
    gradient: "from-rose-500/10 to-rose-600/5",
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-400",
    trend: "In stock",
    trendUp: true,
  },
];

export default function DashboardPage() {
  const { profile } = useAuth();
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
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {greeting}, <span className="text-gradient">{profile?.full_name?.split(' ')[0]}</span>
        </h1>
        <p className="text-muted-foreground text-sm">
          Here's what's happening with your business today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statConfig.map((card) => (
          <div key={card.title} className="stat-card group">
            <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${card.gradient} opacity-50`} />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className={`h-10 w-10 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                  <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
                <span className={`flex items-center gap-1 text-xs font-medium ${card.trendUp ? 'text-success' : 'text-warning'}`}>
                  {card.trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {card.trend}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold tracking-tight text-foreground">
                  {stats?.[card.key] ?? 0}
                </p>
                <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="glass rounded-xl p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "New Order", icon: ShoppingCart, href: "/orders/new" },
            { label: "Add Client", icon: Users, href: "/clients" },
            { label: "Inventory", icon: Package, href: "/inventory" },
            { label: "Analytics", icon: TrendingUp, href: "/analytics" },
          ].map((action) => (
            <a
              key={action.label}
              href={action.href}
              className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/30 hover:bg-secondary/60 hover:border-border/60 transition-all group"
            >
              <action.icon className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground">{action.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
