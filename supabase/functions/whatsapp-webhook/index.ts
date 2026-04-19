import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BUCKET = "whatsapp-media";

// Helper: get setting from DB, fallback to env var
async function getSettingValue(supabase: any, key: string, envFallback?: string): Promise<string> {
  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (data?.value) return data.value;
  return envFallback ? (Deno.env.get(envFallback) || "") : "";
}

/** Canonical WhatsApp access token resolver (mirrors whatsapp-send). */
async function resolveWhatsAppToken(supabase: any): Promise<string> {
  return (
    (await getSettingValue(supabase, "meta_whatsapp_access_token")) ||
    (await getSettingValue(supabase, "meta_whatsapp_token")) ||
    Deno.env.get("META_WHATSAPP_TOKEN") ||
    ""
  );
}

/** Canonical webhook verify token resolver. */
async function resolveVerifyToken(supabase: any): Promise<string> {
  // 1. channel_integrations.verify_token (canonical, set by Channel Integrations UI)
  const { data: integ } = await supabase
    .from("channel_integrations")
    .select("verify_token")
    .eq("channel_type", "whatsapp")
    .maybeSingle();
  if (integ?.verify_token) return integ.verify_token;
  // 2. Legacy system_settings key
  const legacy = await getSettingValue(supabase, "meta_webhook_verify_token");
  if (legacy) return legacy;
  // 3. Env var
  return Deno.env.get("META_WEBHOOK_VERIFY_TOKEN") || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Resolve WhatsApp integration id once per request for stamping inbound events
  const { data: waIntegration } = await supabase
    .from("channel_integrations")
    .select("id")
    .eq("channel_type", "whatsapp")
    .maybeSingle();
  const waIntegrationId = waIntegration?.id ?? null;

  try {
    // Webhook verification (GET)
    if (req.method === "GET") {
      const url = new URL(req.url);
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");
      const verifyToken = await resolveVerifyToken(supabase);

      if (mode === "subscribe" && token === verifyToken) {
        return new Response(challenge, { status: 200 });
      }
      return new Response("Forbidden", { status: 403 });
    }

    // Incoming message (POST)
    const body = await req.json();
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    // Handle status callbacks (sent / delivered / read / failed)
    if (value?.statuses?.length) {
      for (const st of value.statuses) {
        const externalId = st.id;
        // Dedupe + log
        const { data: dup } = await supabase
          .from("wa_inbound_events")
          .select("id")
          .eq("channel", "whatsapp")
          .eq("external_message_id", externalId)
          .eq("event_type", "status")
          .maybeSingle();
        if (dup) continue;

        const { data: evt } = await supabase.from("wa_inbound_events").insert({
          channel: "whatsapp",
          integration_id: waIntegrationId,
          event_type: "status",
          raw_payload: st,
          external_message_id: externalId,
          processing_status: "pending",
        }).select().single();

        try {
          const newStatus = st.status === "sent" ? "sent_to_api"
            : st.status === "delivered" ? "delivered"
            : st.status === "read" ? "read"
            : st.status === "failed" ? "failed"
            : null;
          if (newStatus) {
            const updates: Record<string, unknown> = { delivery_status: newStatus };
            if (newStatus === "delivered") updates.delivered_at = new Date().toISOString();
            if (newStatus === "read") updates.read_at = new Date().toISOString();
            if (newStatus === "failed") {
              updates.error_code = String(st.errors?.[0]?.code ?? "");
              updates.error_message = st.errors?.[0]?.title || st.errors?.[0]?.message || "Delivery failed";
            }
            await supabase.from("wa_messages")
              .update(updates)
              .eq("external_message_id", externalId);
          }
          await supabase.from("wa_inbound_events")
            .update({ processing_status: "processed", processed_at: new Date().toISOString() })
            .eq("id", evt!.id);
        } catch (e) {
          await supabase.from("wa_inbound_events")
            .update({ processing_status: "failed", error_message: (e as Error).message })
            .eq("id", evt!.id);
        }
      }
    }

    if (!value?.messages?.length) {
      return new Response(JSON.stringify({ status: "no_messages" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const message of value.messages) {
      const from = message.from;
      const waId = value.contacts?.[0]?.wa_id;
      const customerName = value.contacts?.[0]?.profile?.name || null;

      // Log raw inbound event (deduped by external_message_id)
      const { data: dupMsg } = await supabase
        .from("wa_inbound_events")
        .select("id")
        .eq("channel", "whatsapp")
        .eq("external_message_id", message.id)
        .eq("event_type", "message")
        .maybeSingle();
      if (dupMsg) continue;

      const { data: evtRow } = await supabase.from("wa_inbound_events").insert({
        channel: "whatsapp",
        integration_id: waIntegrationId,
        event_type: "message",
        raw_payload: message,
        external_message_id: message.id,
        processing_status: "pending",
      }).select().single();

      // Find or create conversation
      let { data: conversation } = await supabase
        .from("wa_conversations")
        .select("*")
        .eq("customer_phone", from)
        .neq("status", "archived")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!conversation) {
        let { data: client } = await supabase
          .from("clients").select("id").eq("whatsapp_number", from).single();
        if (!client) {
          const { data: newClient } = await supabase.from("clients")
            .insert({ name: customerName || from, whatsapp_number: from, phone: from })
            .select("id").single();
          client = newClient;
        }
        const assignedAgent = await findAvailableAgent(supabase);
        const status = assignedAgent ? "active" : "waiting";
        const { data: newConv } = await supabase.from("wa_conversations").insert({
          customer_phone: from, customer_name: customerName, customer_whatsapp_id: waId,
          client_id: client?.id, assigned_agent_id: assignedAgent, status,
        }).select().single();
        conversation = newConv;
        if (!assignedAgent && conversation) {
          await supabase.from("wa_queue").insert({
            conversation_id: conversation.id, reason: "No available agent",
          });
        }
      }

      if (!conversation) continue;

      let content = message.text?.body || null;
      let mediaType = "text";
      let mediaUrl: string | null = null;
      let mediaMimeType: string | null = null;
      let mediaFilename: string | null = null;

      if (message.type === "image") {
        mediaType = "image"; mediaMimeType = message.image.mime_type;
        content = message.image.caption || null;
        try { mediaUrl = await downloadAndUploadToStorage(supabase, message.image.id, mediaMimeType); } catch (e) { console.error(e); }
      } else if (message.type === "video") {
        mediaType = "video"; mediaMimeType = message.video.mime_type;
        content = message.video.caption || null;
        try { mediaUrl = await downloadAndUploadToStorage(supabase, message.video.id, mediaMimeType); } catch (e) { console.error(e); }
      } else if (message.type === "audio") {
        mediaType = "audio"; mediaMimeType = message.audio.mime_type;
        try { mediaUrl = await downloadAndUploadToStorage(supabase, message.audio.id, mediaMimeType); } catch (e) { console.error(e); }
      } else if (message.type === "document") {
        mediaType = "document"; mediaMimeType = message.document.mime_type;
        mediaFilename = message.document.filename;
        content = message.document.caption || null;
        try { mediaUrl = await downloadAndUploadToStorage(supabase, message.document.id, mediaMimeType); } catch (e) { console.error(e); }
      } else if (message.type === "sticker") {
        mediaType = "sticker"; mediaMimeType = "image/webp";
        try { mediaUrl = await downloadAndUploadToStorage(supabase, message.sticker.id, "image/webp"); } catch (e) { console.error(e); }
      }

      await supabase.from("wa_messages").insert({
        conversation_id: conversation.id,
        sender_type: "customer",
        content, media_type: mediaType, media_url: mediaUrl,
        media_mime_type: mediaMimeType, media_filename: mediaFilename,
        whatsapp_message_id: message.id,
        external_message_id: message.id,
        direction: "inbound",
        delivery_status: "delivered",
        channel: "whatsapp",
      });

      await supabase.from("wa_conversations").update({
        last_message_preview: content || `[${mediaType}]`,
        last_message_at: new Date().toISOString(),
        unread_count: (conversation.unread_count || 0) + 1,
        customer_name: customerName || conversation.customer_name,
      }).eq("id", conversation.id);

      // Mark inbound event processed
      await supabase.from("wa_inbound_events")
        .update({ processing_status: "processed", processed_at: new Date().toISOString(), conversation_id: conversation.id })
        .eq("id", evtRow!.id);

      if (content && mediaType === "text") {
        try {
          await fetch(`${supabaseUrl}/functions/v1/whatsapp-ai-respond`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
            body: JSON.stringify({ conversation_id: conversation.id, message_content: content, customer_phone: from }),
          });
        } catch (e) { console.error("AI auto-response error:", e); }
      }
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function findAvailableAgent(supabase: any): Promise<string | null> {
  const { data: configs } = await supabase
    .from("wa_agent_config")
    .select("*")
    .eq("is_available", true);

  if (!configs?.length) return null;

  for (const config of configs) {
    const today = new Date().toISOString().split("T")[0];
    if (config.last_reset_date !== today) {
      await supabase
        .from("wa_agent_config")
        .update({ messages_sent_today: 0, last_reset_date: today })
        .eq("id", config.id);
      config.messages_sent_today = 0;
    }

    if (config.messages_sent_today >= config.daily_message_limit) continue;

    const { count } = await supabase
      .from("wa_conversations")
      .select("id", { count: "exact", head: true })
      .eq("assigned_agent_id", config.agent_id)
      .eq("status", "active");

    if ((count || 0) < config.max_active_chats) {
      return config.agent_id;
    }
  }

  return null;
}

/**
 * Downloads media from Meta's API and uploads to Supabase Storage.
 * Returns the storage object key.
 */
async function downloadAndUploadToStorage(supabase: any, mediaId: string, mimeType: string): Promise<string | null> {
  try {
    const token = await resolveWhatsAppToken(supabase);

    // Step 1: Get media URL from Meta
    const mediaResp = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const mediaData = await mediaResp.json();

    if (!mediaData.url) {
      console.error("No media URL from Meta:", mediaData);
      return null;
    }

    // Step 2: Download the media binary
    const downloadResp = await fetch(mediaData.url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const arrayBuffer = await downloadResp.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Step 3: Upload to Supabase Storage
    const ext = mimeType.split("/")[1]?.split(";")[0] || "bin";
    const key = `${Date.now()}-${mediaId.slice(-8)}.${ext}`;

    const { error } = await supabase.storage.from(BUCKET).upload(key, bytes, {
      contentType: mimeType,
      upsert: false,
    });

    if (error) {
      console.error("Storage upload failed:", error);
      return null;
    }

    return key;
  } catch (e) {
    console.error("Media download/upload error:", e);
    return null;
  }
}
