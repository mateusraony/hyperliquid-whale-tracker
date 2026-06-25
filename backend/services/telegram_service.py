"""
Telegram Bot — envio de alertas formatados em HTML.
"""

import httpx
from datetime import datetime, timezone, timedelta

from config.settings import TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_ENABLED

BRT = timezone(timedelta(hours=-3))


def get_brt_time() -> str:
    return datetime.now(BRT).strftime("%d/%m %H:%M:%S")


def get_wallet_link(address: str) -> tuple[str, str]:
    if address == "0x010461DBc33f87b1a0f765bcAc2F96F4B3936182":
        return ("HyperDash", f"https://hyperdash.io/account/{address}")
    return ("Hypurrscan", f"https://hypurrscan.io/address/{address}")


class TelegramBot:
    def __init__(self, token: str, chat_id: str):
        self.token = token
        self.chat_id = chat_id
        self.base_url = f"https://api.telegram.org/bot{token}"
        self.enabled = TELEGRAM_ENABLED

    def reconfigure(self, token: str = None, chat_id: str = None, enabled: bool = None):
        if token is not None:
            self.token = token
            self.base_url = f"https://api.telegram.org/bot{token}"
        if chat_id is not None:
            self.chat_id = chat_id
        if enabled is not None:
            self.enabled = enabled

    async def send_message(self, text: str):
        if not self.enabled:
            print(f"[TELEGRAM DISABLED] {text[:50]}...")
            return
        if not self.token or not self.chat_id:
            print("⚠️ Telegram não configurado (TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID ausente)")
            return
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{self.base_url}/sendMessage",
                    json={
                        "chat_id": self.chat_id,
                        "text": text,
                        "parse_mode": "HTML",
                        "disable_web_page_preview": True,
                    },
                    timeout=10.0,
                )
                if resp.status_code != 200:
                    print(f"❌ Telegram HTTP {resp.status_code}: {resp.text[:100]}")
        except Exception as e:
            print(f"❌ Erro Telegram: {e}")


telegram_bot = TelegramBot(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID)
