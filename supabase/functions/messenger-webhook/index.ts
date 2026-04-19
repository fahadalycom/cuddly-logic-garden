// Unified webhook for Facebook Messenger + Instagram Messaging.
// Meta delivers both on the Graph API webhook with `object: 'page' | 'instagram'`.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ChannelType = "messenger" | "instagram";
// channel_type (integration) -> conversation_channel (conversations table)
const CONV_CHANNEL: Record<ChannelType, string> = {
  messenger: "facebook",
  instagram: "instagram",
};

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

      // Match against either messenger or instagram integration
      const { data: integrations } = await supabase
        .from("channel_integrations")
        .select("channel_type, verify_token")
        .in("channel_type", ["messenger", "instagram"]);

      const matched = integrations?.find((i: any) => i.verify_token && i.verify_token === token);
      if (mode === "subscribe" && matched) {
        return new Response(challenge, { status: 200 });
      }
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

    for (const entry of body.entry ?? []) {
      const events = entry.messaging ?? entry.changes ?? [];
      for (const evt of events) {
        // Normalise Messenger/IG event shape
        const messaging = evt.message ? evt : evt.value ?? evt;
        const senderId = messaging.sender?.id;
        const recipientId = messaging.recipient?.id;
        const messageId = messaging.message?.mid ?? messaging.message?.id ?? `evt_${entry.id}_${messaging.timestamp ?? Date.now()}`;
        const text = messaging.message?.text ?? messaging.postback?.title ?? null;

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

          // Find or create conversation by (channel, external_user_id)
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

          // Insert inbound message (idempotent via unique index on channel+external_message_id)
          const { error: msgErr } = await supabase.from("wa_messages").insert({
            conversation_id: conversation.id,
            sender_type: "customer",
            content: text,
            media_type: "text",
            external_message_id: messageId,
            channel: convChannel,
            direction: "inbound",
            delivery_status: "delivered",
          });
          // Ignore duplicate-key errors from the unique index
          if (msgErr && !String(msgErr.message).includes("duplicate key")) throw msgErr;

          // Update conversation last-message + unread
          await supabase.from("wa_conversations").update({
            last_message_preview: text || "[media]",
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
