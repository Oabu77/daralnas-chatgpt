# Copilot Instructions for daralnas-chatgpt

This is a Cloudflare Worker with OpenAPI 3.1 Auto Generation and Validation using [chanfana](https://github.com/cloudflare/chanfana), [Hono](https://github.com/honojs/hono), and [Vitest](https://vitest.dev/) for testing. The project provides a backend API template with automatic OpenAPI schema generation, D1 database integration, and comprehensive testing.

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono (lightweight web framework)
- **OpenAPI**: Chanfana (automatic schema generation and validation)
- **Database**: Cloudflare D1 (SQLite-based database)
- **Testing**: Vitest with @cloudflare/vitest-pool-workers
- **Language**: TypeScript with strict mode enabled
- **Validation**: Zod for schema validation

## Development Workflow

### Setup and Installation
```bash
npm install
```

### Database Setup
```bash
# Create D1 database (if needed)
npx wrangler d1 create openapi-template-db

# Apply migrations locally
npm run seedLocalDb

# Apply migrations to remote (before deploy)
npx wrangler d1 migrations apply DB --remote
```

### Development
```bash
# Run development server with local database
npm run dev
```

### Building and Testing
```bash
# Type check TypeScript code
npx tsc --noEmit

# Run integration tests (includes dry-run deploy check)
npm run test

# Generate OpenAPI schema
npm run schema

# Deploy (runs predeploy migrations automatically)
npm run deploy
```

## Repository Structure

- `src/` - Source code
  - `index.ts` - Main router and application entry point
  - `endpoints/` - API endpoint implementations
    - `tasks/` - Task CRUD endpoints using Chanfana D1 AutoEndpoints
    - `dummyEndpoint.ts` - Example standard endpoint
    - `integrationStatus.ts` - Integration status endpoint
  - `types.ts` - TypeScript type definitions
- `tests/` - Test suite
  - `integration/` - Integration tests using Vitest
  - `vitest.config.mts` - Vitest configuration
- `migrations/` - D1 database migrations (SQL files)
- `scripts/` - Helper scripts
  - `setup.sh` - Guided setup script
- `wrangler.jsonc` - Cloudflare Workers configuration

## Key Guidelines

### Code Standards

1. **TypeScript**
   - Use strict TypeScript mode (already configured)
   - Define types for all endpoints and data structures
   - Use `Env` bindings type for Cloudflare Workers environment
   - Run `npx tsc --noEmit` to type check before committing

2. **API Endpoints**
   - Use Chanfana's `OpenAPIRoute` for defining endpoints
   - Define request and response schemas using Zod
   - Leverage Chanfana D1 AutoEndpoints for CRUD operations where appropriate
   - Return responses with `{ success: boolean, result?: any, errors?: any[] }` structure
   - Use appropriate HTTP status codes (200, 201, 400, 404, 500)

3. **Error Handling**
   - Use `ApiException` from chanfana for API errors
   - Global error handler is defined in `src/index.ts`
   - Log errors before returning generic 500 responses

4. **Database Operations**
   - Use D1 SQL prepared statements to prevent SQL injection
   - Create migration files in `migrations/` directory with sequential naming (e.g., `0001_description.sql`)
   - Apply migrations with `npx wrangler d1 migrations apply DB --local` (dev) or `--remote` (production)

5. **Testing**
   - Write integration tests in `tests/integration/` directory
   - Use `*.test.ts` file naming convention
   - Use Vitest's `describe`, `it`, `expect` patterns
   - Use `SELF.fetch()` to test endpoints in the Cloudflare Workers environment
   - Clear mocks with `vi.clearAllMocks()` in `beforeEach` hooks
   - Test both success and error cases
   - Verify HTTP status codes and response structure

### Best Practices

1. **OpenAPI Documentation**
   - All endpoints automatically generate OpenAPI schema
   - Access schema at `/` endpoint or extract with `npm run schema`
   - Ensure schemas are descriptive with proper examples and descriptions

2. **Code Organization**
   - Keep endpoint logic in separate files under `src/endpoints/`
   - Use routers for grouping related endpoints (see `tasks/router.ts`)
   - Register routes in `src/index.ts`

3. **Configuration**
   - Use `wrangler.jsonc` for Cloudflare Workers configuration (supports JSONC comments)
   - D1 database binding is named "DB"
   - Compatibility date is set to "2025-10-08"

4. **Deployment**
   - Run `npm run test` before deploying to catch issues
   - Migrations are automatically applied before deployment (predeploy script)
   - Use `npm run deploy` for production deployment

### Common Patterns

1. **Creating a new endpoint**:
   - Create a new file in `src/endpoints/`
   - Extend `OpenAPIRoute` from chanfana
   - Define schema with Zod validators
   - Register route in `src/index.ts`
   - Add integration tests in `tests/integration/`

2. **Database migrations**:
   - Create new migration file with next number: `migrations/NNNN_description.sql`
   - Write SQL DDL statements (CREATE TABLE, ALTER TABLE, etc.)
   - Apply locally: `npm run seedLocalDb`
   - Apply remotely: Deploy (automatic) or `npx wrangler d1 migrations apply DB --remote`

3. **Testing endpoints**:
   - Import `SELF` from `cloudflare:test`
   - Use `SELF.fetch()` with full URL (e.g., `http://local.test/tasks`)
   - Parse responses with type annotations
   - Test CRUD operations, validation, and error cases

### Security Considerations

- Use Zod validation for all user inputs
- Use D1 prepared statements (parameterized queries) to prevent SQL injection
- Validate and sanitize data before database operations
- Return appropriate error messages without exposing sensitive information

## Additional Resources

- [Chanfana Documentation](https://chanfana.com/)
- [Hono Documentation](https://hono.dev/docs)
- [Vitest Documentation](https://vitest.dev/guide/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
