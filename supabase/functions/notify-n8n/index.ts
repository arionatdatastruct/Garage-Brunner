const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const webhookUrl = Deno.env.get("N8N_PDF_WEBHOOK_URL");
    if (!webhookUrl) throw new Error("N8N_PDF_WEBHOOK_URL not configured");

    const cfClientId = Deno.env.get("CF_ACCESS_CLIENT_ID");
    const cfClientSecret = Deno.env.get("CF_ACCESS_CLIENT_SECRET");

    const payload = await req.json();
    console.log("notify-n8n payload:", payload);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (cfClientId && cfClientSecret) {
      headers["CF-Access-Client-Id"] = cfClientId;
      headers["CF-Access-Client-Secret"] = cfClientSecret;
    } else {
      console.warn("CF_ACCESS_CLIENT_ID / CF_ACCESS_CLIENT_SECRET not set — request will likely be blocked by Cloudflare Access");
    }

    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const text = await resp.text();
    console.log("n8n response", resp.status, text.slice(0, 500));

    // Detect Cloudflare Access login page even when status is 200
    const looksLikeCfLogin = text.includes("Cloudflare Access") && text.includes("Sign in");
    const realOk = resp.ok && !looksLikeCfLogin;

    if (!realOk) {
      return new Response(
        JSON.stringify({
          ok: false,
          status: resp.status,
          error: looksLikeCfLogin ? "blocked-by-cloudflare-access" : "webhook-error",
          hint: looksLikeCfLogin
            ? "Set CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET secrets, and add the service token to the Cloudflare Access policy."
            : undefined,
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
