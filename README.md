# OpenAPI Template with ChatGPT Integration

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/templates/tree/main/chanfana-openapi-template)

![OpenAPI Template Preview](https://imagedelivery.net/wSMYJvS3Xw-n339CbDyDIA/91076b39-1f5b-46f6-7f14-536a6f183000/public)

<!-- dash-content-start -->

This is a Cloudflare Worker with OpenAPI 3.1 Auto Generation and Validation using [chanfana](https://github.com/cloudflare/chanfana) and [Hono](https://github.com/honojs/hono), enhanced with ChatGPT integration via the OpenAI API.

This is an example project made to be used as a quick start into building OpenAPI compliant Workers that generates the
`openapi.json` schema automatically from code and validates the incoming request to the defined parameters or request body.

This template includes various endpoints, a D1 database, ChatGPT integration, and integration tests using [Vitest](https://vitest.dev/) as examples. In endpoints, you will find [chanfana D1 AutoEndpoints](https://chanfana.com/endpoints/auto/d1), a [normal endpoint](https://chanfana.com/endpoints/defining-endpoints), and a ChatGPT endpoint to serve as examples for your projects.

Besides being able to see the OpenAPI schema (openapi.json) in the browser, you can also extract the schema locally no hassle by running this command `npm run schema`.

<!-- dash-content-end -->

> [!IMPORTANT]
> When using C3 to create this project, select "no" when it asks if you want to deploy. You need to follow this project's [setup steps](https://github.com/cloudflare/templates/tree/main/openapi-template#setup-steps) before deploying.

## Getting Started

Outside of this repo, you can start a new project with this template using [C3](https://developers.cloudflare.com/pages/get-started/c3/) (the `create-cloudflare` CLI):

```bash
npm create cloudflare@latest -- --template=cloudflare/templates/openapi-template
```

A live public deployment of this template is available at [https://openapi-template.templates.workers.dev](https://openapi-template.templates.workers.dev)

## Setup Steps

If you prefer a guided setup, run the helper script and follow the prompts:

```bash
./scripts/setup.sh
```

The script is executable in the repository so you can run it immediately after cloning.

The script checks dependencies, confirms you're logged into Cloudflare, installs `npm` packages, creates or reuses a D1 database with your real ID (validated as a UUID), backs up and updates `wrangler.jsonc` even when it contains JSONC comments, and can run migrations for you.

1. Install the project dependencies with a package manager of your choice:
   ```bash
   npm install
   ```
2. Create a [D1 database](https://developers.cloudflare.com/d1/get-started/) with the name "openapi-template-db":
   ```bash
   npx wrangler d1 create openapi-template-db
   ```
   ...and update the `database_id` field in `wrangler.json` with the new database ID.
3. Run the following db migration to initialize the database (notice the `migrations` directory in this project):
   ```bash
   npx wrangler d1 migrations apply DB --remote
   ```
4. Configure the OpenAI API key as a secret (required for the ChatGPT endpoint):
   ```bash
   npx wrangler secret put OPENAI_API_KEY
   ```
   When prompted, paste your OpenAI API key. You can obtain an API key from [OpenAI's platform](https://platform.openai.com/api-keys).
5. Deploy the project!
   ```bash
   npx wrangler deploy
   ```
6. Monitor your worker
   ```bash
   npx wrangler tail
   ```

### CI/CD with Cloudflare Workers

This repository includes a GitHub Actions workflow that automatically tests and deploys the Worker when code is merged to `main`.
To enable deployments:

1. Create a [Cloudflare API token](https://developers.cloudflare.com/workers/wrangler/cli-wrangler/authentication/#generate-an-api-token) with **Edit Cloudflare Workers** and **Edit Cloudflare D1** permissions.
2. Add two repository secrets:
   - `CLOUDFLARE_API_TOKEN` – the API token created above.
   - `CLOUDFLARE_ACCOUNT_ID` – your Cloudflare account ID.
3. Push to `main`. The `.github/workflows/deploy.yml` pipeline will:
   - Run `npm test` (wrangler dry-run + Vitest).
   - Apply pending D1 migrations using `cloudflare/wrangler-action@v3`.
   - Deploy the Worker with the same action so the latest code goes live automatically.


## Omar Ai 3.0 Launch Endpoint

This project now includes a dedicated launch endpoint for **Omar Ai 3.0** in the **QuranChain** ecosystem.

### Endpoint: POST /agent/launch

**Request Body (optional):**
```json
{
  "name": "Omar Ai 3.0",
  "ecosystem": "QuranChain",
  "mission": "Launch a production-ready AI agent with all available tools and skills"
}
```

**Response (Success):**
```json
{
  "success": true,
  "result": {
    "agent": {
      "name": "Omar Ai 3.0",
      "version": "3.0",
      "status": "launched",
      "mission": "Launch a production-ready AI agent with all available tools and skills"
    },
    "ecosystem": {
      "name": "QuranChain",
      "deployment_status": "deployed"
    },
    "capabilities": {
      "tools": ["exec_command", "write_stdin", "..."],
      "skills": ["skill-creator", "skill-installer"]
    },
    "launched_at": "2026-01-01T00:00:00.000Z"
  }
}
```

## Testing

This template includes integration tests using [Vitest](https://vitest.dev/). To run the tests locally:

```bash
npm run test
```

Test files are located in the `tests/` directory, with examples demonstrating how to test your endpoints and database interactions.

## Project structure

1. Your main router is defined in `src/index.ts`.
2. Each endpoint has its own file in `src/endpoints/`.
3. Integration tests are located in the `tests/` directory.
4. For more information read the [chanfana documentation](https://chanfana.com/), [Hono documentation](https://hono.dev/docs), and [Vitest documentation](https://vitest.dev/guide/).

## ChatGPT Integration

This project includes a ChatGPT integration endpoint that allows you to send messages to OpenAI's ChatGPT models and receive responses.

### Monetization resources

If you plan to launch a ChatGPT app, review the [Apps SDK monetization guide](https://developers.openai.com/apps-sdk/build/monetization) for details on pricing models, payout timelines, and implementation steps.

### Endpoint: POST /chatgpt

**Request Body:**
```json
{
  "message": "Your message to ChatGPT",
  "model": "gpt-3.5-turbo",  // Optional, defaults to gpt-3.5-turbo
  "temperature": 0.7          // Optional, range: 0-2, defaults to 0.7
}
```

**Response (Success):**
```json
{
  "success": true,
  "result": {
    "message": "ChatGPT's response",
    "model": "gpt-3.5-turbo",
    "usage": {
      "prompt_tokens": 10,
      "completion_tokens": 20,
      "total_tokens": 30
    }
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "errors": [
    {
      "code": 4001,
      "message": "OpenAI API key not configured"
    }
  ]
}
```

**Example Usage:**
```bash
curl -X POST https://your-worker.workers.dev/chatgpt \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Explain quantum computing in simple terms",
    "temperature": 0.5
  }'
```
