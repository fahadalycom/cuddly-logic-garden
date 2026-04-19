import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export type ChannelType = "whatsapp" | "messenger" | "instagram";
export type ChannelStatus = "not_configured" | "healthy" | "warning" | "error" | "disabled";

export interface ChannelIntegration {
  id: string;
  channel_type: ChannelType;
  enabled: boolean;
  status: ChannelStatus;
  config: Record<string, string>;
  secrets_set: Record<string, boolean>;
  verify_token: string | null;
  webhook_url: string | null;
  last_health_check_at: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  last_error_at: string | null;
  last_error_field: string | null;
}

// Field definitions per channel
export interface FieldDef {
  key: string;
  label: string;
  secret: boolean;
  required: boolean;
  placeholder?: string;
  helper?: string;
}

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
const FUNCTIONS_BASE = PROJECT_ID
  ? `https://${PROJECT_ID}.supabase.co/functions/v1`
  : "";

export const CHANNEL_META: Record<
  ChannelType,
  { label: string; fields: FieldDef[]; webhookPath: string; secretKeys: Record<string, string> }
> = {
  whatsapp: {
    label: "WhatsApp Cloud API",
    webhookPath: "whatsapp-webhook",
    fields: [
      { key: "app_id", label: "App ID", secret: false, required: true, placeholder: "123456789012345" },
      { key: "app_secret", label: "App Secret", secret: true, required: true },
      { key: "access_token", label: "Access Token", secret: true, required: true, helper: "Permanent or system-user token" },
      { key: "verify_token", label: "Verify Token", secret: false, required: true, helper: "Webhook verification token" },
      { key: "phone_number_id", label: "Phone Number ID", secret: false, required: true },
      { key: "whatsapp_business_account_id", label: "WhatsApp Business Account ID", secret: false, required: false },
    ],
    secretKeys: {
      app_secret: "meta_whatsapp_app_secret",
      access_token: "meta_whatsapp_access_token",
    },
  },
  messenger: {
    label: "Facebook Messenger",
    webhookPath: "messenger-webhook",
    fields: [
      { key: "app_id", label: "App ID", secret: false, required: true },
      { key: "app_secret", label: "App Secret", secret: true, required: true },
      { key: "page_access_token", label: "Page Access Token", secret: true, required: true },
      { key: "verify_token", label: "Verify Token", secret: false, required: true },
      { key: "page_id", label: "Page ID", secret: false, required: true },
    ],
    secretKeys: {
      app_secret: "meta_messenger_app_secret",
      page_access_token: "meta_messenger_page_access_token",
    },
  },
  instagram: {
    label: "Instagram Messaging",
    webhookPath: "instagram-webhook",
    fields: [
      { key: "app_id", label: "App ID", secret: false, required: true },
      { key: "app_secret", label: "App Secret", secret: true, required: true },
      { key: "access_token", label: "Access Token", secret: true, required: true },
      { key: "verify_token", label: "Verify Token", secret: false, required: true },
      { key: "instagram_business_account_id", label: "Instagram Business Account ID", secret: false, required: true },
      { key: "connected_page_id", label: "Connected Page ID", secret: false, required: false },
    ],
    secretKeys: {
      app_secret: "meta_instagram_app_secret",
      access_token: "meta_instagram_access_token",
    },
  },
};

export function buildSchema(channel: ChannelType) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of CHANNEL_META[channel].fields) {
    let s = z.string().trim().max(500);
    if (f.required && !f.secret) s = s.min(1, `${f.label} is required`);
    // Secrets are optional on edit (empty = keep existing)
    shape[f.key] = f.required && !f.secret ? s : s.optional().or(z.literal(""));
  }
  return z.object(shape);
}

export function webhookUrlFor(channel: ChannelType): string {
  return FUNCTIONS_BASE ? `${FUNCTIONS_BASE}/${CHANNEL_META[channel].webhookPath}` : "";
}

export function computeCompleteness(channel: ChannelType, integration: ChannelIntegration | null): number {
  if (!integration) return 0;
  const fields = CHANNEL_META[channel].fields.filter((f) => f.required);
  if (fields.length === 0) return 100;
  let filled = 0;
  for (const f of fields) {
    if (f.secret) {
      if (integration.secrets_set?.[f.key]) filled++;
    } else if (f.key === "verify_token") {
      if (integration.verify_token) filled++;
    } else {
      if (integration.config?.[f.key]) filled++;
    }
  }
  return Math.round((filled / fields.length) * 100);
}

export async function loadIntegrations(): Promise<ChannelIntegration[]> {
  const { data, error } = await supabase
    .from("channel_integrations")
    .select("*")
    .order("channel_type");
  if (error) throw error;
  return (data ?? []) as unknown as ChannelIntegration[];
}

export async function loadIntegration(channel: ChannelType): Promise<ChannelIntegration | null> {
  const { data, error } = await supabase
    .from("channel_integrations")
    .select("*")
    .eq("channel_type", channel)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as ChannelIntegration | null;
}

export async function saveIntegration(
  channel: ChannelType,
  values: Record<string, string>,
): Promise<ChannelIntegration> {
  const meta = CHANNEL_META[channel];
  const existing = await loadIntegration(channel);

  // Split config vs secrets vs verify_token
  const config: Record<string, string> = { ...(existing?.config ?? {}) };
  const secrets_set: Record<string, boolean> = { ...(existing?.secrets_set ?? {}) };
  let verify_token = existing?.verify_token ?? null;

  for (const f of meta.fields) {
    const v = (values[f.key] ?? "").trim();
    if (f.secret) {
      if (v.length > 0) {
        // Upsert into system_settings
        const settingKey = meta.secretKeys[f.key];
        if (settingKey) {
          const { data: existingSetting } = await supabase
            .from("system_settings")
            .select("id")
            .eq("key", settingKey)
            .maybeSingle();
          if (existingSetting) {
            await supabase.from("system_settings").update({ value: v }).eq("id", existingSetting.id);
          } else {
            await supabase.from("system_settings").insert({
              key: settingKey,
              value: v,
              category: `channel_${channel}`,
              is_secret: true,
              description: `${meta.label} ${f.label}`,
            });
          }
          secrets_set[f.key] = true;
        }
      }
    } else if (f.key === "verify_token") {
      if (v.length > 0) verify_token = v;
    } else {
      if (v.length > 0) config[f.key] = v;
    }
  }

  const webhook = webhookUrlFor(channel);
  const { data, error } = await supabase
    .from("channel_integrations")
    .update({
      config,
      secrets_set,
      verify_token,
      webhook_url: webhook,
    })
    .eq("channel_type", channel)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as ChannelIntegration;
}

export async function setEnabled(channel: ChannelType, enabled: boolean): Promise<ChannelIntegration> {
  const status: ChannelStatus = enabled ? "warning" : "disabled";
  const { data, error } = await supabase
    .from("channel_integrations")
    .update({ enabled, status })
    .eq("channel_type", channel)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as ChannelIntegration;
}

export interface HealthInvokeResponse {
  ok: boolean;
  result?: {
    ok: boolean;
    field?: string;
    error?: string;
    hint?: string;
    http_status?: number;
    graph_error?: any;
    endpoint?: string;
    info?: any;
  };
  integration?: ChannelIntegration;
  error?: string;
  code?: string;
  db_warning?: string;
  /** http status of the edge function call itself */
  _httpStatus?: number;
}

async function invokeHealth(
  channel: ChannelType,
  action: "test_connection" | "refresh_health" | "clear_error",
): Promise<HealthInvokeResponse> {
  // Use raw fetch so we can read the JSON error body even on non-2xx
  // (supabase.functions.invoke swallows the body into a generic FunctionsHttpError).
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const url = `${FUNCTIONS_BASE}/channel-health-check`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        apikey: (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ?? "",
      },
      body: JSON.stringify({ channel_type: channel, action }),
    });
  } catch (networkErr: any) {
    return { ok: false, error: `Network error reaching edge function: ${networkErr?.message ?? networkErr}`, code: "network" };
  }

  let parsed: any = null;
  const text = await res.text();
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { error: text || `HTTP ${res.status}` };
  }

  const out: HealthInvokeResponse = {
    ok: !!parsed?.ok,
    result: parsed?.result,
    integration: parsed?.integration,
    error: parsed?.error,
    code: parsed?.code,
    db_warning: parsed?.db_warning,
    _httpStatus: res.status,
  };
  return out;
}

export async function testConnection(channel: ChannelType) {
  return invokeHealth(channel, "test_connection");
}

export async function clearError(channel: ChannelType) {
  return invokeHealth(channel, "clear_error");
}
