import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BUCKET = "whatsapp-media";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // GET = download/proxy from Supabase Storage
    if (req.method === "GET") {
      const url = new URL(req.url);
      const key = url.searchParams.get("key");
      if (!key) {
        return new Response(JSON.stringify({ error: "Missing key parameter" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase.storage.from(BUCKET).download(key);
      if (error || !data) {
        console.error("Storage download failed:", error);
        return new Response(JSON.stringify({ error: "File not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const contentType = data.type || "application/octet-stream";
      const arrayBuffer = await data.arrayBuffer();

      return new Response(arrayBuffer, {
        headers: {
          ...corsHeaders,
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    // POST = upload to Supabase Storage
    if (req.method === "POST") {
      const { data: bodyData, mime_type, filename } = await req.json();

      if (!bodyData || !mime_type) {
        return new Response(JSON.stringify({ error: "Missing data or mime_type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Decode base64
      const binaryStr = atob(bodyData);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const ext = mime_type.split("/")[1]?.split(";")[0] || "bin";
      const key = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

      const { error } = await supabase.storage.from(BUCKET).upload(key, bytes, {
        contentType: mime_type,
        upsert: false,
      });

      if (error) {
        console.error("Storage upload failed:", error);
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
