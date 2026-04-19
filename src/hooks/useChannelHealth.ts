import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ChannelIntegration } from "@/lib/channel-integrations";

export interface ChannelHealthSummary {
  integrations: ChannelIntegration[];
  connectedCount: number;
  failedSendsToday: number;
  webhookFailuresToday: number;
  needsAttention: ChannelIntegration[];
  lastInboundByChannel: Record<string, string | null>;
}

const startOfTodayISO = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

export function useChannelHealth() {
  return useQuery<ChannelHealthSummary>({
    queryKey: ["channel_health"],
    queryFn: async () => {
      const todayISO = startOfTodayISO();

      const [intRes, failedRes, webhookFailRes, lastInboundRes] = await Promise.all([
        supabase.from("channel_integrations").select("*").order("channel_type"),
        supabase.from("wa_messages")
          .select("id", { count: "exact", head: true })
          .in("delivery_status", ["failed", "permanently_failed"])
          .gte("created_at", todayISO),
        supabase.from("wa_inbound_events")
          .select("id", { count: "exact", head: true })
          .eq("processing_status", "failed")
          .gte("received_at", todayISO),
        supabase.from("wa_inbound_events")
          .select("channel, received_at")
          .order("received_at", { ascending: false })
          .limit(50),
      ]);

      const integrations = (intRes.data ?? []) as unknown as ChannelIntegration[];
      const lastInboundByChannel: Record<string, string | null> = {};
      for (const row of (lastInboundRes.data ?? []) as Array<{ channel: string; received_at: string }>) {
        if (!lastInboundByChannel[row.channel]) lastInboundByChannel[row.channel] = row.received_at;
      }

      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const needsAttention = integrations.filter((i) => {
        if (!i.enabled) return false;
        if (i.status === "error" || i.status === "warning") return true;
        if (i.last_error) return true;
        if (i.last_success_at && new Date(i.last_success_at).getTime() < dayAgo) return true;
        return false;
      });

      return {
        integrations,
        connectedCount: integrations.filter((i) => i.enabled && i.status !== "error").length,
        failedSendsToday: failedRes.count ?? 0,
        webhookFailuresToday: webhookFailRes.count ?? 0,
        needsAttention,
        lastInboundByChannel,
      };
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
