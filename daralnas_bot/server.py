from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from telegram import Update
from telegram.ext import Application

from .config import Settings
from .handlers import HandlerRegistrar
from .messages import AI_GUARDRAILS

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

settings = Settings.load()
app = FastAPI(title="Dar al-Nas Telegram Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

telegram_app = Application.builder().token(settings.bot_token).build()
handler_registrar = HandlerRegistrar(
    telegram_app,
    openai_api_key=settings.openai_api_key,
    allowed_countries=settings.allowed_countries,
)
handler_registrar.register()


@app.on_event("startup")
async def on_startup() -> None:
    await telegram_app.initialize()
    if settings.webhook_url:
        await telegram_app.bot.set_webhook(url=f"{settings.webhook_url}/webhook")
        logger.info("Webhook set to %s", settings.webhook_url)
    await telegram_app.start()
    logger.info("Telegram application started")


@app.on_event("shutdown")
async def on_shutdown() -> None:
    await telegram_app.stop()
    await telegram_app.shutdown()
    logger.info("Telegram application stopped")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "ai": AI_GUARDRAILS}


@app.post("/webhook")
async def telegram_webhook(request: Request) -> JSONResponse:
    try:
        data: dict[str, Any] = await request.json()
    except Exception as exc:  # pragma: no cover - FastAPI handles detail
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    update = Update.de_json(data=data, bot=telegram_app.bot)
    await telegram_app.process_update(update)
    return JSONResponse({"ok": True})


@app.get("/miniapps/{name}")
async def serve_miniapp(name: str):
    template_path = Path(__file__).parent / "templates" / f"{name}.html"
    if not template_path.exists():
        raise HTTPException(status_code=404, detail="Mini App not found")
    return FileResponse(template_path)


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "message": "Dar al-Nas Telegram backend running",
        "modules": "daralnas, quranchain, meshtalk, fungi",
        "policy": AI_GUARDRAILS,
    }


def run() -> None:
    import uvicorn

    uvicorn.run(
        "daralnas_bot.server:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
    )


if __name__ == "__main__":
    run()
