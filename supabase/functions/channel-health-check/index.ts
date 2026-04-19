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

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getSecret(supabase: any, key: string): Promise<string | null> {
  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return data?.value ?? null;
}

interface ProbeResult {
  ok: boolean;
  field?: string;
  error?: string;
  http_status?: number;
  graph_error?: any;
  endpoint?: string;
  info?: any;
  hint?: string;
}

function classifyMetaError(body: any, status: number): { field: string; hint: string } {
  const code = body?.error?.code;
  const subcode = body?.error?.error_subcode;
  const msg = String(body?.error?.message ?? "").toLowerCase();
  // OAuth / token problems
  if (status === 401 || code === 190 || code === 102 || code === 463 || code === 467 || /token/i.test(msg) || /oauth/i.test(msg) || /session.*expired/i.test(msg)) {
    return { field: "access_token", hint: "Access token is invalid, expired, or lacks required permissions. Generate a new token in Meta Business Suite." };
  }
  // Permission scope
  if (status === 403 || code === 200 || code === 10 || /permission/i.test(msg) || /scope/i.test(msg)) {
    return { field: "access_token", hint: "Token is valid but missing required permissions (whatsapp_business_messaging / pages_messaging). Re-authorize with the right scopes." };
  }
  // Bad object id (phone / page / IG id)
  if (status === 404 || code === 803 || /unknown path/i.test(msg) || /does not exist/i.test(msg) || /unsupported.*get.*request/i.test(msg)) {
    return { field: "object_id", hint: "The Phone Number ID / Page ID / IG account ID does not exist or this token cannot access it." };
  }
  if (status === 400 && /invalid parameter/i.test(msg)) {
    return { field: "object_id", hint: "Meta rejected the object ID as invalid. Double-check it in Meta Dashboard." };
  }
  return { field: "access_token", hint: `Meta Graph error ${code ?? status}${subcode ? "/" + subcode : ""}: ${body?.error?.message ?? "Unknown"}` };
}

async function probeGraph(endpoint: string, token: string): Promise<{ status: number; body: any; ok: boolean }> {
  try {
    const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
    let body: any = null;
    const text = await res.text();
    try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
    return { status: res.status, body, ok: res.ok };
  } catch (e) {
    return { status: 0, body: { error: { message: e instanceof Error ? e.message : "Network error" } }, ok: false };
  }
}

async function probeWhatsApp(supabase: any, config: any): Promise<ProbeResult> {
  const phoneId = config?.phone_number_id;
  // Try several token sources
  const token =
    (await getSecret(supabase, "meta_whatsapp_access_token")) ||
    Deno.env.get("META_WHATSAPP_TOKEN") ||
    null;
  if (!phoneId) return { ok: false, field: "phone_number_id", error: "Phone Number ID is not set in the integration config.", hint: "Add the WhatsApp Phone Number ID and save." };
  if (!token) return { ok: false, field: "access_token", error: "Access token is not configured (system_settings.meta_whatsapp_access_token / META_WHATSAPP_TOKEN missing).", hint: "Save the Access Token in the form, or set the META_WHATSAPP_TOKEN secret." };

  const endpoint = `${GRAPH}/${phoneId}?fields=verified_name,quality_rating,display_phone_number`;
  const { status, body, ok } = await probeGraph(endpoint, token);
  if (!ok) {
    const cls = classifyMetaError(body, status);
    return {
      ok: false,
      field: cls.field === "object_id" ? "phone_number_id" : cls.field,
      error: body?.error?.message ?? `HTTP ${status}`,
      http_status: status,
      graph_error: body?.error ?? body,
      endpoint,
      hint: cls.hint,
    };
  }
  return { ok: true, info: body, endpoint, http_status: status };
}

async function probeMessenger(supabase: any, config: any): Promise<ProbeResult> {
  const pageId = config?.page_id;
  const token = await getSecret(supabase, "meta_messenger_page_access_token");
  if (!pageId) return { ok: false, field: "page_id", error: "Page ID is not set.", hint: "Add the Facebook Page ID." };
  if (!token) return { ok: false, field: "page_access_token", error: "Page Access Token is not configured.", hint: "Save a Page Access Token in the form." };

  const endpoint = `${GRAPH}/${pageId}?fields=name,id,category`;
  const { status, body, ok } = await probeGraph(endpoint, token);
  if (!ok) {
    const cls = classifyMetaError(body, status);
    return {
      ok: false,
      field: cls.field === "object_id" ? "page_id" : "page_access_token",
      error: body?.error?.message ?? `HTTP ${status}`,
      http_status: status,
      graph_error: body?.error ?? body,
      endpoint,
      hint: cls.hint,
    };
  }
  return { ok: true, info: body, endpoint, http_status: status };
}

async function probeInstagram(supabase: any, config: any): Promise<ProbeResult> {
  const igId = config?.instagram_business_account_id;
  const token = await getSecret(supabase, "meta_instagram_access_token");
  if (!igId) return { ok: false, field: "instagram_business_account_id", error: "Instagram Business Account ID is not set.", hint: "Add the IG Business Account ID." };
  if (!token) return { ok: false, field: "access_token", error: "Instagram access token is not configured.", hint: "Save an Access Token in the form." };

  const endpoint = `${GRAPH}/${igId}?fields=username,name,id`;
  const { status, body, ok } = await probeGraph(endpoint, token);
  if (!ok) {
    const cls = classifyMetaError(body, status);
    return {
      ok: false,
      field: cls.field === "object_id" ? "instagram_business_account_id" : "access_token",
      error: body?.error?.message ?? `HTTP ${status}`,
      http_status: status,
      graph_error: body?.error ?? body,
      endpoint,
      hint: cls.hint,
    };
  }
  return { ok: true, info: body, endpoint, http_status: status };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(401, { ok: false, error: "Unauthorized: missing bearer token", code: "no_auth" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    // Validate user via getUser (works with current SDK)
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return jsonResponse(401, { ok: false, error: `Unauthorized: ${userErr?.message ?? "no user"}`, code: "auth_failed" });
    }
    const userId = userData.user.id;

    // Verify admin role
    const { data: roleRow, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleErr) {
      return jsonResponse(500, { ok: false, error: `Role check failed: ${roleErr.message}`, code: "role_check_error" });
    }
    if (!roleRow) {
      return jsonResponse(403, { ok: false, error: "Admin role required to test channel integrations.", code: "not_admin" });
    }

    let body: RequestBody;
    try {
      body = (await req.json()) as RequestBody;
    } catch {
      return jsonResponse(400, { ok: false, error: "Invalid JSON body", code: "bad_json" });
    }
    if (!body?.channel_type || !body?.action) {
      return jsonResponse(400, { ok: false, error: "Missing channel_type or action", code: "bad_request" });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: integration, error: intErr } = await admin
      .from("channel_integrations")
      .select("*")
      .eq("channel_type", body.channel_type)
      .maybeSingle();

    if (intErr) {
      return jsonResponse(500, { ok: false, error: `DB error loading integration: ${intErr.message}`, code: "db_error" });
    }
    if (!integration) {
      return jsonResponse(404, { ok: false, error: `No integration row for channel ${body.channel_type}`, code: "not_found" });
    }

    if (body.action === "clear_error") {
      const { data: updated, error: updErr } = await admin
        .from("channel_integrations")
        .update({ last_error: null, last_error_at: null, last_error_field: null })
        .eq("id", integration.id)
        .select()
        .single();
      if (updErr) return jsonResponse(500, { ok: false, error: updErr.message, code: "db_update_error" });
      return jsonResponse(200, { ok: true, integration: updated });
    }

    let result: ProbeResult;
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
      // Compose a detailed error string we persist for UI display
      const detail = [
        result.error,
        result.http_status ? `(HTTP ${result.http_status})` : "",
        result.hint ? `— ${result.hint}` : "",
      ].filter(Boolean).join(" ");
      update.last_error = detail.slice(0, 1000);
      update.last_error_at = now;
      update.last_error_field = result.field ?? null;
    }

    const { data: updated, error: updErr } = await admin
      .from("channel_integrations")
      .update(update)
      .eq("id", integration.id)
      .select()
      .single();

    if (updErr) {
      // Still return the probe result even if DB write failed
      return jsonResponse(200, { ok: result.ok, result, integration, db_warning: updErr.message });
    }

    return jsonResponse(200, { ok: result.ok, result, integration: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const stack = e instanceof Error ? e.stack : undefined;
    console.error("channel-health-check fatal:", msg, stack);
    return jsonResponse(500, { ok: false, error: msg, code: "fatal", stack });
  }
});
