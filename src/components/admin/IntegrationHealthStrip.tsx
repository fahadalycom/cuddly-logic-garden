import { Activity, AlertTriangle, CheckCircle2, RadioTower } from "lucide-react";
import { useChannelHealth } from "@/hooks/useChannelHealth";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface KpiProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  tone?: "ok" | "warn" | "danger" | "muted";
  subtitle?: string;
}

function Kpi({ label, value, icon: Icon, tone = "muted", subtitle }: KpiProps) {
  const toneClass = {
    ok: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    warn: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    danger: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    muted: "text-muted-foreground bg-muted/30 border-border/40",
  }[tone];

  return (
    <div className="rounded-xl border border-border/40 bg-card/40 p-3 flex items-center gap-3">
      <div className={cn("h-9 w-9 rounded-lg border flex items-center justify-center flex-shrink-0", toneClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 truncate">{label}</p>
        <p className="text-lg font-semibold leading-none mt-0.5 text-foreground">{value}</p>
        {subtitle && <p className="text-[10px] text-muted-foreground mt-1 truncate">{subtitle}</p>}
      </div>
    </div>
  );
}

export function IntegrationHealthStrip() {
  const { data, isLoading } = useChannelHealth();

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi
          label="Connected channels"
          value={`${data.connectedCount}/${data.integrations.length}`}
          icon={RadioTower}
          tone={data.connectedCount > 0 ? "ok" : "muted"}
        />
        <Kpi
          label="Failed sends today"
          value={data.failedSendsToday}
          icon={AlertTriangle}
          tone={data.failedSendsToday > 0 ? "danger" : "ok"}
        />
        <Kpi
          label="Webhook failures today"
          value={data.webhookFailuresToday}
          icon={Activity}
          tone={data.webhookFailuresToday > 0 ? "warn" : "ok"}
        />
        <Kpi
          label="Need attention"
          value={data.needsAttention.length}
          icon={data.needsAttention.length > 0 ? AlertTriangle : CheckCircle2}
          tone={data.needsAttention.length > 0 ? "warn" : "ok"}
          subtitle={data.needsAttention.map((i) => i.channel_type).join(", ") || "All healthy"}
        />
      </div>
    </div>
  );
}
