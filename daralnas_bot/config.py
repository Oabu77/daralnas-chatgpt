from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class Settings:
    """Runtime configuration derived from environment variables."""

    bot_token: str
    admin_id: Optional[int]
    openai_api_key: Optional[str]
    webhook_url: Optional[str]
    allowed_countries: tuple[str, ...]

    @classmethod
    def load(cls) -> "Settings":
        bot_token = os.getenv("BOT_TOKEN")
        if not bot_token:
            raise RuntimeError("BOT_TOKEN is required for the Telegram bot to start.")

        admin_id_raw = os.getenv("ADMIN_ID")
        admin_id = int(admin_id_raw) if admin_id_raw and admin_id_raw.isdigit() else None

        allowed_countries_env = os.getenv("ALLOWED_COUNTRIES", "")
        allowed_countries = tuple(
            country.strip().upper()
            for country in allowed_countries_env.split(",")
            if country.strip()
        )

        settings = cls(
            bot_token=bot_token,
            admin_id=admin_id,
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            webhook_url=os.getenv("WEBHOOK_URL"),
            allowed_countries=allowed_countries,
        )

        logging.getLogger(__name__).info(
            "Settings loaded: webhook=%s admin_id=%s allowed_countries=%s",
            settings.webhook_url or "<none>",
            settings.admin_id,
            settings.allowed_countries or "all",
        )

        return settings
