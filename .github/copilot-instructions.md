# GitHub Copilot Instructions for OliveExpress™ Logistics Platform

## Project Overview

This is **OliveExpress™**, a production-ready logistics platform for the Dar Al-Nas ecosystem. It's built on **Cloudflare Workers** using:
- **Hono** (HTTP routing framework)
- **Chanfana** (OpenAPI-first REST API generation)
- **D1** (SQLite-based serverless database)
- **TypeScript** (strongly typed codebase)
- **Zod** (runtime validation)

The platform manages multi-regional logistics operations (USA, Mexico, Jordan) with QuranChain blockchain integration, AI-powered dispatch (Omar AI/AMĀN Control), multi-modal transport, and humanitarian corridor support.

## Architecture Patterns

### Project Structure
```
src/
├── index.ts              # Main Hono app with OpenAPI setup
├── types.ts              # Shared TypeScript types
└── endpoints/
    ├── tasks/            # Task management endpoints
    │   ├── base.ts       # Zod model definition
    │   ├── router.ts     # Sub-router registration
    │   ├── taskCreate.ts # POST endpoint
    │   ├── taskRead.ts   # GET endpoint
    │   ├── taskUpdate.ts # PUT endpoint
    │   ├── taskDelete.ts # DELETE endpoint
    │   └── taskList.ts   # List endpoint
    ├── oliveexpress/     # Logistics platform endpoints
    │   ├── models.ts     # Zod schemas for shipments, carriers, ports, etc.
    │   ├── router.ts     # Sub-router registration
    │   ├── shipmentCreate.ts
    │   ├── shipmentRead.ts
    │   ├── shipmentUpdate.ts
    │   ├── shipmentList.ts
    │   ├── coreEndpoints.ts # Ports, corridors, carriers
    │   ├── onboarding.ts    # Carrier onboarding
    │   ├── ai.ts            # Omar AI/AMĀN endpoints
    │   ├── tracking.ts      # Tracking events
    │   └── treasury.ts      # Invoicing and revenue
    ├── chatgpt.ts        # ChatGPT integration endpoint
    └── dummyEndpoint.ts  # Example endpoint
```

### Endpoint Pattern (Chanfana Convention)

All endpoints follow the **Chanfana** pattern using base classes from `chanfana`:
- `D1CreateEndpoint` - POST endpoints (create resources)
- `D1ReadEndpoint` - GET endpoints (read single resource)
- `D1UpdateEndpoint` - PUT endpoints (update resources)
- `D1DeleteEndpoint` - DELETE endpoints (delete resources)
- `D1ListEndpoint` - GET endpoints (list resources)

**Example endpoint structure:**
```typescript
import { D1CreateEndpoint } from "chanfana";
import { HandleArgs } from "../../types";
import { ModelName } from "./models";

export class ResourceCreate extends D1CreateEndpoint<HandleArgs> {
  _meta = {
    model: ModelName,
    fields: ModelName.schema.pick({
      // Select fields allowed in POST body (exclude id, timestamps)
      field1: true,
      field2: true,
    }),
  };

  // Optional: Override handle() for custom logic
  async handle(...[context]: HandleArgs) {
    const result = await super.handle(...[context]);
    // Add custom post-creation logic here
    return result;
  }
}
```

### Model Definition Pattern

All models are defined in `models.ts` files using Zod schemas:

```typescript
import { z } from "zod";

export const resourceSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const ResourceModel = {
  tableName: "resources",
  primaryKeys: ["id"],
  schema: resourceSchema,
  // Optional: Custom serializer for boolean/special fields
  serializer: (obj: object) => {
    const record = obj as Record<string, any>;
    return {
      ...record,
      active: Boolean(record.active),
    };
  },
  serializerObject: resourceSchema,
};
```

### Router Pattern

Sub-routers are registered using Chanfana's `fromHono()` pattern:

```typescript
import { fromHono } from "chanfana";
import { Hono } from "hono";
import { HandleArgs } from "../../types";

const router = new Hono<{ Bindings: Env }>();
const openapi = fromHono<HandleArgs>(router, { base: "/path" });

// Register endpoints
openapi.post("/", EndpointCreate);
openapi.get("/", EndpointList);
openapi.get("/:id", EndpointRead);
openapi.put("/:id", EndpointUpdate);
openapi.delete("/:id", EndpointDelete);

export { router as routerName };
```

## Code Style & Conventions

### TypeScript
- **Always use TypeScript** - no JavaScript files
- Use `const` over `let` where possible
- Prefer interfaces/types from `types.ts` for shared types
- Use Zod schemas for runtime validation
- Follow existing patterns for type imports: `import type { Context } from "hono";`

### Naming Conventions
- **Files**: camelCase for endpoint files (e.g., `taskCreate.ts`, `shipmentList.ts`)
- **Classes**: PascalCase for endpoint classes (e.g., `TaskCreate`, `ShipmentList`)
- **Models**: PascalCase with "Model" suffix (e.g., `TaskModel`, `ShipmentModel`)
- **Variables**: camelCase
- **Constants**: SCREAMING_SNAKE_CASE for true constants
- **Database tables**: snake_case (e.g., `tasks`, `shipments`, `carrier_wallets`)
- **Database columns**: snake_case (e.g., `created_at`, `darcloud_identity_id`)

### Error Handling
- Use Chanfana's `ApiException` for API errors
- Global error handler in `src/index.ts` catches all errors
- Return structured error responses: `{ success: false, errors: [...] }`
- HTTP status codes:
  - `200` - Success (GET, PUT, DELETE)
  - `201` - Created (POST)
  - `400` - Bad Request (validation errors)
  - `404` - Not Found
  - `500` - Internal Server Error

### Database Patterns
- **Migrations**: Sequential SQL files in `migrations/` directory (e.g., `0001_description.sql`)
- **Primary keys**: Auto-incrementing integers named `id`
- **Timestamps**: Use `created_at` and `updated_at` with `CURRENT_TIMESTAMP`
- **Foreign keys**: Use `_id` suffix (e.g., `carrier_id`, `origin_port_id`)
- **Enums**: Use SQLite `CHECK` constraints, match Zod enums exactly

## Testing Practices

### Test Structure
- Tests live in `tests/integration/` directory
- Use **Vitest** with `@cloudflare/vitest-pool-workers`
- Import `SELF` from `cloudflare:test` for making requests
- Test file naming: `{feature}.test.ts`

### Test Patterns
```typescript
import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Feature API Integration Tests", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  describe("GET /endpoint", () => {
    it("should return expected result", async () => {
      const response = await SELF.fetch(`http://local.test/endpoint`);
      const body = await response.json<{ success: boolean; result: any }>();
      
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.result).toEqual(expect.objectContaining({
        field: "value",
      }));
    });
  });
});
```

### Test Coverage
- Test all CRUD operations (Create, Read, Update, Delete, List)
- Test validation errors (400 responses)
- Test not found scenarios (404 responses)
- Test success paths (200/201 responses)
- Use helper functions for repeated operations (e.g., `createTask()`)

## API Design Principles

### RESTful Conventions
- **Collections**: `/resource` (plural)
- **Single resource**: `/resource/:id`
- **Sub-resources**: `/resource/:id/subresource`
- **Actions**: Use verbs in path only when not CRUD (e.g., `/ai/dispatch/optimize`)

### Request/Response Format
- **Request**: JSON body with camelCase fields matching Zod schema
- **Response**: Always include `success` boolean
  - Success: `{ success: true, result: {...} }`
  - Error: `{ success: false, errors: [{code: number, message: string}] }`

### OpenAPI Documentation
- Chanfana auto-generates OpenAPI schema
- Access docs at root path: `http://localhost:8787/`
- Schema endpoint: Use `npm run schema` to generate OpenAPI JSON

## Business Logic Guidelines

### QuranChain Integration
- **Commercial shipments**: Auto-create QuranChain contracts
- **Humanitarian/NGO**: Zero founder royalty (zakat-exempt)
- **Escrow flow**: NONE → FUNDED → RELEASED or DISPUTED
- **Settlement**: 100% on-chain, no traditional banking

### AI Systems (Omar AI / AMĀN Control)
- **Carrier scoring**: 0-100 trust score based on performance
- **Delay prediction**: Machine learning with confidence levels
- **Route optimization**: Consider congestion, distance, capacity
- **Auto-reassignment**: Triggered on low scores or delays

### Revenue Model
- **Commercial**: 15% freight rate, 2.5% founder royalty
- **Humanitarian/NGO**: Cost recovery only, 0% royalty
- **Tracking**: Transparent volume reporting per shipment type

### Compliance & Ethics
- ❌ No riba (interest), speculative yield, guaranteed returns
- ✅ Halal finance principles
- ✅ Multi-jurisdiction support (USA, Mexico, Jordan)
- ✅ Cross-border customs compliance
- ✅ Humanitarian corridor prioritization

## Development Workflow

### Local Development
```bash
npm install                 # Install dependencies
npm run seedLocalDb        # Apply migrations to local D1
npm run dev                # Start development server (port 8787)
```

### Testing
```bash
npm test                   # Run wrangler dry-run + Vitest tests
npm run test               # Same as above
```

### Deployment
```bash
npm run predeploy          # Apply migrations to production D1
npm run deploy             # Deploy to Cloudflare Workers
```

### CI/CD
- GitHub Actions workflow: `.github/workflows/deploy.yml`
- Triggers on push to `main` branch
- Steps: Install → Test → Migrate → Deploy
- Required secrets: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`

## Environment & Configuration

### wrangler.jsonc
- **name**: Worker name (daralnas-chatgpt)
- **main**: Entry point (src/index.ts)
- **compatibility_date**: Cloudflare compatibility date
- **d1_databases**: D1 database binding configuration

### Environment Variables
- Set in Cloudflare Workers dashboard
- Access via `env` object in handlers
- Example: `env.DB` for D1 database binding

## Key Files Reference

- `src/index.ts` - Main app, OpenAPI setup, global error handler
- `src/types.ts` - Shared TypeScript types (`AppContext`, `HandleArgs`)
- `wrangler.jsonc` - Cloudflare Workers configuration
- `package.json` - Dependencies and npm scripts
- `tsconfig.json` - TypeScript compiler configuration
- `tests/vitest.config.mts` - Vitest configuration
- `migrations/*.sql` - Database schema migrations

## Common Tasks

### Adding a New Endpoint
1. Define Zod schema in `models.ts` (if new model)
2. Create endpoint class extending Chanfana base class
3. Register endpoint in router
4. Add tests in `tests/integration/`
5. Create migration if new database table needed

### Adding a New Database Table
1. Create migration file: `migrations/000X_description.sql`
2. Define table schema with proper constraints
3. Add Zod schema and Model definition
4. Apply migration: `npm run seedLocalDb`
5. Update TypeScript types if needed

### Modifying Existing Endpoint
1. Update Zod schema if request/response changes
2. Modify endpoint class logic
3. Update tests to cover new behavior
4. Test locally: `npm run dev` + manual testing
5. Run test suite: `npm test`

## Python Bot (Legacy)

The repository also contains a Python-based Telegram bot in `daralnas_bot/`:
- **Framework**: FastAPI + python-telegram-bot 20.x
- **Endpoints**: `/webhook`, `/health`, `/miniapps/{name}`
- **Modules**: `/daralnas`, `/quranchain`, `/meshtalk`, `/fungi`, `/donate`, `/ask`, `/start`
- **AI**: OpenAI integration (optional), 120-word replies, guardrails
- **Deployment**: Railway (Procfile: `web: python -m daralnas_bot.server`)

When working with the bot:
- Use Python virtual environment: `python -m venv .venv`
- Install deps: `pip install -r requirements.txt`
- Set env vars: `BOT_TOKEN`, `OPENAI_API_KEY`, `WEBHOOK_URL`, `ADMIN_ID`, `ALLOWED_COUNTRIES`

## Important Reminders

1. **No breaking changes** - Maintain backward compatibility with existing API contracts
2. **Security first** - No wallet custody, HTTPS/TLS enforced, rate limiting enabled
3. **Ethical compliance** - Halal finance principles, transparent founder economics
4. **Multi-regional** - Consider USA, Mexico, Jordan regional requirements
5. **Documentation** - Update README.md, API_TESTS.md, DEPLOYMENT.md when relevant
6. **Testing** - Always add tests for new endpoints and features
7. **Migrations** - Never modify existing migrations, always create new ones
8. **Type safety** - Use TypeScript and Zod for compile-time and runtime safety
