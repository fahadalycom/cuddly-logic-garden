import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import {
  loadIntegrations,
  saveIntegration,
  setEnabled as setEnabledApi,
  testConnection,
  clearError as clearErrorApi,
  type ChannelIntegration,
  type ChannelType,
  type HealthInvokeResponse,
} from "@/lib/channel-integrations";

export function useChannelIntegrations() {
  return useQuery({
    queryKey: ["channel_integrations"],
    queryFn: loadIntegrations,
    staleTime: 10_000,
  });
}

export function useChannelIntegration(channel: ChannelType) {
  const qc = useQueryClient();
  const query = useChannelIntegrations();
  const integration: ChannelIntegration | undefined = query.data?.find(
    (i) => i.channel_type === channel,
  );

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<HealthInvokeResponse | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["channel_integrations"] });

  const save = async (values: Record<string, string>) => {
    setSaving(true);
    try {
      await saveIntegration(channel, values);
      toast({ title: "Saved", description: "Configuration updated." });
      refresh();
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      const res = await testConnection(channel);
      setLastTestResult(res);

      if (res.ok && res.result?.ok) {
        toast({
          title: "Connection healthy",
          description: `Meta Graph responded successfully (HTTP ${res.result.http_status ?? 200}).`,
        });
      } else {
        // Real error: prefer probe-level message, then function-level, then HTTP code
        const headline = res.result?.error ?? res.error ?? `Edge function HTTP ${res._httpStatus ?? "?"}`;
        const detail = res.result?.hint ?? res.error ?? undefined;
        toast({
          title: "Connection failed",
          description: detail ? `${headline} — ${detail}` : headline,
          variant: "destructive",
        });
        // Verbose console log so admins can copy-paste exact response
        console.error("[channel-health-check] test failed:", {
          channel,
          httpStatus: res._httpStatus,
          functionError: res.error,
          functionCode: res.code,
          probe: res.result,
        });
      }
      refresh();
      return res;
    } catch (e: any) {
      const failed: HealthInvokeResponse = { ok: false, error: e?.message ?? "Unknown error" };
      setLastTestResult(failed);
      toast({ title: "Test failed", description: e?.message ?? "Unknown error", variant: "destructive" });
      return failed;
    } finally {
      setTesting(false);
    }
  };

  const toggle = async (enabled: boolean) => {
    setToggling(true);
    try {
      await setEnabledApi(channel, enabled);
      toast({ title: enabled ? "Enabled" : "Disabled" });
      refresh();
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setToggling(false);
    }
  };

  const clearError = async () => {
    try {
      await clearErrorApi(channel);
      setLastTestResult(null);
      refresh();
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    }
  };

  const reconnect = async () => {
    await test();
  };

  return {
    integration,
    loading: query.isLoading,
    saving,
    testing,
    toggling,
    lastTestResult,
    save,
    test,
    toggle,
    clearError,
    reconnect,
  };
}
