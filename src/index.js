export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Identity from Cloudflare Access
    const email =
      request.headers.get("cf-access-authenticated-user-email") || "unknown";
    const country =
      (request.headers.get("cf-ipcountry") || "XX").toUpperCase();
    const timestamp = new Date().toISOString();

    // /secure → HTML with identity info and country as a link
    if (path === "/secure" || path === "/secure/") {
      const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Cloudflare Zero Trust Secure Area</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 2rem; }
      h1 { margin-bottom: 1rem; }
      p { font-size: 1.1rem; }
      a { color: #0066ff; text-decoration: none; }
      a:hover { text-decoration: underline; }
      .meta { color: #555; margin-top: 1rem; font-size: 0.9rem; }
    </style>
  </head>
  <body>
    <h1>Cloudflare Zero Trust Secure Area</h1>
    <p>
      <strong>${email}</strong> authenticated at
      <strong>${timestamp}</strong> from
      <a href="/secure/${country}">${country}</a>
    </p>
    <div class="meta">
      <div>Email: ${email}</div>
      <div>Country: ${country}</div>
      <div>Timestamp: ${timestamp}</div>
    </div>
  </body>
</html>`;

      return new Response(html, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
      });
    }

    // /secure/{COUNTRY} → serve flag image from private R2 bucket
    if (path.startsWith("/secure/")) {
      const code = path.replace("/secure/", "").toUpperCase();

      // Expect objects like GB.png, IN.png, US.png in dvllm-flags bucket
      const object = await env.FLAGS.get(`${code}.png`);

      if (!object) {
        return new Response("Flag not found", { status: 404 });
      }

      return new Response(object.body, {
        status: 200,
        headers: {
          "content-type": "image/png",
          //  cache control
          "cache-control": "public, max-age=3600",
        },
      });
    }

    // Fallback
    return new Response("Not found", { status: 404 });
  },
};
