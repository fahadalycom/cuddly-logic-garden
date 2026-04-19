import { Activity, AlertTriangle, CheckCircle2, RefreshCw, Radio, PlugZap, KeyRound } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { computeReliability } from "@/lib/message-status";
import { ChannelIcon } from "./ChannelIcon";
import { useIntegrationStatus } from "@/hooks/useIntegrationStatus";
import type { ConvChannel } from "@/lib/conversations-mock";

interface Props {
  channel: ConvChannel | string;
  messages: Array<{ direction?: string; status?: string | null; sender?: string }>;
  lastSyncLabel?: string;
  lastInboundAt?: string | Date | null;
  isRealtime?: boolean;
  latestFailedId?: string | null;
  onJumpToFailed?: () => void;
  className?: string;
}

function formatRelative(input?: string | Date | null): string | null {
  if (!input) return null;
  const d = typeof input === "string" ? new Date(input) : input;
  const ms = Date.now() - d.getTime();
  if (Number.isNaN(ms)) return null;
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

export function ConversationReliabilityStrip({
  channel,
  messages,
  lastSyncLabel,
  lastInboundAt,
  isRealtime,
  latestFailedId,
  onJumpToFailed,
  className,
}: Props) {
  const r = computeReliability(messages);
  const integration = useIntegrationStatus(typeof channel === "string" ? channel : null);
  const integrationProblem = integration && (!integration.enabled || !!integration.last_error);

  const healthMeta = {
    healthy:  { icon: CheckCircle2, label: "Healthy",  cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
    degraded: { icon: AlertTriangle,label: "Degraded", cls: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
    down:     { icon: AlertTriangle,label: "Down",     cls: "text-destructive bg-destructive/10 border-destructive/30" },
  }[r.health];

  const HealthIcon = healthMeta.icon;
  const syncLabel = lastSyncLabel ?? formatRelative(lastInboundAt);

  const channelChipCls = isRealtime
    ? "text-primary bg-primary/10 border-primary/30"
    : "text-muted-foreground bg-muted/30 border-border/40";

  return (
    <div className={className}>
      {integration?.isExpired && (
        <Link
          to="/channel-integrations"
          className="flex items-center gap-2 px-3 py-2 border-b border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-300 hover:bg-amber-500/20 transition-colors"
        >
          <KeyRound className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="font-medium">Access token expired.</span>{" "}
            <span className="opacity-80">Replies on {String(channel)} will fail until a new token is saved.</span>
          </span>
          <span className="shrink-0 underline">Update token</span>
        </Link>
      )}
      <div className={cn(
        "flex items-center gap-2 px-3 py-1 border-b border-border/30 bg-card/20 text-[10px] overflow-x-auto scrollbar-none",
      )}>
        <span className={cn("inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-full border shrink-0", channelChipCls)}>
          <ChannelIcon channel={channel as ConvChannel} size="sm" />
          <span className="capitalize">{channel}</span>
          {isRealtime && <Radio className="h-2.5 w-2.5" />}
        </span>

        <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border shrink-0", healthMeta.cls)}>
          <HealthIcon className="h-2.5 w-2.5" />
          {healthMeta.label}
        </span>

        {r.failed > 0 && (
          latestFailedId && onJumpToFailed ? (
            <button
              type="button"
              onClick={onJumpToFailed}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/30 shrink-0 hover:bg-destructive/20 transition-colors cursor-pointer"
              title="Jump to latest failed message"
            >
              <AlertTriangle className="h-2.5 w-2.5" />
              {r.failed} failed
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/30 shrink-0">
              <AlertTriangle className="h-2.5 w-2.5" />
              {r.failed} failed
            </span>
          )
        )}
        {r.pending > 0 && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0">
            <RefreshCw className="h-2.5 w-2.5" />
            {r.pending} pending
          </span>
        )}
        {integrationProblem && !integration?.isExpired && (
          <Link
            to="/channel-integrations"
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/30 shrink-0 hover:bg-destructive/20 transition-colors"
            title={integration?.displayError ?? "Channel disabled"}
          >
            <PlugZap className="h-2.5 w-2.5" />
            {integration?.enabled ? "Channel error" : "Channel disabled"}
          </Link>
        )}
        {r.total > 0 && (
          <span className="text-muted-foreground/70 shrink-0 inline-flex items-center gap-1">
            <Activity className="h-2.5 w-2.5" />
            {r.delivered}/{r.total} delivered
          </span>
        )}
        {syncLabel && (
          <span className="ml-auto text-muted-foreground/60 shrink-0">Last sync: {syncLabel}</span>
        )}
      </div>
    </div>
  );
}
