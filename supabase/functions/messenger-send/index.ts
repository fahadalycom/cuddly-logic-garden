// Outbound send for Facebook Messenger + Instagram Messaging via Meta Graph API.
// Mirrors whatsapp-send: idempotent, transitions delivery_status, stores
// external_message_id + provider_response, updates channel_integrations health.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// conv channel -> integration channel_type
const INT_TYPE: Record<string, "messenger" | "instagram"> = {
  facebook: "messenger",
  instagram: "instagram",
};

async function getSettingValue(supabase: any, key: string, envFallback?: string): Promise<string> {
  const { data } = await supabase.from("system_settings").select("value").eq("key", key).maybeSingle();
  if (data?.value) return data.value;
  return envFallback ? (Deno.env.get(envFallback) || "") : "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const {
      conversation_id, content, sender_id, idempotency_key, retry_of_message_id,
      media_url, media_type, media_mime_type, media_filename,
    } = await req.json();
    if (!conversation_id || (!content && !media_url)) {
      return json({ error: "Missing required fields" }, 400);
    }

    // Idempotency
    if (idempotency_key && !retry_of_message_id) {
      const { data: existing } = await supabase
        .from("wa_messages")
        .select("*")
        .eq("idempotency_key", idempotency_key)
        .maybeSingle();
      if (existing) return json({ success: true, message: existing, deduped: true });
    }

    const { data: conversation } = await supabase
      .from("wa_conversations")
      .select("*")
      .eq("id", conversation_id)
      .single();
    if (!conversation) return json({ error: "Conversation not found" }, 404);

    const convChannel: string = conversation.channel;
    const intType = INT_TYPE[convChannel];
    if (!intType) return json({ error: `Unsupported channel: ${convChannel}` }, 400);

    const { data: integration } = await supabase
      .from("channel_integrations")
      .select("*")
      .eq("channel_type", intType)
      .maybeSingle();
    if (!integration?.enabled) {
      return json({ error: `${intType} channel is not enabled` }, 400);
    }

    // Insert / locate message row
    let messageId: string;
    if (retry_of_message_id) {
      messageId = retry_of_message_id;
      await supabase.from("wa_messages").update({ delivery_status: "sending" }).eq("id", messageId);
    } else {
      const { data: inserted, error: insErr } = await supabase.from("wa_messages").insert({
        conversation_id,
        sender_type: "agent",
        sender_id,
        content,
        media_type: media_type ?? "text",
        media_url: media_url ?? null,
        media_mime_type: media_mime_type ?? null,
        media_filename: media_filename ?? null,
        is_read: true,
        direction: "outbound",
        delivery_status: "sending",
        idempotency_key: idempotency_key || null,
        channel: convChannel,
      }).select().single();
      if (insErr || !inserted) return json({ error: insErr?.message || "Insert failed" }, 500);
      messageId = inserted.id;
    }

    // Resolve token + recipient
    const tokenSettingKey = intType === "messenger" ? "meta_messenger_page_access_token" : "meta_instagram_access_token";
    const token = await getSettingValue(supabase, tokenSettingKey);
    const senderEntityId = intType === "messenger"
      ? integration.config?.page_id
      : integration.config?.instagram_business_account_id;

    let externalId: string | null = null;
    let providerResponse: any = null;
    let errorCode: string | null = null;
    let errorSubcode: number | null = null;
    let errorMessage: string | null = null;
    let httpStatus: number | null = null;
    let failed = false;
    let configMissing = false;

    if (!token || !senderEntityId) {
      failed = true;
      configMissing = true;
      errorMessage = "Missing access token or sender id in integration config";
    } else {
      try {
        const url = `https://graph.facebook.com/v19.0/${senderEntityId}/messages?access_token=${encodeURIComponent(token)}`;
        const messageBody: Record<string, unknown> = media_url
          ? {
              attachment: {
                type: media_type === "image" ? "image" : "file",
                payload: { url: media_url, is_reusable: true },
              },
            }
          : { text: content };
        const payload = {
          recipient: { id: conversation.external_user_id },
          message: messageBody,
          messaging_type: "RESPONSE",
        };
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        httpStatus = resp.status;
        providerResponse = await resp.json();
        if (!resp.ok) {
          failed = true;
          errorCode = String(providerResponse?.error?.code ?? resp.status);
          errorSubcode = providerResponse?.error?.error_subcode ?? null;
          errorMessage = providerResponse?.error?.message || "Meta API error";
        } else {
          externalId = providerResponse.message_id ?? null;
        }
      } catch (apiErr) {
        failed = true;
        errorMessage = (apiErr as Error).message;
      }
    }

    // Permanent vs transient: same classification policy as whatsapp-send.
    const PERMANENT_CODES = new Set(["190", "200", "10", "100", "551", "613"]);
    const PERMANENT_SUBCODES = new Set([463, 467, 1545041, 2018028, 2018108]);
    const isPermanent = failed && (
      configMissing ||
      (errorCode && PERMANENT_CODES.has(errorCode)) ||
      (errorSubcode != null && PERMANENT_SUBCODES.has(errorSubcode)) ||
      httpStatus === 401 || httpStatus === 403
    );

    const updates: Record<string, unknown> = { provider_response: providerResponse };
    if (failed) {
      updates.delivery_status = isPermanent ? "permanently_failed" : "failed";
      updates.error_code = errorCode;
      updates.error_message = errorMessage;
    } else {
      updates.delivery_status = "sent_to_api";
      updates.external_message_id = externalId;
      updates.sent_at = new Date().toISOString();
    }
    const { data: storedMessage } = await supabase
      .from("wa_messages").update(updates).eq("id", messageId).select().single();

    await supabase.from("wa_conversations").update({
      last_message_preview: content,
      last_message_at: new Date().toISOString(),
    }).eq("id", conversation_id);

    // Update integration health
    if (integration.id) {
      const healthUpdate: Record<string, unknown> = { last_outbound_at: new Date().toISOString() };
      if (failed) {
        healthUpdate.last_error = errorMessage;
        healthUpdate.last_error_at = new Date().toISOString();
        healthUpdate.status = "warning";
      } else {
        healthUpdate.last_success_at = new Date().toISOString();
        healthUpdate.status = "healthy";
      }
      await supabase.from("channel_integrations").update(healthUpdate).eq("id", integration.id);
    }

    if (failed) {
      return json({ success: false, error: errorMessage, message: storedMessage }, 207);
    }
    return json({ success: true, message: storedMessage });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }

  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
