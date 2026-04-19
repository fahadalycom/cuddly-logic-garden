// Unified webhook for Facebook Messenger + Instagram Messaging.
// Meta delivers both on the Graph API webhook with `object: 'page' | 'instagram'`.
// Conversation matching rule (priority 14):
//   1. (channel + external_user_id) — primary
//   2. else create new conversation
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "whatsapp-media";

type ChannelType = "messenger" | "instagram";
const CONV_CHANNEL: Record<ChannelType, string> = {
  messenger: "facebook",
  instagram: "instagram",
};

async function getSetting(supabase: any, key: string): Promise<string | null> {
  const { data } = await supabase.from("system_settings").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}

function extFromMime(mime: string): string {
  const m: Record<string, string> = {
    "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp",
    "video/mp4": "mp4", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/ogg": "ogg",
    "application/pdf": "pdf",
  };
  return m[mime] || (mime.split("/")[1] ?? "bin");
}

function attachmentMediaType(metaType: string): "image" | "video" | "audio" | "document" {
  if (metaType === "image") return "image";
  if (metaType === "video") return "video";
  if (metaType === "audio") return "audio";
  return "document"; // includes "file", "fallback", "story_mention", etc.
}

/** Download an inbound media URL and rehost it in our public bucket. */
async function rehostInboundMedia(
  supabase: any,
  conversationId: string,
  attachment: any,
  pageToken: string | null,
): Promise<{ url: string; mime: string; mediaType: "image" | "video" | "audio" | "document"; filename: string } | null> {
  try {
    const url: string | undefined = attachment?.payload?.url;
    if (!url) return null;
    // FB CDN URLs don't require auth, but pass token anyway when available.
    const headers: Record<string, string> = {};
    if (pageToken) headers["Authorization"] = `Bearer ${pageToken}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.error("Inbound media fetch failed", res.status, await res.text());
      return null;
    }
    const mime = res.headers.get("content-type")?.split(";")[0].trim() || "application/octet-stream";
    const bytes = new Uint8Array(await res.arrayBuffer());
    const ext = extFromMime(mime);
    const filename = `inbound_${Date.now()}.${ext}`;
    const path = `inbound/${conversationId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType: mime, upsert: false,
    });
    if (upErr) {
      console.error("Inbound media upload failed", upErr);
      return null;
    }
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return {
      url: pub.publicUrl,
      mime,
      mediaType: attachmentMediaType(String(attachment?.type ?? "file")),
      filename,
    };
  } catch (e) {
    console.error("rehostInboundMedia error", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // ---- GET: webhook verification handshake ----
    if (req.method === "GET") {
      const url = new URL(req.url);
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      const { data: integrations } = await supabase
        .from("channel_integrations")
        .select("channel_type, verify_token")
        .in("channel_type", ["messenger", "instagram"]);

      const matched = integrations?.find((i: any) => i.verify_token && i.verify_token === token);
      if (mode === "subscribe" && matched) return new Response(challenge, { status: 200 });
      return new Response("Forbidden", { status: 403 });
    }

    // ---- POST: incoming events ----
    const body = await req.json();
    const objectType = body.object as string | undefined;
    const channel: ChannelType = objectType === "instagram" ? "instagram" : "messenger";
    const convChannel = CONV_CHANNEL[channel];

    const { data: integration } = await supabase
      .from("channel_integrations")
      .select("id")
      .eq("channel_type", channel)
      .maybeSingle();

    const integrationId = integration?.id ?? null;

    const pageToken = channel === "messenger"
      ? await getSetting(supabase, "meta_messenger_page_access_token")
      : await getSetting(supabase, "meta_instagram_access_token");

    for (const entry of body.entry ?? []) {
      const events = entry.messaging ?? entry.changes ?? [];
      for (const evt of events) {
        const messaging = evt.message ? evt : evt.value ?? evt;

        // ---- Delivery receipts ----
        if (messaging.delivery?.mids?.length) {
          const mids: string[] = messaging.delivery.mids;
          await supabase.from("wa_messages")
            .update({ delivery_status: "delivered", delivered_at: new Date().toISOString() })
            .in("external_message_id", mids)
            .eq("channel", convChannel)
            .in("delivery_status", ["sent_to_api", "sending", "queued"]);
          continue;
        }

        // ---- Read receipts (watermark = ms epoch) ----
        if (messaging.read?.watermark) {
          const watermarkIso = new Date(Number(messaging.read.watermark)).toISOString();
          const senderId = messaging.sender?.id;
          if (senderId) {
            // Mark all outbound messages in matching conversation up to watermark as read.
            const { data: conv } = await supabase
              .from("wa_conversations")
              .select("id")
              .eq("channel", convChannel)
              .eq("external_user_id", senderId)
              .neq("status", "archived")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (conv?.id) {
              await supabase.from("wa_messages")
                .update({ delivery_status: "read", read_at: new Date().toISOString() })
                .eq("conversation_id", conv.id)
                .eq("direction", "outbound")
                .lte("created_at", watermarkIso)
                .in("delivery_status", ["sent_to_api", "delivered"]);
            }
          }
          continue;
        }

        const senderId = messaging.sender?.id;
        const recipientId = messaging.recipient?.id;
        const messageId = messaging.message?.mid ?? messaging.message?.id ?? `evt_${entry.id}_${messaging.timestamp ?? Date.now()}`;
        const text = messaging.message?.text ?? messaging.postback?.title ?? null;
        const attachments: any[] = messaging.message?.attachments ?? [];

        // Idempotent log of raw event
        const { data: dup } = await supabase
          .from("wa_inbound_events")
          .select("id")
          .eq("channel", convChannel)
          .eq("external_message_id", messageId)
          .maybeSingle();
        if (dup) continue;

        const { data: evtRow } = await supabase.from("wa_inbound_events").insert({
          channel: convChannel,
          integration_id: integrationId,
          event_type: messaging.message ? "message" : "event",
          raw_payload: messaging,
          external_message_id: messageId,
          processing_status: "pending",
        }).select().single();

        try {
          if (!senderId) throw new Error("missing sender id");

          // Match by (channel + external_user_id) — see top-of-file rule.
          let { data: conversation } = await supabase
            .from("wa_conversations")
            .select("*")
            .eq("channel", convChannel)
            .eq("external_user_id", senderId)
            .neq("status", "archived")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!conversation) {
            const placeholderPhone = `${channel}:${senderId}`;
            const { data: newConv, error: convErr } = await supabase.from("wa_conversations").insert({
              customer_phone: placeholderPhone,
              customer_name: null,
              channel: convChannel,
              external_user_id: senderId,
              external_conversation_id: recipientId ?? null,
              integration_id: integrationId,
              status: "waiting",
            }).select().single();
            if (convErr) throw convErr;
            conversation = newConv;
          }

          if (!conversation) throw new Error("conversation not created");

          // Rehost first attachment (if any) into our bucket.
          let mediaInfo: { url: string; mime: string; mediaType: "image"|"video"|"audio"|"document"; filename: string } | null = null;
          if (attachments.length > 0) {
            mediaInfo = await rehostInboundMedia(supabase, conversation.id, attachments[0], pageToken);
          }

          const { error: msgErr } = await supabase.from("wa_messages").insert({
            conversation_id: conversation.id,
            sender_type: "customer",
            content: text,
            media_type: mediaInfo?.mediaType ?? "text",
            media_url: mediaInfo?.url ?? null,
            media_mime_type: mediaInfo?.mime ?? null,
            media_filename: mediaInfo?.filename ?? null,
            external_message_id: messageId,
            channel: convChannel,
            direction: "inbound",
            delivery_status: "delivered",
          });
          if (msgErr && !String(msgErr.message).includes("duplicate key")) throw msgErr;

          const preview = text || (mediaInfo ? `[${mediaInfo.mediaType}]` : "[media]");
          await supabase.from("wa_conversations").update({
            last_message_preview: preview,
            last_message_at: new Date().toISOString(),
            unread_count: (conversation.unread_count || 0) + 1,
          }).eq("id", conversation.id);

          await supabase.from("wa_inbound_events")
            .update({ processing_status: "processed", processed_at: new Date().toISOString(), conversation_id: conversation.id })
            .eq("id", evtRow!.id);
        } catch (e) {
          await supabase.from("wa_inbound_events")
            .update({ processing_status: "failed", error_message: (e as Error).message })
            .eq("id", evtRow!.id);
          if (integrationId) {
            await supabase.from("channel_integrations").update({
              last_error: (e as Error).message,
              last_error_at: new Date().toISOString(),
              status: "warning",
            }).eq("id", integrationId);
          }
        }
      }
    }

    if (integrationId) {
      await supabase.from("channel_integrations").update({
        last_inbound_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
      }).eq("id", integrationId);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("messenger-webhook error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
