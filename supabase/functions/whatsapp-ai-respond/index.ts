import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper: get setting from DB, fallback to env var
async function getSetting(supabase: any, key: string, envFallback?: string): Promise<string> {
  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (data?.value) return data.value;
  return envFallback ? (Deno.env.get(envFallback) || "") : "";
}

/** Canonical WhatsApp credential resolver (mirrors whatsapp-send). */
async function resolveWhatsAppCreds(supabase: any): Promise<{ token: string; phoneId: string }> {
  const token =
    (await getSetting(supabase, "meta_whatsapp_access_token")) ||
    (await getSetting(supabase, "meta_whatsapp_token")) ||
    Deno.env.get("META_WHATSAPP_TOKEN") || "";
  const { data: integ } = await supabase
    .from("channel_integrations")
    .select("config")
    .eq("channel_type", "whatsapp")
    .maybeSingle();
  const phoneId =
    integ?.config?.phone_number_id ||
    (await getSetting(supabase, "meta_whatsapp_phone_id")) ||
    Deno.env.get("META_WHATSAPP_PHONE_ID") || "";
  return { token, phoneId };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const aiApiKey = Deno.env.get("AI_API_KEY");
  const aiGatewayUrl = Deno.env.get("AI_GATEWAY_URL") ?? "https://openrouter.ai/api/v1/chat/completions";
  const supabase = createClient(supabaseUrl, supabaseKey);

  if (!aiApiKey) {
    return new Response(JSON.stringify({ error: "AI_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { conversation_id, message_content, customer_phone } = await req.json();

    // Check if AI is enabled
    const aiEnabled = await getSetting(supabase, "wa_ai_enabled");
    if (aiEnabled === "false") {
      return new Response(JSON.stringify({ status: "ai_disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get AI model from settings
    const aiModel = await getSetting(supabase, "wa_ai_model") || "google/gemini-3-flash-preview";
    const autoSendHigh = await getSetting(supabase, "wa_ai_auto_send_high") !== "false";
    const extraPrompt = await getSetting(supabase, "wa_ai_system_prompt_extra");

    // Get all products with variants for context
    const { data: products } = await supabase
      .from("products")
      .select("id, name, base_price, description, category, product_variants(name, price)")
      .eq("is_active", true);

    const productList = (products || [])
      .map((p: any) => {
        let info = `- ${p.name} (${p.category || "General"}): $${p.base_price}`;
        if (p.product_variants?.length) {
          info += "\n  Variants: " + p.product_variants.map((v: any) => `${v.name}: $${v.price}`).join(", ");
        }
        return info;
      })
      .join("\n");

    const { data: templates } = await supabase
      .from("message_templates")
      .select("name, body, category")
      .eq("is_active", true);

    const templateList = (templates || [])
      .map((t: any) => `[${t.category}] ${t.name}: ${t.body.substring(0, 100)}`)
      .join("\n");

    let systemPrompt = `You are an AI assistant for a software subscription business. Your job is to analyze customer WhatsApp messages and determine if you can auto-respond.

PRODUCTS AVAILABLE:
${productList}

RESPONSE TEMPLATES:
${templateList}

RULES:
1. If the customer is asking about a product price, find the matching product (handle variations like "GPT" = "ChatGPT Plus", "Netflix" etc.)
2. Rate your confidence: "high" (exact match, clear intent), "medium" (probable match, slightly ambiguous), "low" (unclear, complex query)
3. For high confidence: provide the auto-reply text
4. For medium: provide a suggested reply for the agent to review
5. For low: respond with null (let human handle)

Respond ONLY in this JSON format:
{
  "confidence": "high" | "medium" | "low",
  "detected_intent": "string describing what customer wants",
  "matched_product_name": "product name or null",
  "matched_product_id": "product uuid or null",
  "suggested_response": "the reply text or null"
}`;

    if (extraPrompt) {
      systemPrompt += `\n\nADDITIONAL INSTRUCTIONS:\n${extraPrompt}`;
    }

    const aiResponse = await fetch(aiGatewayUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Customer message: "${message_content}"` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_message",
              description: "Analyze customer message and return structured response",
              parameters: {
                type: "object",
                properties: {
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                  detected_intent: { type: "string" },
                  matched_product_name: { type: "string", nullable: true },
                  matched_product_id: { type: "string", nullable: true },
                  suggested_response: { type: "string", nullable: true },
                },
                required: ["confidence", "detected_intent"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_message" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      return new Response(JSON.stringify({ status: "no_analysis" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    
    const shouldAutoSend = autoSendHigh && analysis.confidence === "high";

    const { data: logEntry } = await supabase.from("wa_auto_response_log").insert({
      conversation_id,
      detected_intent: analysis.detected_intent,
      matched_product_id: analysis.matched_product_id || null,
      confidence: analysis.confidence,
      suggested_response: analysis.suggested_response,
      was_sent: shouldAutoSend,
    }).select().single();

    if (shouldAutoSend && analysis.suggested_response) {
      // Route through the canonical whatsapp-send pipeline so AI replies
      // obey the same transport, status, idempotency, retry, and logging rules
      // as agent replies. No more direct Graph calls here.
      const idempotencyKey = `ai_${conversation_id}_${Date.now()}`;
      const { data: sendData, error: sendError } = await supabase.functions.invoke("whatsapp-send", {
        body: {
          conversation_id,
          content: analysis.suggested_response,
          idempotency_key: idempotencyKey,
        },
      });
      if (sendError) {
        console.error("AI send via whatsapp-send failed:", sendError);
      } else if (sendData?.message?.id) {
        // Mark the message row as AI-generated (whatsapp-send wrote it as agent).
        await supabase.from("wa_messages")
          .update({ sender_type: "ai", is_ai_generated: true })
          .eq("id", sendData.message.id);
      }
    }

    return new Response(JSON.stringify({ status: "ok", analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI respond error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
