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
    .single();
  if (data?.value) return data.value;
  return envFallback ? (Deno.env.get(envFallback) || "") : "";
}
async function uploadMediaToWhatsApp(
  supabase: any,
  storageKey: string,
  mimeType: string,
  token: string,
  phoneId: string
): Promise<string | null> {
  try {
    // Download from Supabase Storage
    const { data, error } = await supabase.storage.from(BUCKET).download(storageKey);
    if (error || !data) {
      console.error("Storage download failed:", error);
      return null;
    }
    const fileBytes = new Uint8Array(await data.arrayBuffer());
    const contentType = mimeType || data.type || "application/octet-stream";
    const cleanMime = contentType.split(";")[0].trim();

    const extMap: Record<string, string> = {
      "audio/ogg": "ogg",
      "audio/webm": "webm",
      "audio/mpeg": "mp3",
      "audio/mp4": "m4a",
      "image/jpeg": "jpg",
      "image/png": "png",
      "video/mp4": "mp4",
      "application/pdf": "pdf",
    };
    const ext = extMap[cleanMime] || cleanMime.split("/")[1] || "bin";
    const filename = `media.${ext}`;

    console.log(`Uploading to WhatsApp: mime=${cleanMime}, size=${fileBytes.length}, filename=${filename}`);

    const boundary = `----FormBoundary${crypto.randomUUID().replace(/-/g, "")}`;
    const encoder = new TextEncoder();

    const parts: Uint8Array[] = [];
    parts.push(encoder.encode(
      `--${boundary}\r\nContent-Disposition: form-data; name="messaging_product"\r\n\r\nwhatsapp\r\n`
    ));
    parts.push(encoder.encode(
      `--${boundary}\r\nContent-Disposition: form-data; name="type"\r\n\r\n${cleanMime}\r\n`
    ));
    parts.push(encoder.encode(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${cleanMime}\r\n\r\n`
    ));
    parts.push(fileBytes);
    parts.push(encoder.encode(`\r\n--${boundary}--\r\n`));

    let totalLength = 0;
    for (const p of parts) totalLength += p.length;
    const body = new Uint8Array(totalLength);
    let offset = 0;
    for (const p of parts) {
      body.set(p, offset);
      offset += p.length;
    }

    const uploadResp = await fetch(
      `https://graph.facebook.com/v19.0/${phoneId}/media`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
        },
        body: body,
      }
    );

    const uploadResult = await uploadResp.json();
    if (!uploadResp.ok) {
      console.error("WhatsApp media upload failed:", JSON.stringify(uploadResult));
      return null;
    }

    console.log("WhatsApp media uploaded, id:", uploadResult.id);
    return uploadResult.id;
  } catch (err) {
    console.error("uploadMediaToWhatsApp error:", err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const {
      conversation_id, content, media_url, media_type, media_mime_type, media_filename, sender_id,
      idempotency_key, retry_of_message_id,
    } = await req.json();

    if (!conversation_id || (!content && !media_url)) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency: if a message with this key already exists, return it (no double send)
    if (idempotency_key && !retry_of_message_id) {
      const { data: existing } = await supabase
        .from("wa_messages")
        .select("*")
        .eq("idempotency_key", idempotency_key)
        .maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ success: true, message: existing, deduped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: conversation } = await supabase
      .from("wa_conversations")
      .select("*")
      .eq("id", conversation_id)
      .single();

    if (!conversation) {
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert/locate message row in queued state
    let messageId: string;
    if (retry_of_message_id) {
      messageId = retry_of_message_id;
      await supabase.from("wa_messages")
        .update({ delivery_status: "sending" })
        .eq("id", messageId);
    } else {
      const { data: inserted, error: insErr } = await supabase.from("wa_messages").insert({
        conversation_id,
        sender_type: "agent",
        sender_id,
        content,
        media_url,
        media_type: media_type || "text",
        media_mime_type: media_mime_type || null,
        media_filename: media_filename || null,
        is_read: true,
        direction: "outbound",
        delivery_status: "sending",
        idempotency_key: idempotency_key || null,
        channel: "whatsapp",
      }).select().single();
      if (insErr || !inserted) {
        return new Response(JSON.stringify({ error: insErr?.message || "Insert failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      messageId = inserted.id;
    }

    const token = await getSettingValue(supabase, "meta_whatsapp_token", "META_WHATSAPP_TOKEN");
    const phoneId = await getSettingValue(supabase, "meta_whatsapp_phone_id", "META_WHATSAPP_PHONE_ID");

    let messagePayload: any = {
      messaging_product: "whatsapp",
      to: conversation.customer_phone,
    };

    if (media_type && media_type !== "text" && media_url) {
      const waMediaType = media_type === "audio" ? "audio" : media_type;
      const actualMime = media_mime_type || (waMediaType === "audio" ? "audio/ogg" : "application/octet-stream");
      const mediaId = await uploadMediaToWhatsApp(supabase, media_url, actualMime, token, phoneId);
      if (mediaId) {
        messagePayload.type = waMediaType;
        messagePayload[waMediaType] = { id: mediaId };
        if (content) messagePayload[waMediaType].caption = content;
      } else {
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
        const proxyUrl = `${supabaseUrl}/functions/v1/whatsapp-media?key=${encodeURIComponent(media_url)}&apikey=${encodeURIComponent(anonKey)}`;
        messagePayload.type = waMediaType;
        messagePayload[waMediaType] = { link: proxyUrl };
        if (content) messagePayload[waMediaType].caption = content;
      }
    } else {
      messagePayload.type = "text";
      messagePayload.text = { body: content };
    }

    let waMessageId: string | null = null;
    let providerResponse: any = null;
    let errorCode: string | null = null;
    let errorMessage: string | null = null;
    let deliveryFailed = false;

    try {
      const waResponse = await fetch(
        `https://graph.facebook.com/v19.0/${phoneId}/messages`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(messagePayload),
        }
      );
      providerResponse = await waResponse.json();
      if (!waResponse.ok) {
        deliveryFailed = true;
        errorCode = String(providerResponse?.error?.code ?? waResponse.status);
        errorMessage = providerResponse?.error?.message || "Meta API error";
      } else {
        waMessageId = providerResponse.messages?.[0]?.id || null;
      }
    } catch (apiErr) {
      deliveryFailed = true;
      errorMessage = (apiErr as Error).message;
    }

    // Transition message to final transport state
    const updates: Record<string, unknown> = {
      provider_response: providerResponse,
    };
    if (deliveryFailed) {
      updates.delivery_status = "failed";
      updates.error_code = errorCode;
      updates.error_message = errorMessage;
    } else {
      updates.delivery_status = "sent_to_api";
      updates.external_message_id = waMessageId;
      updates.whatsapp_message_id = waMessageId;
      updates.sent_at = new Date().toISOString();
    }
    const { data: storedMessage } = await supabase
      .from("wa_messages")
      .update(updates)
      .eq("id", messageId)
      .select()
      .single();

    await supabase
      .from("wa_conversations")
      .update({
        last_message_preview: content || `[${media_type}]`,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversation_id);

    if (sender_id) {
      const today = new Date().toISOString().split("T")[0];
      const { data: agentConfig } = await supabase
        .from("wa_agent_config").select("*").eq("agent_id", sender_id).single();
      if (agentConfig) {
        const count = agentConfig.last_reset_date === today ? agentConfig.messages_sent_today + 1 : 1;
        await supabase.from("wa_agent_config")
          .update({ messages_sent_today: count, last_reset_date: today })
          .eq("id", agentConfig.id);
      }
    }

    if (deliveryFailed) {
      return new Response(JSON.stringify({
        success: false,
        error: errorMessage || "Message saved but WhatsApp delivery failed.",
        message: storedMessage,
      }), {
        status: 207,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message: storedMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Send error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
