// Hybrid AI assist: classify, summarize, rewrite-template, suggest-reply.
// All prompts live server-side. Uses any OpenAI-compatible chat completions API
// (configure AI_GATEWAY_URL and AI_API_KEY as function secrets).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = Deno.env.get("AI_GATEWAY_URL") ?? "https://openrouter.ai/api/v1/chat/completions";
const MODEL = Deno.env.get("AI_MODEL") ?? "google/gemini-3-flash-preview";

type Msg = { role: "system" | "user" | "assistant"; content: string };

async function callAI(messages: Msg[], tools?: unknown, tool_choice?: unknown) {
  const key = Deno.env.get("AI_API_KEY");
  if (!key) throw new Error("AI_API_KEY missing");
  const body: Record<string, unknown> = { model: MODEL, messages };
  if (tools) body.tools = tools;
  if (tool_choice) body.tool_choice = tool_choice;

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 429) {
    return { error: "rate_limited", status: 429 };
  }
  if (res.status === 402) {
    return { error: "payment_required", status: 402 };
  }
  if (!res.ok) {
    const t = await res.text();
    console.error("ai gateway error", res.status, t);
    return { error: "ai_gateway_error", status: 500, detail: t };
  }
  return await res.json();
}

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, payload } = await req.json();

    if (type === "classify") {
      // Classify a conversation excerpt into queue + priority + next_action
      const tools = [{
        type: "function",
        function: {
          name: "classify_conversation",
          description: "Pick best queue, priority and next action.",
          parameters: {
            type: "object",
            properties: {
              queue: { type: "string", enum: ["sales", "support", "payment", "renewal", "general"] },
              priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
              next_action: {
                type: "string",
                enum: ["send_product_info", "create_order", "create_ticket",
                       "transfer_to_payments", "transfer_to_support",
                       "transfer_to_renewals", "follow_up_later", "request_payment_proof"],
              },
              reason: { type: "string" },
            },
            required: ["queue", "priority", "next_action", "reason"],
            additionalProperties: false,
          },
        },
      }];
      const messages: Msg[] = [
        { role: "system", content: "You triage WhatsApp messages for a subscription business (Pakistan). Return only the function call." },
        { role: "user", content: `Recent messages:\n${payload.transcript}\n\nCustomer: ${payload.customer_name ?? "unknown"}` },
      ];
      const out = await callAI(messages, tools, { type: "function", function: { name: "classify_conversation" } });
      if (out.error) return jsonResp(out, out.status);
      const call = out.choices?.[0]?.message?.tool_calls?.[0];
      const args = call ? JSON.parse(call.function.arguments) : null;
      return jsonResp({ ok: true, result: args });
    }

    if (type === "summarize") {
      const target = payload.target ?? "conversation"; // conversation | ticket | handoff
      const messages: Msg[] = [
        { role: "system", content: `You are an internal CRM assistant. Write a 1-2 sentence ${target} summary for the next agent. No greetings. English. Plain text.` },
        { role: "user", content: payload.context ?? "" },
      ];
      const out = await callAI(messages);
      if (out.error) return jsonResp(out, out.status);
      const text = out.choices?.[0]?.message?.content?.trim() ?? "";
      return jsonResp({ ok: true, summary: text });
    }

    if (type === "rewrite_template") {
      // Personalize a template with conversation context
      const messages: Msg[] = [
        { role: "system", content: "Rewrite the template to fit the customer's last message. Keep tone professional and concise. Reply in the same language as the customer. Return only the message text — no preamble." },
        { role: "user", content: `Template:\n${payload.template}\n\nCustomer last messages:\n${payload.transcript}\n\nCustomer name: ${payload.customer_name ?? "Customer"}` },
      ];
      const out = await callAI(messages);
      if (out.error) return jsonResp(out, out.status);
      const text = out.choices?.[0]?.message?.content?.trim() ?? "";
      return jsonResp({ ok: true, reply: text });
    }

    if (type === "suggest_reply") {
      // No template — generate a draft from scratch (still requires user review before send)
      const messages: Msg[] = [
        { role: "system", content: "Draft a short professional WhatsApp reply for a subscription business. Reply in the same language as the customer. 2-4 sentences. Return only the reply text." },
        { role: "user", content: `Conversation:\n${payload.transcript}\n\nCustomer name: ${payload.customer_name ?? "Customer"}` },
      ];
      const out = await callAI(messages);
      if (out.error) return jsonResp(out, out.status);
      const text = out.choices?.[0]?.message?.content?.trim() ?? "";
      return jsonResp({ ok: true, reply: text });
    }

    return jsonResp({ error: "unknown_type" }, 400);
  } catch (e) {
    console.error("ai-assist error", e);
    return jsonResp({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
