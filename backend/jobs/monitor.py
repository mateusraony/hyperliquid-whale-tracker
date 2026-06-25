"""
Job de monitoramento automático — roda a cada 30 segundos via APScheduler.
"""

from datetime import datetime

from services.hyperliquid import fetch_all_whales
from services.telegram_service import get_brt_time

# Referência ao cache compartilhado — inicializada em main.py
_cache: dict = {}


def init_state(cache: dict):
    global _cache
    _cache = cache


async def monitor_whales_job():
    try:
        print(f"🔄 [{get_brt_time()}] Monitorando whales...")
        whales = await fetch_all_whales()
        _cache["whales"] = whales
        _cache["last_update"] = datetime.now()
        print(f"✅ [{get_brt_time()}] Concluído: {len(whales)} whales")
    except Exception as e:
        print(f"❌ [{get_brt_time()}] Erro no monitoramento: {e}")
