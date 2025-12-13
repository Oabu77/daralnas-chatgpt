import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("Workers overview endpoint", () => {
  it("returns the workers overview content", async () => {
    const response = await SELF.fetch("http://local.test/workers/overview");
    const body = await response.json<{
      success: boolean;
      result: {
        title: string;
        description: string;
        lastUpdated: string;
        chatbotDeprioritize: boolean;
        source_url: { html: string; md: string };
        content: string;
      };
    }>();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.result.title).toBe("Overview · Cloudflare Workers docs");
    expect(body.result.description).toBe("With Cloudflare Workers, you can expect to:");
    expect(body.result.lastUpdated).toBe("2025-12-09T19:56:58.000Z");
    expect(body.result.chatbotDeprioritize).toBe(false);
    expect(body.result.source_url).toEqual({
      html: "https://developers.cloudflare.com/workers/",
      md: "https://developers.cloudflare.com/workers/index.md",
    });
    expect(body.result.content).toContain("A serverless platform for building, deploying, and scaling apps");
    expect(body.result.content).toContain("Deploy static assets to Cloudflare's CDN & cache for fast rendering");
    expect(body.result.content).toContain("Want to connect with the Workers community? Join our Discord");
  });
});
