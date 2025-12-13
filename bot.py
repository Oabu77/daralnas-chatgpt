import logging
import os
import sqlite3
from datetime import datetime
from typing import Optional

from openai import AsyncOpenAI, OpenAIError
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

# Constants
DONATION_LINK = "https://gofund.me/b1dbd91a9"
DB_PATH = os.environ.get("DB_PATH", "data/bot.sqlite")
SYSTEM_PROMPT = (
    "You are QuranChain's support assistant. Follow these rules strictly:\n"
    "- Keep answers concise and under 120 words.\n"
    "- Explain QuranChain transparently as a donation-driven project empowering Quranic education through technology.\n"
    "- Encourage voluntary donations via the provided GoFundMe link, or sharing the campaign, without pressure.\n"
    "- Never promise financial returns, investments, or guarantees.\n"
    "- Avoid giving fatwas or religious rulings; direct users to qualified scholars instead.\n"
    "- Do not invent facts; if unsure, say so briefly.\n"
    "- Keep tone polite, ethical, and transparent.\n"
    "- Do not change or propose alternate donation links. The only donation link is https://gofund.me/b1dbd91a9.\n"
    "- Do not initiate conversations or send unsolicited messages."
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def ensure_db() -> None:
    directory = os.path.dirname(DB_PATH)
    if directory:
        os.makedirs(directory, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                username TEXT,
                question TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


def get_admin_id() -> Optional[int]:
    admin_id = os.environ.get("ADMIN_ID")
    if admin_id is None:
        logger.warning("ADMIN_ID is not set; admin commands will be unavailable.")
        return None
    try:
        return int(admin_id)
    except ValueError:
        logger.error("ADMIN_ID must be an integer.")
        return None


def store_question(user_id: int, username: Optional[str], question: str) -> None:
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute(
            "INSERT INTO questions (user_id, username, question, created_at) VALUES (?, ?, ?, ?)",
            (user_id, username, question.strip(), datetime.utcnow().isoformat()),
        )
        conn.commit()
    finally:
        conn.close()


def fetch_stats() -> dict:
    conn = sqlite3.connect(DB_PATH)
    try:
        total = conn.execute("SELECT COUNT(*) FROM questions").fetchone()[0]
        unique_users = conn.execute("SELECT COUNT(DISTINCT user_id) FROM questions").fetchone()[0]
        last_entry = conn.execute(
            "SELECT question, created_at FROM questions ORDER BY created_at DESC LIMIT 1"
        ).fetchone()
    finally:
        conn.close()

    return {
        "total": total,
        "unique_users": unique_users,
        "last_question": last_entry[0] if last_entry else None,
        "last_time": last_entry[1] if last_entry else None,
    }


async def generate_ai_answer(client: AsyncOpenAI, question: str) -> str:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": question.strip()},
    ]
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.3,
            max_tokens=300,
        )
        content = response.choices[0].message.content.strip()
    except OpenAIError as exc:
        logger.exception("OpenAI API error: %s", exc)
        return (
            "I'm sorry, I couldn't reach the AI service right now. Please try again in a moment. "
            "You can still learn about QuranChain here: https://quranchain.io and donate at the link below."
        )

    words = content.split()
    if len(words) > 120:
        content = " ".join(words[:120])

    # Ensure donation CTA remains optional and consistent.
    cta = (
        "If you'd like to support, you can donate or share the campaign: "
        f"{DONATION_LINK}"
    )
    return f"{content}\n\n{cta}"


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    intro = (
        "Assalamu alaikum! I'm the QuranChain assistant. "
        "I can explain the project, answer questions, and share how to contribute."
    )
    message = f"{intro}\n\nSupport the campaign here: {DONATION_LINK}"
    await update.message.reply_text(message)


async def donate(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(f"You can support QuranChain here: {DONATION_LINK}")


async def share(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    share_text = (
        "Join me in supporting QuranChain! They advance Quranic education with tech and community support. "
        "Learn more and donate if you wish: {link}"
    ).format(link=DONATION_LINK)
    await update.message.reply_text(share_text)


async def ask(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not context.args:
        await update.message.reply_text("Please send your question after /ask. Example: /ask What is QuranChain?")
        return

    question = " ".join(context.args).strip()
    store_question(update.effective_user.id, update.effective_user.username, question)

    client = context.bot_data.get("openai_client")
    answer = await generate_ai_answer(client, question)
    await update.message.reply_text(answer, disable_web_page_preview=True)


async def stats(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    admin_id = context.bot_data.get("admin_id")
    if admin_id is None or update.effective_user.id != admin_id:
        await update.message.reply_text("This command is restricted to the admin.")
        return

    data = fetch_stats()
    last_info = (
        f"Last question: '{data['last_question']}' at {data['last_time']}" if data["last_question"] else "No data yet."
    )
    message = (
        f"Total questions: {data['total']}\n"
        f"Unique users: {data['unique_users']}\n"
        f"{last_info}"
    )
    await update.message.reply_text(message)


def load_token(name: str) -> str:
    token = os.environ.get(name)
    if not token:
        raise RuntimeError(f"Environment variable {name} is required.")
    return token


def main() -> None:
    ensure_db()

    bot_token = load_token("BOT_TOKEN")
    openai_key = load_token("OPENAI_API_KEY")
    admin_id = get_admin_id()

    application = Application.builder().token(bot_token).build()

    application.bot_data["openai_client"] = AsyncOpenAI(api_key=openai_key)
    application.bot_data["admin_id"] = admin_id

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("ask", ask))
    application.add_handler(CommandHandler("donate", donate))
    application.add_handler(CommandHandler("share", share))
    application.add_handler(CommandHandler("stats", stats))

    logger.info("Bot starting with polling...")
    application.run_polling(allowed_updates=Update.ALL_TYPES, drop_pending_updates=True)


if __name__ == "__main__":
    main()
