import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// conversation channel -> integration channel_type
const CH_MAP: Record<string, "whatsapp" | "messenger" | "instagram"> = {
  whatsapp: "whatsapp",
  facebook: "messenger",
  instagram: "instagram",
};

export const EXPIRED_TOKEN_MARKER = "[EXPIRED_TOKEN]";

export interface IntegrationStatus {
  enabled: boolean;
  status: string | null;
  last_error: string | null;
  last_error_at: string | null;
  /** Derived: true when last_error starts with [EXPIRED_TOKEN] marker. */
  isExpired: boolean;
  /** last_error with marker stripped, for display. */
  displayError: string | null;
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
      if (!active) return;
      if (!row) { setData(null); return; }
      const raw = (row as any).last_error as string | null;
      const isExpired = !!raw && raw.startsWith(EXPIRED_TOKEN_MARKER);
      setData({
        enabled: (row as any).enabled,
        status: (row as any).status,
        last_error: raw,
        last_error_at: (row as any).last_error_at,
        isExpired,
        displayError: isExpired ? raw!.slice(EXPIRED_TOKEN_MARKER.length).trim() : raw,
      });
    })();
    return () => { active = false; };
  }, [intType]);

  return data;
}
