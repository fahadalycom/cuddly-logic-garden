import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { conversation_id, content, media_url, media_type, sender_id } = await req.json();

    if (!conversation_id || (!content && !media_url)) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get conversation
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

    const token = Deno.env.get("META_WHATSAPP_TOKEN")!;
    const phoneId = Deno.env.get("META_WHATSAPP_PHONE_ID")!;

    // Build WhatsApp API message
    let messagePayload: any = {
      messaging_product: "whatsapp",
      to: conversation.customer_phone,
    };

    if (media_type && media_type !== "text" && media_url) {
      messagePayload.type = media_type;
      messagePayload[media_type] = { link: media_url };
      if (content) messagePayload[media_type].caption = content;
    } else {
      messagePayload.type = "text";
      messagePayload.text = { body: content };
    }

    // Send via Meta API
    const waResponse = await fetch(
      `https://graph.facebook.com/v19.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messagePayload),
      }
    );

    const waResult = await waResponse.json();

    if (!waResponse.ok) {
      console.error("WhatsApp API error:", waResult);
      return new Response(JSON.stringify({ error: "Failed to send message", details: waResult }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const waMessageId = waResult.messages?.[0]?.id;

    // Store sent message
    const { data: storedMessage } = await supabase.from("wa_messages").insert({
      conversation_id,
      sender_type: "agent",
      sender_id,
      content,
      media_url,
      media_type: media_type || "text",
      whatsapp_message_id: waMessageId,
      is_read: true,
    }).select().single();

    // Update conversation
    await supabase
      .from("wa_conversations")
      .update({
        last_message_preview: content || `[${media_type}]`,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversation_id);

    // Increment agent daily message count
    if (sender_id) {
      const today = new Date().toISOString().split("T")[0];
      const { data: agentConfig } = await supabase
        .from("wa_agent_config")
        .select("*")
        .eq("agent_id", sender_id)
        .single();

      if (agentConfig) {
        const count = agentConfig.last_reset_date === today ? agentConfig.messages_sent_today + 1 : 1;
        await supabase
          .from("wa_agent_config")
          .update({ messages_sent_today: count, last_reset_date: today })
          .eq("id", agentConfig.id);
      }
    }

    return new Response(JSON.stringify({ success: true, message: storedMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Send error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
