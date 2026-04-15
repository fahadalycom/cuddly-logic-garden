import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BUCKET = "whatsapp-media";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Webhook verification (GET)
    if (req.method === "GET") {
      const url = new URL(req.url);
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");
      const verifyToken = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN");

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

    if (!value?.messages?.length) {
      return new Response(JSON.stringify({ status: "no_messages" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const message of value.messages) {
      const from = message.from;
      const waId = value.contacts?.[0]?.wa_id;
      const customerName = value.contacts?.[0]?.profile?.name || null;

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
          .from("clients")
          .select("id")
          .eq("whatsapp_number", from)
          .single();

        if (!client) {
          const { data: newClient } = await supabase
            .from("clients")
            .insert({ name: customerName || from, whatsapp_number: from, phone: from })
            .select("id")
            .single();
          client = newClient;
        }

        const assignedAgent = await findAvailableAgent(supabase);
        const status = assignedAgent ? "active" : "waiting";

        const { data: newConv } = await supabase
          .from("wa_conversations")
          .insert({
            customer_phone: from,
            customer_name: customerName,
            customer_whatsapp_id: waId,
            client_id: client?.id,
            assigned_agent_id: assignedAgent,
            status,
          })
          .select()
          .single();

        conversation = newConv;

        if (!assignedAgent && conversation) {
          await supabase.from("wa_queue").insert({
            conversation_id: conversation.id,
            reason: "No available agent",
          });
        }
      }

      if (!conversation) continue;

      // Determine media
      let content = message.text?.body || null;
      let mediaType = "text";
      let mediaUrl: string | null = null;
      let mediaMimeType: string | null = null;
      let mediaFilename: string | null = null;

      if (message.type === "image") {
        mediaType = "image";
        mediaMimeType = message.image.mime_type;
        content = message.image.caption || null;
        try { mediaUrl = await downloadAndUploadToStorage(supabase, message.image.id, mediaMimeType); } catch (e) { console.error("Image upload failed:", e); }
      } else if (message.type === "video") {
        mediaType = "video";
        mediaMimeType = message.video.mime_type;
        content = message.video.caption || null;
        try { mediaUrl = await downloadAndUploadToStorage(supabase, message.video.id, mediaMimeType); } catch (e) { console.error("Video upload failed:", e); }
      } else if (message.type === "audio") {
        mediaType = "audio";
        mediaMimeType = message.audio.mime_type;
        try { mediaUrl = await downloadAndUploadToStorage(supabase, message.audio.id, mediaMimeType); } catch (e) { console.error("Audio upload failed:", e); }
      } else if (message.type === "document") {
        mediaType = "document";
        mediaMimeType = message.document.mime_type;
        mediaFilename = message.document.filename;
        content = message.document.caption || null;
        try { mediaUrl = await downloadAndUploadToStorage(supabase, message.document.id, mediaMimeType); } catch (e) { console.error("Document upload failed:", e); }
      } else if (message.type === "sticker") {
        mediaType = "sticker";
        mediaMimeType = "image/webp";
        try { mediaUrl = await downloadAndUploadToStorage(supabase, message.sticker.id, "image/webp"); } catch (e) { console.error("Sticker upload failed:", e); }
      }

      // Store message
      await supabase.from("wa_messages").insert({
        conversation_id: conversation.id,
        sender_type: "customer",
        content,
        media_type: mediaType,
        media_url: mediaUrl,
        media_mime_type: mediaMimeType,
        media_filename: mediaFilename,
        whatsapp_message_id: message.id,
      });

      await supabase
        .from("wa_conversations")
        .update({
          last_message_preview: content || `[${mediaType}]`,
          last_message_at: new Date().toISOString(),
          unread_count: (conversation.unread_count || 0) + 1,
          customer_name: customerName || conversation.customer_name,
        })
        .eq("id", conversation.id);

      // Trigger AI auto-response for text messages
      if (content && mediaType === "text") {
        try {
          await fetch(`${supabaseUrl}/functions/v1/whatsapp-ai-respond`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              conversation_id: conversation.id,
              message_content: content,
              customer_phone: from,
            }),
          });
        } catch (e) {
          console.error("AI auto-response error:", e);
        }
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
    const token = Deno.env.get("META_WHATSAPP_TOKEN")!;

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
