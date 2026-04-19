import { Activity, AlertTriangle, CheckCircle2, RadioTower, KeyRound, Power, MessageCircle, Facebook, Instagram } from "lucide-react";
import { Link } from "react-router-dom";
import { useChannelHealth } from "@/hooks/useChannelHealth";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const EXPIRED_MARKER = "[EXPIRED_TOKEN]";

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

const CHANNEL_META: Record<string, { label: string; icon: React.ElementType; convChannel: string }> = {
  whatsapp:  { label: "WhatsApp",  icon: MessageCircle, convChannel: "whatsapp" },
  messenger: { label: "Messenger", icon: Facebook,      convChannel: "facebook" },
  instagram: { label: "Instagram", icon: Instagram,     convChannel: "instagram" },
};

function formatRel(iso?: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface ChannelRowProps {
  channelType: string;
  integration: any | undefined;
  lastInbound?: string | null;
  lastOutbound?: string | null;
}

function ChannelRow({ channelType, integration, lastInbound, lastOutbound }: ChannelRowProps) {
  const meta = CHANNEL_META[channelType];
  if (!meta) return null;
  const Icon = meta.icon;

  const isExpired = !!integration?.last_error?.startsWith?.(EXPIRED_MARKER);
  const displayError = isExpired
    ? integration.last_error.slice(EXPIRED_MARKER.length).trim()
    : integration?.last_error ?? null;

  let pillCls = "text-muted-foreground bg-muted/30 border-border/40";
  let PillIcon: React.ElementType = Power;
  let pillLabel = "Not configured";

  if (!integration) {
    // not_configured
  } else if (!integration.enabled) {
    pillLabel = "Disabled";
    PillIcon = Power;
  } else if (isExpired) {
    pillLabel = "Token expired";
    PillIcon = KeyRound;
    pillCls = "text-amber-400 bg-amber-500/10 border-amber-500/30";
  } else if (integration.status === "healthy") {
    pillLabel = "Healthy";
    PillIcon = CheckCircle2;
    pillCls = "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
  } else if (integration.status === "warning") {
    pillLabel = "Warning";
    PillIcon = AlertTriangle;
    pillCls = "text-amber-400 bg-amber-500/10 border-amber-500/30";
  } else if (integration.status === "error") {
    pillLabel = "Error";
    PillIcon = AlertTriangle;
    pillCls = "text-destructive bg-destructive/10 border-destructive/30";
  } else if (integration.status === "not_configured") {
    pillLabel = !integration.webhook_url ? "Webhook pending" : "Not configured";
  }

  return (
    <Link
      to="/channel-integrations"
      className="flex items-center gap-3 px-3 py-2 rounded-xl border border-border/40 bg-card/40 hover:bg-card/60 transition-colors min-w-0"
    >
      <div className="h-8 w-8 rounded-lg border border-border/40 bg-muted/30 flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{meta.label}</p>
          <span className={cn("inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border shrink-0", pillCls)}>
            <PillIcon className="h-2.5 w-2.5" />
            {pillLabel}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
          In {formatRel(lastInbound)} · Out {formatRel(lastOutbound)}
          {displayError && <span className="text-destructive"> · {displayError.slice(0, 60)}</span>}
        </p>
      </div>
    </Link>
  );
}

export function IntegrationHealthStrip() {
  const { data, isLoading } = useChannelHealth();

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const byType: Record<string, any> = {};
  for (const i of data.integrations) byType[i.channel_type] = i;

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(["whatsapp", "messenger", "instagram"] as const).map((ct) => (
          <ChannelRow
            key={ct}
            channelType={ct}
            integration={byType[ct]}
            lastInbound={data.lastInboundByChannel[CHANNEL_META[ct].convChannel]}
            lastOutbound={data.lastOutboundByChannel[CHANNEL_META[ct].convChannel]}
          />
        ))}
      </div>
    </div>
  );
}
