import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getR2Client() {
  return new AwsClient({
    accessKeyId: Deno.env.get("CLOUDFLARE_R2_ACCESS_KEY")!,
    secretAccessKey: Deno.env.get("CLOUDFLARE_R2_SECRET_KEY")!,
    service: "s3",
  });
}

function getR2Url(key: string) {
  const endpoint = Deno.env.get("CLOUDFLARE_R2_ENDPOINT")!;
  const bucket = Deno.env.get("CLOUDFLARE_R2_BUCKET")!;
  return `${endpoint}/${bucket}/${key}`;
}

// Download file from R2 and upload directly to WhatsApp Media API, return media ID
async function uploadMediaToWhatsApp(
  r2Key: string,
  mimeType: string,
  token: string,
  phoneId: string
): Promise<string | null> {
  try {
    // 1. Download from R2
    const r2 = getR2Client();
    const r2Url = getR2Url(r2Key);
    const r2Response = await r2.fetch(r2Url, { method: "GET" });
    if (!r2Response.ok) {
      console.error("R2 download failed:", r2Response.status);
      return null;
    }
    const fileBytes = new Uint8Array(await r2Response.arrayBuffer());
    const contentType = r2Response.headers.get("content-type") || mimeType || "application/octet-stream";

    // Determine filename extension
    const extMap: Record<string, string> = {
      "audio/ogg": "ogg",
      "audio/ogg;codecs=opus": "ogg",
      "audio/webm": "webm",
      "audio/webm;codecs=opus": "webm",
      "audio/mpeg": "mp3",
      "audio/mp4": "m4a",
      "image/jpeg": "jpg",
      "image/png": "png",
      "video/mp4": "mp4",
      "application/pdf": "pdf",
    };
    const cleanMime = contentType.split(";")[0].trim();
    const ext = extMap[contentType] || extMap[cleanMime] || cleanMime.split("/")[1] || "bin";
    const filename = `media.${ext}`;

    // 2. Upload to WhatsApp Media API using multipart/form-data
    const boundary = `----FormBoundary${crypto.randomUUID().replace(/-/g, "")}`;
    const encoder = new TextEncoder();

    const parts: Uint8Array[] = [];
    // messaging_product field
    parts.push(encoder.encode(
      `--${boundary}\r\nContent-Disposition: form-data; name="messaging_product"\r\n\r\nwhatsapp\r\n`
    ));
    // type field
    parts.push(encoder.encode(
      `--${boundary}\r\nContent-Disposition: form-data; name="type"\r\n\r\n${cleanMime}\r\n`
    ));
    // file field
    parts.push(encoder.encode(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${cleanMime}\r\n\r\n`
    ));
    parts.push(fileBytes);
    parts.push(encoder.encode(`\r\n--${boundary}--\r\n`));

    // Combine all parts
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
      // Upload media directly to WhatsApp's Media API (solves unreachable proxy URL issue)
      const waMediaType = media_type === "audio" ? "audio" : media_type;
      const mediaId = await uploadMediaToWhatsApp(media_url, waMediaType === "audio" ? "audio/ogg" : "", token, phoneId);

      if (mediaId) {
        messagePayload.type = waMediaType;
        messagePayload[waMediaType] = { id: mediaId };
        if (content) messagePayload[waMediaType].caption = content;
      } else {
        // Fallback: still try with link (less reliable)
        console.warn("Direct upload failed, falling back to link method");
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

    // Send via Meta API
    let waMessageId: string | null = null;
    let deliveryFailed = false;

    try {
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
        console.error("WhatsApp API error:", JSON.stringify(waResult));
        deliveryFailed = true;
      } else {
        waMessageId = waResult.messages?.[0]?.id || null;
        console.log("Message sent, wa_id:", waMessageId);
      }
    } catch (apiErr) {
      console.error("WhatsApp API fetch error:", apiErr);
      deliveryFailed = true;
    }

    // Always store sent message in DB regardless of delivery status
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

    if (deliveryFailed) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Message saved but WhatsApp delivery failed. Check META_WHATSAPP_TOKEN.", 
        message: storedMessage 
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
