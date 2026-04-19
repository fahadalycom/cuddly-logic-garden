import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { message_id } = await req.json();
    if (!message_id) {
      return json({ success: false, error: "message_id required" }, 400);
    }

    const { data: msg } = await supabase
      .from("wa_messages")
      .select("*")
      .eq("id", message_id)
      .single();

    if (!msg) return json({ success: false, error: "Message not found" }, 404);
    if (!["failed", "permanently_failed"].includes(msg.delivery_status)) {
      return json({ success: false, error: `Message is in status "${msg.delivery_status}", cannot retry` }, 400);
    }
    if ((msg.retry_count ?? 0) >= (msg.max_retries ?? 3)) {
      await supabase.from("wa_messages")
        .update({ delivery_status: "permanently_failed" })
        .eq("id", message_id);
      return json({ success: false, error: "Max retries exhausted" }, 400);
    }

    // Mark as retrying
    await supabase.from("wa_messages")
      .update({
        delivery_status: "retrying",
        retry_count: (msg.retry_count ?? 0) + 1,
        last_retry_at: new Date().toISOString(),
      })
      .eq("id", message_id);

    // Re-invoke send pipeline with same idempotency_key
    const idempotencyKey = msg.idempotency_key ?? crypto.randomUUID();
    const { error: sendErr } = await supabase.functions.invoke("whatsapp-send", {
      body: {
        conversation_id: msg.conversation_id,
        content: msg.content,
        media_url: msg.media_url,
        media_type: msg.media_type,
        media_mime_type: msg.media_mime_type,
        media_filename: msg.media_filename,
        sender_id: msg.sender_id,
        idempotency_key: idempotencyKey,
        retry_of_message_id: message_id,
      },
    });

    if (sendErr) {
      await supabase.from("wa_messages")
        .update({ delivery_status: "failed", error_message: sendErr.message })
        .eq("id", message_id);
      return json({ success: false, error: sendErr.message });
    }
    return json({ success: true });
  } catch (e) {
    return json({ success: false, error: (e as Error).message }, 500);
  }

  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
