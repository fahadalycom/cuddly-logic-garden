import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { DollarSign, ShoppingCart, RefreshCw, Users } from "lucide-react";

export default function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="Reports"
        description="Business insights, revenue and operational metrics"
        icon={<BarChart3 className="h-5 w-5 text-white" />}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Revenue (30d)" value="$24,580" icon={DollarSign} accent="emerald" trend={{ value: "12%", up: true }} />
        <StatCard title="Orders (30d)" value="324" icon={ShoppingCart} accent="primary" trend={{ value: "8%", up: true }} />
        <StatCard title="Renewals (30d)" value="89" icon={RefreshCw} accent="amber" trend={{ value: "3%", up: false }} />
        <StatCard title="New Customers" value="142" icon={Users} accent="blue" trend={{ value: "18%", up: true }} />
      </div>
      <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-8 text-center">
        <p className="text-sm text-muted-foreground/70">Detailed reports module coming next — charts, exports, and saved views.</p>
      </div>
    </div>
  );
}
