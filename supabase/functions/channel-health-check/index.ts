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

// Marker prefix on channel_integrations.last_error so the UI can detect
// token-expiry without adding a new enum value to channel_status.
const EXPIRED_MARKER = "[EXPIRED_TOKEN] ";

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
  /** When true the failure is caused by an invalid/expired/missing OAuth token */
  expired?: boolean;
  /** Optional structured checks list for the UI */
  checks?: Array<{ name: string; ok: boolean; detail?: string }>;
}

interface ClassifiedError {
  field: string;
  hint: string;
  expired: boolean;
}

function classifyMetaError(body: any, status: number): ClassifiedError {
  const code = body?.error?.code;
  const subcode = body?.error?.error_subcode;
  const msg = String(body?.error?.message ?? "").toLowerCase();

  // Session/token expired (Meta subcodes 463, 467; code 190 = invalid OAuth)
  if (
    subcode === 463 || subcode === 467 ||
    code === 190 || code === 102 ||
    /session.*expired/i.test(msg) || /access token.*expired/i.test(msg) ||
    /token.*expired/i.test(msg)
  ) {
    return {
      field: "access_token",
      hint: "Access token has expired or been revoked. Generate a new long-lived token in Meta Business Suite and paste it here.",
      expired: true,
    };
  }
  // Generic OAuth/auth failure
  if (status === 401 || /oauth/i.test(msg) || /token/i.test(msg)) {
    return {
      field: "access_token",
      hint: "Access token is invalid. Generate a new token in Meta Business Suite.",
      expired: true,
    };
  }
  // Permission scope (code 200, 10)
  if (status === 403 || code === 200 || code === 10 || /permission/i.test(msg) || /scope/i.test(msg)) {
    return {
      field: "access_token",
      hint: "Token is valid but missing required permissions (whatsapp_business_messaging / pages_messaging / instagram_manage_messages). Re-authorize with the right scopes.",
      expired: false,
    };
  }
  // Field-level query bug (our code asked for a non-existent field) — not a config issue
  if (/nonexisting field/i.test(msg)) {
    return {
      field: "access_token",
      hint: "Graph API rejected a requested field. The probe has been updated — please retry Test Connection.",
      expired: false,
    };
  }
  // Bad object id (phone / page / IG id)
  if (status === 404 || code === 803 || code === 100 || /unknown path/i.test(msg) || /does not exist/i.test(msg) || /unsupported.*get.*request/i.test(msg)) {
    return {
      field: "object_id",
      hint: "The Phone Number ID / Page ID / IG account ID does not exist or this token cannot access it.",
      expired: false,
    };
  }
  if (status === 400 && /invalid parameter/i.test(msg)) {
    return {
      field: "object_id",
      hint: "Meta rejected the object ID as invalid. Double-check it in Meta Dashboard.",
      expired: false,
    };
  }
  return {
    field: "access_token",
    hint: `Meta Graph error ${code ?? status}${subcode ? "/" + subcode : ""}: ${body?.error?.message ?? "Unknown"}`,
    expired: false,
  };
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

function failFromGraph(
  body: any,
  status: number,
  endpoint: string,
  fieldOverrides: { object?: string; token: string },
  checks: Array<{ name: string; ok: boolean; detail?: string }>,
): ProbeResult {
  const cls = classifyMetaError(body, status);
  return {
    ok: false,
    field: cls.field === "object_id" ? fieldOverrides.object ?? "object_id" : fieldOverrides.token,
    error: body?.error?.message ?? `HTTP ${status}`,
    http_status: status,
    graph_error: body?.error ?? body,
    endpoint,
    hint: cls.hint,
    expired: cls.expired,
    checks,
  };
}

// ---------- WhatsApp deep probe ----------
async function probeWhatsApp(supabase: any, config: any): Promise<ProbeResult> {
  const phoneId: string | undefined = config?.phone_number_id;
  const wabaId: string | undefined = config?.whatsapp_business_account_id;
  const token =
    (await getSecret(supabase, "meta_whatsapp_access_token")) ||
    (await getSecret(supabase, "meta_whatsapp_token")) ||
    Deno.env.get("META_WHATSAPP_TOKEN") ||
    null;
  const checks: Array<{ name: string; ok: boolean; detail?: string }> = [];

  if (!phoneId) return { ok: false, field: "phone_number_id", error: "Phone Number ID is not set.", hint: "Add the WhatsApp Phone Number ID and save.", checks };
  if (!token) return { ok: false, field: "access_token", error: "Access token is not configured.", hint: "Save the WhatsApp Access Token (or set META_WHATSAPP_TOKEN secret).", checks };

  // Step 1: phone number profile (only universally-valid fields)
  const phoneEp = `${GRAPH}/${phoneId}?fields=verified_name,quality_rating,display_phone_number,code_verification_status,platform_type`;
  const phoneRes = await probeGraph(phoneEp, token);
  if (!phoneRes.ok) {
    checks.push({ name: "Phone Number ID reachable", ok: false, detail: phoneRes.body?.error?.message });
    return failFromGraph(phoneRes.body, phoneRes.status, phoneEp, { object: "phone_number_id", token: "access_token" }, checks);
  }
  checks.push({ name: "Phone Number ID reachable", ok: true, detail: phoneRes.body?.verified_name ?? phoneRes.body?.display_phone_number });

  // Step 2: confirm WABA exists (if provided)
  if (wabaId) {
    const wabaEp = `${GRAPH}/${wabaId}?fields=id,name`;
    const wabaRes = await probeGraph(wabaEp, token);
    if (!wabaRes.ok) {
      checks.push({ name: "WABA reachable", ok: false, detail: wabaRes.body?.error?.message });
      return failFromGraph(wabaRes.body, wabaRes.status, wabaEp, { object: "whatsapp_business_account_id", token: "access_token" }, checks);
    }
    checks.push({ name: "WABA reachable", ok: true, detail: wabaRes.body?.name });
  }

  return { ok: true, info: phoneRes.body, endpoint: phoneEp, http_status: phoneRes.status, checks };
}

// ---------- Messenger deep probe ----------
async function probeMessenger(supabase: any, config: any): Promise<ProbeResult> {
  const pageId: string | undefined = config?.page_id;
  const token = await getSecret(supabase, "meta_messenger_page_access_token");
  const checks: Array<{ name: string; ok: boolean; detail?: string }> = [];

  if (!pageId) return { ok: false, field: "page_id", error: "Page ID is not set.", hint: "Add the Facebook Page ID.", checks };
  if (!token) return { ok: false, field: "page_access_token", error: "Page Access Token is not configured.", hint: "Save a Page Access Token in the form.", checks };

  // Step 1: page is reachable with this token
  const pageEp = `${GRAPH}/${pageId}?fields=id,name,category`;
  const pageRes = await probeGraph(pageEp, token);
  if (!pageRes.ok) {
    checks.push({ name: "Page reachable with token", ok: false, detail: pageRes.body?.error?.message });
    return failFromGraph(pageRes.body, pageRes.status, pageEp, { object: "page_id", token: "page_access_token" }, checks);
  }
  checks.push({ name: "Page reachable with token", ok: true, detail: pageRes.body?.name });

  // Step 2: confirm token is *this* page's token (me === pageId)
  const meEp = `${GRAPH}/me?fields=id,name`;
  const meRes = await probeGraph(meEp, token);
  if (!meRes.ok) {
    checks.push({ name: "Token identity (/me)", ok: false, detail: meRes.body?.error?.message });
    return failFromGraph(meRes.body, meRes.status, meEp, { object: "page_id", token: "page_access_token" }, checks);
  }
  if (meRes.body?.id && meRes.body.id !== pageId) {
    checks.push({ name: "Token identity (/me)", ok: false, detail: `Token belongs to ${meRes.body.id}, not page ${pageId}` });
    return {
      ok: false,
      field: "page_access_token",
      error: `This is not a Page Access Token for page ${pageId}. Token identifies as ${meRes.body.id}.`,
      hint: "Generate a Page Access Token from the correct Facebook Page in Meta Business Suite.",
      info: meRes.body,
      endpoint: meEp,
      http_status: meRes.status,
      checks,
    };
  }
  checks.push({ name: "Token identity (/me)", ok: true, detail: meRes.body?.name });

  return { ok: true, info: pageRes.body, endpoint: pageEp, http_status: pageRes.status, checks };
}

// ---------- Instagram deep probe ----------
async function probeInstagram(supabase: any, config: any): Promise<ProbeResult> {
  const igId: string | undefined = config?.instagram_business_account_id;
  const pageId: string | undefined = config?.page_id;
  const token = await getSecret(supabase, "meta_instagram_access_token");
  const checks: Array<{ name: string; ok: boolean; detail?: string }> = [];

  if (!igId) return { ok: false, field: "instagram_business_account_id", error: "Instagram Business Account ID is not set.", hint: "Add the IG Business Account ID.", checks };
  if (!token) return { ok: false, field: "access_token", error: "Instagram access token is not configured.", hint: "Save an Access Token in the form.", checks };

  // Step 1: IG account reachable
  const igEp = `${GRAPH}/${igId}?fields=id,username,name`;
  const igRes = await probeGraph(igEp, token);
  if (!igRes.ok) {
    checks.push({ name: "IG account reachable", ok: false, detail: igRes.body?.error?.message });
    return failFromGraph(igRes.body, igRes.status, igEp, { object: "instagram_business_account_id", token: "access_token" }, checks);
  }
  checks.push({ name: "IG account reachable", ok: true, detail: igRes.body?.username });

  // Step 2: confirm Page ↔ IG linkage when both provided
  if (pageId) {
    const linkEp = `${GRAPH}/${pageId}?fields=instagram_business_account`;
    const linkRes = await probeGraph(linkEp, token);
    if (!linkRes.ok) {
      checks.push({ name: "Page ↔ IG linkage", ok: false, detail: linkRes.body?.error?.message });
      return failFromGraph(linkRes.body, linkRes.status, linkEp, { object: "page_id", token: "access_token" }, checks);
    }
    const linkedIg = linkRes.body?.instagram_business_account?.id ?? null;
    if (linkedIg && linkedIg !== igId) {
      checks.push({ name: "Page ↔ IG linkage", ok: false, detail: `Page links to IG ${linkedIg}, not ${igId}` });
      return {
        ok: false,
        field: "instagram_business_account_id",
        error: `Page ${pageId} is linked to IG ${linkedIg}, not the configured ${igId}.`,
        hint: "Update the Instagram Business Account ID to match the linked account, or change the connected page.",
        info: linkRes.body,
        endpoint: linkEp,
        http_status: linkRes.status,
        checks,
      };
    }
    checks.push({ name: "Page ↔ IG linkage", ok: true, detail: linkedIg ?? "linked" });
  }

  return { ok: true, info: igRes.body, endpoint: igEp, http_status: igRes.status, checks };
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

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return jsonResponse(401, { ok: false, error: `Unauthorized: ${userErr?.message ?? "no user"}`, code: "auth_failed" });
    }
    const userId = userData.user.id;

    const { data: roleRow, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleErr) return jsonResponse(500, { ok: false, error: `Role check failed: ${roleErr.message}`, code: "role_check_error" });
    if (!roleRow) return jsonResponse(403, { ok: false, error: "Admin role required to test channel integrations.", code: "not_admin" });

    let body: RequestBody;
    try { body = (await req.json()) as RequestBody; }
    catch { return jsonResponse(400, { ok: false, error: "Invalid JSON body", code: "bad_json" }); }
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

    if (intErr) return jsonResponse(500, { ok: false, error: `DB error loading integration: ${intErr.message}`, code: "db_error" });
    if (!integration) return jsonResponse(404, { ok: false, error: `No integration row for channel ${body.channel_type}`, code: "not_found" });

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
      // channel_status enum has no 'expired' — flag via marker prefix in last_error.
      update.status = "error";
      const detail = [
        result.error,
        result.http_status ? `(HTTP ${result.http_status})` : "",
        result.hint ? `— ${result.hint}` : "",
      ].filter(Boolean).join(" ");
      update.last_error = (result.expired ? EXPIRED_MARKER : "") + detail.slice(0, 1000);
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
