// Scheduled scanner: detects SLA breaches, offline agents, and overflow buildup,
// then triggers reassignment + redistribution via the SQL routing functions.
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
    const { data: stale, error: staleErr } = await supabase.rpc("reassign_stale_conversations");
    const { data: redist, error: redistErr } = await supabase.rpc("redistribute_overflow");

    if (staleErr) console.error("reassign_stale error:", staleErr);
    if (redistErr) console.error("redistribute error:", redistErr);

    return new Response(
      JSON.stringify({ ok: true, stale, redist, ranAt: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("scanner error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
