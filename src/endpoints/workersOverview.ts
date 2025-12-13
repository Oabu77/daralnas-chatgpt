import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { AppContext } from "../types";

const WORKERS_OVERVIEW = {
  title: "Overview · Cloudflare Workers docs",
  description: "With Cloudflare Workers, you can expect to:",
  lastUpdated: "2025-12-09T19:56:58.000Z",
  chatbotDeprioritize: false,
  source_url: {
    html: "https://developers.cloudflare.com/workers/",
    md: "https://developers.cloudflare.com/workers/index.md",
  },
  content: `A serverless platform for building, deploying, and scaling apps across Cloudflare's global network with a single command — no infrastructure to manage, no complex configuration

With Cloudflare Workers, you can expect to:

* Deliver fast performance with high reliability anywhere in the world
* Build full-stack apps with your framework of choice, including React, Vue, Svelte, Next, Astro, React Router, and more
* Use your preferred language, including JavaScript, TypeScript, Python, Rust, and more
* Gain deep visibility and insight with built-in observability
* Get started for free and grow with flexible pricing, affordable at any scale

Get started with your first project:

[Deploy a template](https://dash.cloudflare.com/?to=/:account/workers-and-pages/templates)

[Deploy with Wrangler CLI](https://developers.cloudflare.com/workers/get-started/guide/)

***

## Build with Workers

#### Front-end applications

Deploy static assets to Cloudflare's CDN & cache for fast rendering

#### Back-end applications

Build APIs and connect to data stores with Smart Placement to optimize latency

#### Serverless AI inference

Run LLMs, generate images, and more with Workers AI

#### Background jobs

Schedule cron jobs, run durable Workflows, and integrate with Queues

#### Observability & monitoring

Monitor performance, debug issues, and analyze traffic with real-time logs and analytics

***

## Integrate with Workers

Connect to external services like databases, APIs, and storage via Bindings, enabling functionality with just a few lines of code:

**Storage**

**[Durable Objects](https://developers.cloudflare.com/durable-objects/)**

Scalable stateful storage for real-time coordination.

**[D1](https://developers.cloudflare.com/d1/)**

Serverless SQL database built for fast, global queries.

**[KV](https://developers.cloudflare.com/kv/)**

Low-latency key-value storage for fast, edge-cached reads.

**[Queues](https://developers.cloudflare.com/queues/)**

Guaranteed delivery with no charges for egress bandwidth.

**[Hyperdrive](https://developers.cloudflare.com/hyperdrive/)**

Connect to your external database with accelerated queries, cached at the edge.

**Compute**

**[Workers AI](https://developers.cloudflare.com/workers-ai/)**

Machine learning models powered by serverless GPUs.

**[Workflows](https://developers.cloudflare.com/workflows/)**

Durable, long-running operations with automatic retries.

**[Vectorize](https://developers.cloudflare.com/vectorize/)**

Vector database for AI-powered semantic search.

**[R2](https://developers.cloudflare.com/r2/)**

Zero-egress object storage for cost-efficient data access.

**[Browser Rendering](https://developers.cloudflare.com/browser-rendering/)**

Programmatic serverless browser instances.

**Media**

**[Cache / CDN](https://developers.cloudflare.com/cache/)**

Global caching for high-performance, low-latency delivery.

**[Images](https://developers.cloudflare.com/images/)**

Streamlined image infrastructure from a single API.

***

Want to connect with the Workers community? [Join our Discord](https://discord.cloudflare.com)`,
};

export class WorkersOverviewEndpoint extends OpenAPIRoute {
  public schema = {
    tags: ["Workers"],
    summary: "Get an overview of Cloudflare Workers",
    operationId: "workers-overview",
    responses: {
      "200": {
        description: "Returns the Workers overview content",
        ...contentJson({
          success: z.boolean(),
          result: z.object({
            title: z.string(),
            description: z.string(),
            lastUpdated: z.string(),
            chatbotDeprioritize: z.boolean(),
            source_url: z.object({
              html: z.string().url(),
              md: z.string().url(),
            }),
            content: z.string(),
          }),
        }),
      },
    },
  };

  public async handle(_c: AppContext) {
    return {
      success: true,
      result: WORKERS_OVERVIEW,
    };
  }
}
