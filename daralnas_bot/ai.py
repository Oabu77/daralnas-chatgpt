from __future__ import annotations

import logging
from typing import Optional

import openai

logger = logging.getLogger(__name__)


PROHIBITED_TOPICS = (
    "fatwa",
    "fatwas",
    "guaranteed return",
    "investment advice",
    "financial advice",
    "haram",
    "halal ruling",
    "sharia ruling",
)


async def educational_reply(
    prompt: str,
    openai_api_key: Optional[str],
    *,
    word_limit: int = 120,
) -> str:
    """Return a policy-safe educational answer no longer than the word_limit."""

    cleaned_prompt = prompt.strip()
    lowered = cleaned_prompt.lower()
    if any(topic in lowered for topic in PROHIBITED_TOPICS):
        return (
            "I can only provide short educational notes. For rulings or advice, "
            "please speak with qualified scholars or licensed staff."
        )

    if not openai_api_key:
        logger.warning("OPENAI_API_KEY missing; returning canned response")
        return _truncate(
            "I can outline how Dar al-Nas works: transparent halal financing, "
            "human review, and jurisdiction-aware onboarding. For detailed help, "
            "please contact a human representative.",
            word_limit,
        )

    client = openai.AsyncOpenAI(api_key=openai_api_key)
    system_msg = (
        "You are a Dar al-Nas guide. Keep replies under 120 words, avoid promises, "
        "avoid rulings, avoid financial advice. Emphasize education, human review, "
        "jurisdiction awareness, and that Telegram stores no keys."
    )
    try:
        completion = await client.chat.completions.create(
            model="gpt-4o-mini",  # lightweight and cost-aware
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": cleaned_prompt},
            ],
            temperature=0.3,
            max_tokens=360,
        )
    except Exception:  # pragma: no cover - defensive logging for production
        logger.exception("OpenAI call failed")
        return _truncate(
            "Our AI helper is unavailable. Please try again later or reach a human agent.",
            word_limit,
        )

    ai_text = completion.choices[0].message.content or ""
    return _truncate(ai_text, word_limit)


def _truncate(message: str, word_limit: int) -> str:
    words = message.split()
    if len(words) <= word_limit:
        return message
    return " ".join(words[:word_limit])
