import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STORAGE_PATTERNS = [
  /\/storage\/v1\/object\/(?:public|authenticated)\/([^/]+)\/(.+?)(?:\?|$)/i,
  /\/storage\/v1\/object\/sign\/([^/]+)\/(.+?)(?:\?|$)/i,
];

function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  for (const p of STORAGE_PATTERNS) {
    const m = url.match(p);
    if (m) return { bucket: decodeURIComponent(m[1]), path: decodeURIComponent(m[2]) };
  }
  return null;
}

Deno.serve(async (req) => {
  console.log("notify-n8n invoked", req.method, req.url);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const webhookUrl = Deno.env.get("N8N_PDF_WEBHOOK_URL");
    if (!webhookUrl) {
      console.error("N8N_PDF_WEBHOOK_URL not configured");
      throw new Error("N8N_PDF_WEBHOOK_URL not configured");
    }
    console.log("webhookUrl host:", new URL(webhookUrl).host);

    // Auth check: nur eingeloggte (auch anonyme) User dürfen den n8n-Workflow triggern
    const authHeader = req.headers.get("Authorization");
    console.log("auth header present:", !!authHeader);
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized - no bearer" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supaUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    console.log("getUser result:", { hasUser: !!userData?.user, err: userErr?.message });
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized - invalid token", details: userErr?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    console.log("notify-n8n payload:", { rapport_id: payload?.rapport_id });

    // Validate rapport exists
    const admin = createClient(supaUrl, serviceKey);
    if (payload?.rapport_id) {
      const { data: rap } = await admin
        .from("arbeitsrapporte")
        .select("id")
        .eq("id", payload.rapport_id)
        .maybeSingle();
      if (!rap) {
        return new Response(JSON.stringify({ error: "rapport not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // PDF-URL in eine Signed URL umwandeln (Bucket ist jetzt privat).
    // Gültigkeit 1h sollte für n8n-Workflows ausreichen.
    if (typeof payload?.pdf_url === "string") {
      const target = parseStorageUrl(payload.pdf_url);
      if (target) {
        const { data: signed, error: signErr } = await admin.storage
          .from(target.bucket)
          .createSignedUrl(target.path, 3600);
        if (signErr) console.warn("createSignedUrl failed", signErr);
        if (signed?.signedUrl) payload.pdf_url = signed.signedUrl;
      }
    }

    const cfClientId = Deno.env.get("CF_ACCESS_CLIENT_ID");
    const cfClientSecret = Deno.env.get("CF_ACCESS_CLIENT_SECRET");

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (cfClientId && cfClientSecret) {
      headers["CF-Access-Client-Id"] = cfClientId;
      headers["CF-Access-Client-Secret"] = cfClientSecret;
    } else {
      console.warn("CF_ACCESS_* not set — Cloudflare Access will likely block");
    }

    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const text = await resp.text();
    console.log("n8n response", resp.status, text.slice(0, 500));

    const looksLikeCfLogin = text.includes("Cloudflare Access") && text.includes("Sign in");
    const realOk = resp.ok && !looksLikeCfLogin;

    if (!realOk) {
      return new Response(
        JSON.stringify({
          ok: false,
          status: resp.status,
          error: looksLikeCfLogin ? "blocked-by-cloudflare-access" : "webhook-error",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ ok: true, status: resp.status, body: text.slice(0, 500) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-n8n error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
