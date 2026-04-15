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
    const { action, agent_id, conversation_id } = await req.json();

    if (action === "process_queue") {
      // Find available agents and assign waiting conversations
      const { data: configs } = await supabase
        .from("wa_agent_config")
        .select("*")
        .eq("is_available", true);

      let assigned = 0;

      for (const config of configs || []) {
        const today = new Date().toISOString().split("T")[0];
        if (config.last_reset_date !== today) {
          await supabase
            .from("wa_agent_config")
            .update({ messages_sent_today: 0, last_reset_date: today })
            .eq("id", config.id);
          config.messages_sent_today = 0;
        }

        if (config.messages_sent_today >= config.daily_message_limit) continue;

        // Count current active chats
        const { count: activeCount } = await supabase
          .from("wa_conversations")
          .select("id", { count: "exact", head: true })
          .eq("assigned_agent_id", config.agent_id)
          .eq("status", "active");

        const available = config.max_active_chats - (activeCount || 0);
        if (available <= 0) continue;

        // Get waiting queue items
        const { data: queueItems } = await supabase
          .from("wa_queue")
          .select("*")
          .eq("status", "waiting")
          .order("priority", { ascending: false })
          .order("created_at", { ascending: true })
          .limit(available);

        for (const item of queueItems || []) {
          await supabase
            .from("wa_conversations")
            .update({ assigned_agent_id: config.agent_id, status: "active" })
            .eq("id", item.conversation_id);

          await supabase
            .from("wa_queue")
            .update({ status: "assigned", assigned_to: config.agent_id, assigned_at: new Date().toISOString() })
            .eq("id", item.id);

          assigned++;
        }
      }

      return new Response(JSON.stringify({ status: "ok", assigned }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "resolve_conversation") {
      // Mark conversation as resolved and process queue
      await supabase
        .from("wa_conversations")
        .update({ status: "resolved" })
        .eq("id", conversation_id);

      // Auto-assign next from queue
      if (agent_id) {
        const { data: nextInQueue } = await supabase
          .from("wa_queue")
          .select("*")
          .eq("status", "waiting")
          .order("priority", { ascending: false })
          .order("created_at", { ascending: true })
          .limit(1)
          .single();

        if (nextInQueue) {
          await supabase
            .from("wa_conversations")
            .update({ assigned_agent_id: agent_id, status: "active" })
            .eq("id", nextInQueue.conversation_id);

          await supabase
            .from("wa_queue")
            .update({ status: "assigned", assigned_to: agent_id, assigned_at: new Date().toISOString() })
            .eq("id", nextInQueue.id);
        }
      }

      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "assign_conversation") {
      await supabase
        .from("wa_conversations")
        .update({ assigned_agent_id: agent_id, status: "active" })
        .eq("id", conversation_id);

      // Remove from queue if exists
      await supabase
        .from("wa_queue")
        .update({ status: "assigned", assigned_to: agent_id, assigned_at: new Date().toISOString() })
        .eq("conversation_id", conversation_id)
        .eq("status", "waiting");

      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Queue manager error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
