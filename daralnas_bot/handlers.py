from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Awaitable, Callable

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.constants import ParseMode
from telegram.ext import (
    Application,
    CallbackContext,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from .ai import educational_reply
from .messages import AI_GUARDRAILS, DARALNAS, DONATE, FUNGI, MESHTALK, QURANCHAIN, WELCOME

logger = logging.getLogger(__name__)


@dataclass
class JurisdictionState:
    user_country: str | None = None
    last_prompt_at: datetime | None = None


class HandlerRegistrar:
    def __init__(self, app: Application, *, openai_api_key: str | None, allowed_countries: tuple[str, ...]):
        self.app = app
        self.openai_api_key = openai_api_key
        self.allowed_countries = allowed_countries
        self.state: dict[int, JurisdictionState] = {}

    def register(self) -> None:
        self.app.add_handler(CommandHandler("start", self.start))
        self.app.add_handler(CommandHandler("ask", self.ask))
        self.app.add_handler(CommandHandler("daralnas", self._static(DARALNAS)))
        self.app.add_handler(CommandHandler("quranchain", self._static(QURANCHAIN)))
        self.app.add_handler(CommandHandler("meshtalk", self._static(MESHTALK)))
        self.app.add_handler(CommandHandler("fungi", self._static(FUNGI)))
        self.app.add_handler(CommandHandler("donate", self._static(DONATE)))
        self.app.add_handler(CallbackQueryHandler(self._menu_callback))
        self.app.add_handler(MessageHandler(filters.COMMAND, self.unknown))

    async def start(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        keyboard = InlineKeyboardMarkup(
            [
                [InlineKeyboardButton("Dar al-Nas", callback_data="daralnas"), InlineKeyboardButton("QuranChain", callback_data="quranchain")],
                [InlineKeyboardButton("Meshtalk OS", callback_data="meshtalk"), InlineKeyboardButton("Fungi Network", callback_data="fungi")],
                [InlineKeyboardButton("Donate", callback_data="donate")],
            ]
        )
        await self._send(update, context, WELCOME, reply_markup=keyboard)

    async def ask(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not update.message or not update.message.text:
            return await self._send(update, context, "Please provide a short question after /ask.")

        if not self._jurisdiction_allowed(update):
            country_hint = ",".join(self.allowed_countries) if self.allowed_countries else "regulated markets"
            return await self._send(
                update,
                context,
                f"For regulated guidance we need your country. Allowed: {country_hint}. Reply like 'Country: UAE'.",
            )

        prompt = update.message.text.replace("/ask", "", 1).strip() or "How does Dar al-Nas work?"
        reply = await educational_reply(prompt, self.openai_api_key)
        await self._send(update, context, reply)

    async def unknown(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        await self._send(update, context, "Command not recognized. Try /start or /ask.")

    async def _menu_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        if not update.callback_query:
            return
        payload = update.callback_query.data or ""
        mapping = {
            "daralnas": DARALNAS,
            "quranchain": QURANCHAIN,
            "meshtalk": MESHTALK,
            "fungi": FUNGI,
            "donate": DONATE,
        }
        body = mapping.get(payload, "Unknown module. Try /start again.")
        await self._send(update, context, body)

    def _jurisdiction_allowed(self, update: Update) -> bool:
        if not self.allowed_countries:
            return True
        user_id = update.effective_user.id if update.effective_user else None
        if not user_id:
            return False
        state = self.state.get(user_id)
        if state and state.user_country:
            return True
        message_text = update.message.text if update.message else ""
        if message_text and message_text.lower().startswith("country:"):
            country = message_text.split(":", 1)[1].strip().upper()
            if country in self.allowed_countries:
                self.state[user_id] = JurisdictionState(user_country=country)
                return True
        return False

    def _static(self, body: str) -> Callable[[Update, CallbackContext], Awaitable[None]]:
        async def handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
            await self._send(update, context, body)

        return handler

    async def _send(self, update: Update, context: ContextTypes.DEFAULT_TYPE, text: str, **kwargs) -> None:
        """Send a policy-compliant message with guardrails."""

        words = text.split()
        if len(words) > 120:
            text = " ".join(words[:120])
        safe_text = f"{text}\n\n{AI_GUARDRAILS}"
        if update.message:
            await update.message.reply_text(safe_text, parse_mode=ParseMode.MARKDOWN, **kwargs)
        elif update.callback_query:
            await update.callback_query.answer()
            await update.callback_query.message.reply_text(safe_text, parse_mode=ParseMode.MARKDOWN, **kwargs)
        else:
            logger.warning("Update missing message and callback data")
