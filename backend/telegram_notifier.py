"""
Telegram Bot Notifier — TDS Bab 3: Third-Party Notification Loop

TDS reference:
  "Setiap kegagalan koneksi API broker, eksekusi order fills, atau pelanggaran
   batas risiko wajib mengirimkan notifikasi instan berupa webhook push ke
   aplikasi Telegram atau Discord di HP pribadi pengguna."

Setup:
  1. Buka @BotFather di Telegram → /newbot → simpan token
  2. Kirim pesan ke bot → cari chat_id via getUpdates
  3. Isi di halaman Schedule: telegram_bot_token + telegram_chat_id

Both ntfy AND Telegram are supported simultaneously — user can enable either or both.
"""
import httpx
from typing import Optional


def send_telegram(chat_id: str, bot_token: str,
                  text: str, parse_mode: str = "HTML") -> bool:
    """Send message via Telegram Bot API."""
    if not chat_id or not bot_token:
        return False
    try:
        url  = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        resp = httpx.post(url, json={
            "chat_id":    chat_id,
            "text":       text[:4096],      # Telegram limit
            "parse_mode": parse_mode,
        }, timeout=10)
        return resp.status_code == 200
    except Exception:
        return False


def format_telegram_portfolio(title: str, body: str) -> str:
    """Format portfolio signal as clean Telegram message (TDS Bab 3 JSON webhook analogy)."""
    lines = body.split("\n")
    # Convert ntfy-style emoji text → Telegram HTML
    formatted = ["<b>" + title + "</b>", ""]
    for line in lines:
        if line.startswith("──"):
            formatted.append("<code>" + "─" * 28 + "</code>")
        elif line.startswith("📊") or line.startswith("⚗"):
            formatted.append("<b>" + line + "</b>")
        elif line.strip():
            formatted.append(line)
    return "\n".join(formatted)


def send_kill_switch_alert(chat_id: str, bot_token: str,
                            scope: str, reason: str) -> bool:
    """TDS Bab 3: Kill-Switch notification."""
    msg = (
        f"🚨 <b>KILL-SWITCH ACTIVATED</b>\n\n"
        f"Scope: <code>{scope}</code>\n"
        f"Reason: {reason}\n\n"
        f"Platform dihentikan. Cek dashboard untuk resume."
    )
    return send_telegram(chat_id, bot_token, msg)
