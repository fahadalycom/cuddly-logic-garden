import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// conversation channel -> integration channel_type
const CH_MAP: Record<string, "whatsapp" | "messenger" | "instagram"> = {
  whatsapp: "whatsapp",
  facebook: "messenger",
  instagram: "instagram",
};

export interface IntegrationStatus {
  enabled: boolean;
  status: string | null;
  last_error: string | null;
  last_error_at: string | null;
}

/**
 * Lightweight per-channel integration status read for inbox UI.
 * Returns null while loading or for unsupported channels (email/web/etc).
 */
export function useIntegrationStatus(channel: string | null | undefined) {
  const [data, setData] = useState<IntegrationStatus | null>(null);
  const intType = channel ? CH_MAP[channel] : undefined;

  useEffect(() => {
    if (!intType) { setData(null); return; }
    let active = true;
    (async () => {
      const { data: row } = await supabase
        .from("channel_integrations")
        .select("enabled,status,last_error,last_error_at")
        .eq("channel_type", intType)
        .maybeSingle();
      if (active) setData((row as IntegrationStatus | null) ?? null);
    })();
    return () => { active = false; };
  }, [intType]);

  return data;
}
