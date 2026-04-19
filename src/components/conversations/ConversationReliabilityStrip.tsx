import { Activity, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { computeReliability } from "@/lib/message-status";
import { ChannelIcon } from "./ChannelIcon";
import type { ConvChannel } from "@/lib/conversations-mock";

interface Props {
  channel: ConvChannel | string;
  messages: Array<{ direction?: string; status?: string | null }>;
  lastSyncLabel?: string;
  className?: string;
}

export function ConversationReliabilityStrip({ channel, messages, lastSyncLabel, className }: Props) {
  const r = computeReliability(messages);

  const healthMeta = {
    healthy:  { icon: CheckCircle2, label: "Healthy",  cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
    degraded: { icon: AlertTriangle,label: "Degraded", cls: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
    down:     { icon: AlertTriangle,label: "Down",     cls: "text-destructive bg-destructive/10 border-destructive/30" },
  }[r.health];

  const HealthIcon = healthMeta.icon;

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1 border-b border-border/30 bg-card/20 text-[10px] overflow-x-auto scrollbar-none",
      className,
    )}>
      <span className="inline-flex items-center gap-1.5 text-muted-foreground shrink-0">
        <ChannelIcon channel={channel as ConvChannel} size="sm" />
        <span className="capitalize">{channel}</span>
      </span>

      <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border shrink-0", healthMeta.cls)}>
        <HealthIcon className="h-2.5 w-2.5" />
        {healthMeta.label}
      </span>

      {r.failed > 0 && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/30 shrink-0">
          <AlertTriangle className="h-2.5 w-2.5" />
          {r.failed} failed
        </span>
      )}
      {r.pending > 0 && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0">
          <RefreshCw className="h-2.5 w-2.5" />
          {r.pending} pending
        </span>
      )}
      {r.total > 0 && (
        <span className="text-muted-foreground/70 shrink-0 inline-flex items-center gap-1">
          <Activity className="h-2.5 w-2.5" />
          {r.delivered}/{r.total} delivered
        </span>
      )}
      {lastSyncLabel && (
        <span className="ml-auto text-muted-foreground/60 shrink-0">Last sync: {lastSyncLabel}</span>
      )}
    </div>
  );
}
