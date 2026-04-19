import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type ChannelType = "whatsapp" | "messenger" | "instagram";
type Action = "test_connection" | "refresh_health" | "clear_error";

interface RequestBody {
  channel_type: ChannelType;
  action: Action;
}

const GRAPH = "https://graph.facebook.com/v19.0";

async function getSecret(supabase: any, key: string): Promise<string | null> {
  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return data?.value ?? null;
}

async function probeWhatsApp(supabase: any, config: any) {
  const phoneId = config?.phone_number_id;
  const token = await getSecret(supabase, "meta_whatsapp_access_token");
  if (!phoneId) return { ok: false, field: "phone_number_id", error: "Missing phone_number_id" };
  if (!token) return { ok: false, field: "access_token", error: "Missing access_token" };
  const res = await fetch(`${GRAPH}/${phoneId}?fields=verified_name,quality_rating`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  if (!res.ok) {
    const msg = body?.error?.message ?? `HTTP ${res.status}`;
    const field = /token/i.test(msg) ? "access_token" : "phone_number_id";
    return { ok: false, field, error: msg };
  }
  return { ok: true, info: body };
}

async function probeMessenger(supabase: any, config: any) {
  const pageId = config?.page_id;
  const token = await getSecret(supabase, "meta_messenger_page_access_token");
  if (!pageId) return { ok: false, field: "page_id", error: "Missing page_id" };
  if (!token) return { ok: false, field: "page_access_token", error: "Missing page_access_token" };
  const res = await fetch(`${GRAPH}/${pageId}?fields=name,id`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  if (!res.ok) {
    const msg = body?.error?.message ?? `HTTP ${res.status}`;
    const field = /token/i.test(msg) ? "page_access_token" : "page_id";
    return { ok: false, field, error: msg };
  }
  return { ok: true, info: body };
}

async function probeInstagram(supabase: any, config: any) {
  const igId = config?.instagram_business_account_id;
  const token = await getSecret(supabase, "meta_instagram_access_token");
  if (!igId) return { ok: false, field: "instagram_business_account_id", error: "Missing IG business account id" };
  if (!token) return { ok: false, field: "access_token", error: "Missing access_token" };
  const res = await fetch(`${GRAPH}/${igId}?fields=username,name`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  if (!res.ok) {
    const msg = body?.error?.message ?? `HTTP ${res.status}`;
    const field = /token/i.test(msg) ? "access_token" : "instagram_business_account_id";
    return { ok: false, field, error: msg };
  }
  return { ok: true, info: body };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin role
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", claims.claims.sub)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as RequestBody;
    if (!body?.channel_type || !body?.action) {
      return new Response(JSON.stringify({ error: "Invalid body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service-role client for writes
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: integration } = await admin
      .from("channel_integrations")
      .select("*")
      .eq("channel_type", body.channel_type)
      .maybeSingle();

    if (!integration) {
      return new Response(JSON.stringify({ error: "Channel not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "clear_error") {
      const { data: updated } = await admin
        .from("channel_integrations")
        .update({ last_error: null, last_error_at: null, last_error_field: null })
        .eq("id", integration.id)
        .select()
        .single();
      return new Response(JSON.stringify({ ok: true, integration: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result;
    if (body.channel_type === "whatsapp") result = await probeWhatsApp(admin, integration.config);
    else if (body.channel_type === "messenger") result = await probeMessenger(admin, integration.config);
    else result = await probeInstagram(admin, integration.config);

    const now = new Date().toISOString();
    const update: any = { last_health_check_at: now };
    if (result.ok) {
      update.status = integration.enabled ? "healthy" : "disabled";
      update.last_success_at = now;
      update.last_error = null;
      update.last_error_at = null;
      update.last_error_field = null;
    } else {
      update.status = "error";
      update.last_error = result.error;
      update.last_error_at = now;
      update.last_error_field = result.field;
    }

    const { data: updated } = await admin
      .from("channel_integrations")
      .update(update)
      .eq("id", integration.id)
      .select()
      .single();

    return new Response(JSON.stringify({ ok: result.ok, result, integration: updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("channel-health-check error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
