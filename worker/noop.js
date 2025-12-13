export default {
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", service: "noop-worker" }), {
        headers: { "content-type": "application/json" }
      });
    }
    return new Response(
      JSON.stringify({
        note:
          "This Cloudflare Worker is a no-op placeholder. The actual MCP server runs on a Node host (Codex Cloud) and exposes HTTP there."
      }),
      { headers: { "content-type": "application/json" } }
    );
  }
}
