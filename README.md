# Dar al-Nas Telegram Infrastructure

Production-ready foundation for the Dar al-Nas ecosystem, aligned with halal, governance-first requirements. The stack is Telegram-native (bots + Mini Apps), runs on Railway with Python 3.10+, and keeps AI strictly educational.

## Architecture
- **FastAPI + python-telegram-bot 20.x**: webhook server with `/webhook` for Telegram updates, `/health` for monitoring, and static Mini Apps at `/miniapps/{name}`.
- **Modules**: `/daralnas`, `/quranchain`, `/meshtalk`, `/fungi`, `/donate`, `/ask`, and `/start` are wired into a single Telegram Application instance.
- **AI guardrails**: replies are ≤120 words, avoid advice/rulings, and escalate sensitive topics to humans. OpenAI is optional; canned messaging is used if the key is absent.
- **Jurisdiction gating**: optional `ALLOWED_COUNTRIES` env var forces a country declaration (e.g., `Country: UAE`) before regulated flows like `/ask`.
- **Founder economics**: surfaced transparently (gas-fee shares, IP licensing, governance stipends) without speculative language.
- **No custody**: Telegram is the interface only; no keys are stored or requested.

## Local development
1. Create a virtual environment and install dependencies:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
2. Set required secrets:
   ```bash
   export BOT_TOKEN="<telegram-bot-token>"
   export ADMIN_ID="<numeric-admin-id>"  # optional
   export OPENAI_API_KEY="<optional-openai-key>"
   export WEBHOOK_URL="https://<your-public-url>"  # optional for local testing with tunnels
   export ALLOWED_COUNTRIES="UAE,SA,UK"  # optional
   ```
3. Run the server (single command startup):
   ```bash
   python -m daralnas_bot.server
   ```
   Health check: `curl http://localhost:8000/health`

## Running the bots (automated checks)
Use the bundled Node.js harness to dry-run the Worker deploy and execute the Vitest suite:

```bash
npm run bots
```

This keeps the Cloudflare Worker and API endpoints in sync with their tests before shipping.

## Deployment (Railway)
1. Create a new Railway service from this repository.
2. Set environment variables in the Railway dashboard: `BOT_TOKEN`, `OPENAI_API_KEY` (optional), `ADMIN_ID` (optional), `WEBHOOK_URL` (public HTTPS endpoint), and `ALLOWED_COUNTRIES` if gating is needed.
3. Railway uses the provided `Procfile`: `web: python -m daralnas_bot.server`.
4. Configure Telegram webhook to `${WEBHOOK_URL}/webhook` (the server auto-sets it during startup when `WEBHOOK_URL` is provided).
5. Enable auto-redeploys and logging in Railway for operational visibility.

## Mini Apps
Static educational shells live under `daralnas_bot/templates`:
- `daralnas.html` – halal financing primer and pre-qualification disclaimer
- `quranchain.html` – settlement transparency and infrastructure fees
- `meshtalk.html` – governance and deliberation UX
- `fungi.html` – reputation and trust visualization

These are intentionally simple HTML/JS entry points and can be expanded with Telegram Mini App JS SDK while keeping ethics, gating, and transparency.

## Compliance and ethics defaults
- No riba, speculative yield, or guaranteed returns.
- Jurisdiction-aware flows with human review escalation.
- AI is educational only; no approvals, fatwas, or financial advice.
- Secrets are sourced from environment variables only.
- Logging is enabled at startup; extend with Railway log drains for audits.
