import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ShoppingCart, Users, Package, CreditCard, RefreshCw, AlertTriangle, TrendingUp, Clock } from "lucide-react";
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

export default function DashboardPage() {
  const { profile, roles } = useAuth();
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

  const cards = [
    { title: "Total Orders", value: stats?.totalOrders, icon: ShoppingCart, color: "text-blue-600" },
    { title: "Pending Verification", value: stats?.pendingPayments, icon: CreditCard, color: "text-amber-600" },
    { title: "To Deliver", value: stats?.toDeliver, icon: Clock, color: "text-purple-600" },
    { title: "Total Clients", value: stats?.totalClients, icon: Users, color: "text-emerald-600" },
    { title: "Active Subscriptions", value: stats?.activeSubscriptions, icon: TrendingUp, color: "text-green-600" },
    { title: "Expiring Soon", value: stats?.expiringSoon, icon: RefreshCw, color: "text-orange-600" },
    { title: "Active Products", value: stats?.totalProducts, icon: Package, color: "text-indigo-600" },
    { title: "Available Accounts", value: stats?.inventoryAlerts, icon: AlertTriangle, color: "text-red-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {profile?.full_name}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value ?? 0}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
