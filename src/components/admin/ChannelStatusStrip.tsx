import { Card } from "@/components/ui/card";
import { MessageCircle, Facebook, Instagram } from "lucide-react";
import { useChannelIntegrations } from "@/hooks/useChannelIntegration";
import type { ChannelStatus, ChannelType } from "@/lib/channel-integrations";
import { cn } from "@/lib/utils";

const ICONS: Record<ChannelType, any> = {
  whatsapp: MessageCircle,
  messenger: Facebook,
  instagram: Instagram,
};

const LABELS: Record<ChannelType, string> = {
  whatsapp: "WhatsApp",
  messenger: "Messenger",
  instagram: "Instagram",
};

const STATUS_STYLES: Record<ChannelStatus, string> = {
  healthy: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  error: "bg-destructive/15 text-destructive border-destructive/30",
  disabled: "bg-muted text-muted-foreground border-border",
  not_configured: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABELS: Record<ChannelStatus, string> = {
  healthy: "Healthy",
  warning: "Warning",
  error: "Error",
  disabled: "Disabled",
  not_configured: "Not configured",
};

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString();
}

export function ChannelStatusStrip() {
  const { data, isLoading } = useChannelIntegrations();
  const channels: ChannelType[] = ["whatsapp", "messenger", "instagram"];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {channels.map((c) => {
        const Icon = ICONS[c];
        const integration = data?.find((i) => i.channel_type === c);
        const status: ChannelStatus = integration?.status ?? "not_configured";
        return (
          <Card key={c} className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{LABELS[c]}</span>
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full border font-medium",
                    STATUS_STYLES[status],
                  )}
                >
                  {STATUS_LABELS[status]}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                Last check: {isLoading ? "…" : formatTime(integration?.last_health_check_at ?? null)}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
