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
      if (res?.ok) {
        toast({ title: "Connection healthy", description: "Channel responded successfully." });
      } else {
        toast({
          title: "Connection failed",
          description: res?.result?.error ?? res?.error ?? "Test failed.",
          variant: "destructive",
        });
      }
      refresh();
    } catch (e: any) {
      toast({ title: "Test failed", description: e?.message ?? "Unknown error", variant: "destructive" });
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
    save,
    test,
    toggle,
    clearError,
    reconnect,
  };
}
