const assert = require("node:assert");

// Prefer the global fetch in Node 18+, but fall back to node-fetch when needed
const fetchFn =
        typeof fetch === "function"
                ? fetch
                : (...args) => import("node-fetch").then(({ default: f }) => f(...args));

const PORT = process.env.PORT || 3333;
const BASE = `http://localhost:${PORT}`;

async function main() {
        const res = await fetchFn(`${BASE}/health`);
        const data = await res.json();
        assert.strictEqual(data.status, "ok");
        assert.strictEqual(data.service, "quranchain-mcp");
        console.log("✅ Smoke test passed.");
}

main().catch((err) => {
        console.error("❌ Smoke test failed:", err);
        process.exit(1);
});
