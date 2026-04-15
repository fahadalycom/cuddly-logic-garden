import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // GET = download/proxy from R2
    if (req.method === "GET") {
      const url = new URL(req.url);
      const key = url.searchParams.get("key");
      if (!key) {
        return new Response(JSON.stringify({ error: "Missing key parameter" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const r2 = getR2Client();
      const r2Url = getR2Url(key);

      const r2Response = await r2.fetch(r2Url, { method: "GET" });

      if (!r2Response.ok) {
        console.error("R2 download failed:", r2Response.status, await r2Response.text());
        return new Response(JSON.stringify({ error: "File not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const contentType = r2Response.headers.get("content-type") || "application/octet-stream";
      const body = await r2Response.arrayBuffer();

      return new Response(body, {
        headers: {
          ...corsHeaders,
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    // POST = upload to R2
    if (req.method === "POST") {
      const { data, mime_type, filename } = await req.json();

      if (!data || !mime_type) {
        return new Response(JSON.stringify({ error: "Missing data or mime_type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Decode base64
      const binaryStr = atob(data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const ext = mime_type.split("/")[1]?.split(";")[0] || "bin";
      const key = `whatsapp/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

      const r2 = getR2Client();
      const r2Url = getR2Url(key);

      const uploadResp = await r2.fetch(r2Url, {
        method: "PUT",
        headers: { "Content-Type": mime_type },
        body: bytes,
      });

      if (!uploadResp.ok) {
        const errText = await uploadResp.text();
        console.error("R2 upload failed:", uploadResp.status, errText);
        return new Response(JSON.stringify({ error: "Upload failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ key, mime_type, filename: filename || key }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  } catch (error) {
    console.error("whatsapp-media error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
