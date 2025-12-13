# Repository File Map

This file highlights where to find the primary assets referenced in documentation and testing so you can quickly navigate the project.

## Documentation
- `README.md`: Project overview, setup, testing guidance, and links to the QuranChain architecture reference and file map.
- `docs/quranchain-spec.md`: End-to-end QuranChain commerce architecture, including routing, relayer boundaries, ledger, and fulfillment flows.
- `docs/file-map.md`: This guide.

## Source
- `src/index.ts`: Worker entry point and router wiring.
- `src/endpoints/`: Endpoint handlers used by the Worker.
- `src/types.ts`: Shared request/response types.
- `scripts/`: Utility scripts (e.g., setup helper).

## Data & Testing
- `migrations/`: D1 database migrations.
- `tests/`: Vitest integration tests.
- `tests/vitest.config.mts`: Vitest + Workers configuration.

## Configuration
- `wrangler.jsonc`: Cloudflare Worker configuration.
- `worker-configuration.d.ts`: Type-safe Worker bindings for Wrangler.
- `tsconfig.json`: TypeScript compiler options.
- `package.json` / `package-lock.json`: Dependencies and scripts.
