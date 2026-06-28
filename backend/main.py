"""
Hyperliquid Whale Tracker API — v7.0
"""

import json
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from config.settings import FRONTEND_URL, TELEGRAM_ENABLED
import db.database as db
from services import hyperliquid as hl_service
from services.telegram_service import telegram_bot
from jobs import monitor as monitor_job
from routes import whales as whales_router
from routes import telegram as telegram_router
from routes import database_routes as db_router
from routes import ai as ai_router

# ============================================
# Estado global compartilhado
# ============================================

WHALES_FILE = Path("whales_data.json")

DEFAULT_WHALES = {
    "0x010461DBc33f87b1a0f765bcAc2F96F4B3936182": "Whale 0x0104",
    "0x8c5865689EABe45645fa034e53d0c9995DCcb9c9": "Whale 0x8c58",
    "0x939f95036D2e7b6d7419Ec072BF9d967352204d2": "Whale 0x939f",
    "0x3eca9823105034b0d580dd722c75c0c23829a3d9": "Whale 0x3eca",
    "0x579f4017263b88945d727a927bf1e3d061fee5ff": "Whale 0x579f",
    "0x9eec98D048D06D9CD75318FFfA3f3960e081daAb": "Whale 0x9eec",
    "0x020ca66c30bec2c4fe3861a94e4db4a498a35872": "Whale 0x020c",
    "0xbadbb1de95b5f333623ebece7026932fa5039ee6": "Whale 0xbadb",
    "0x9e4f6D88f1e34d5F3E96451754a87Aad977Ceff3": "Whale 0x9e4f",
    "0x8d0E342E0524392d035Fb37461C6f5813ff59244": "Whale 0x8d0E",
    "0xC385D2cD1971ADfeD0E47813702765551cAe0372": "Whale 0xC385",
}


def _load_whales() -> dict:
    if WHALES_FILE.exists():
        try:
            with open(WHALES_FILE) as f:
                data = json.load(f)
                print(f"✅ {len(data)} whales carregadas")
                return data
        except Exception as e:
            print(f"⚠️ Erro ao carregar whales: {e}")
    print("📝 Usando whales padrão")
    _save_whales(DEFAULT_WHALES)
    return DEFAULT_WHALES.copy()


def _save_whales(whales: dict):
    try:
        with open(WHALES_FILE, "w") as f:
            json.dump(whales, f, indent=2)
    except Exception as e:
        print(f"❌ Erro ao salvar whales: {e}")


KNOWN_WHALES: dict = _load_whales()

cache: dict = {
    "whales": [],
    "last_update": None,
    "market_prices": {},
}

alert_state: dict = {
    "positions": {},
    "orders": {},
    "liquidation_warnings": set(),
    "last_alert_time": {},
}

scheduler = AsyncIOScheduler()

# ============================================
# Lifespan (substitui o on_event deprecado)
# ============================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    global alert_state

    print("🚀 Hyperliquid Whale Tracker API v7.0")
    print(f"📊 {len(KNOWN_WHALES)} whales carregadas")
    print(f"📱 Telegram: {'habilitado' if TELEGRAM_ENABLED else 'desabilitado'}")
    print(f"🌐 CORS: {FRONTEND_URL}")

    db_connected = await db.init_db()
    if db_connected:
        print("✅ PostgreSQL conectado!")
        loaded = await db.load_alert_state()
        if loaded:
            alert_state.update(loaded)
            hl_service.init_state(cache, alert_state, KNOWN_WHALES)
            whales_router.init_state(KNOWN_WHALES, cache, alert_state, scheduler)
            telegram_router.init_state(alert_state, KNOWN_WHALES, scheduler)
            print(f"✅ Estado de alertas restaurado: {len(alert_state['positions'])} posições")
            tg_cfg = alert_state.get("telegram_config")
            if tg_cfg:
                telegram_bot.reconfigure(
                    token=tg_cfg.get("token") or None,
                    chat_id=tg_cfg.get("chat_id") or None,
                    enabled=tg_cfg.get("enabled"),
                )
                print("✅ Config Telegram restaurada do banco")
        else:
            print("📝 Iniciando estado de alertas do zero")
    else:
        print("⚠️ Rodando sem banco de dados (métricas indisponíveis)")

    print("🔄 Buscando preços iniciais...")
    await hl_service.fetch_market_prices()
    print(f"✅ {len(cache.get('market_prices', {}))} preços carregados")

    scheduler.add_job(
        monitor_job.monitor_whales_job,
        trigger=IntervalTrigger(seconds=30),
        id="monitor_whales",
        name="Monitorar whales a cada 30s",
        replace_existing=True,
    )
    scheduler.start()
    print("✅ Scheduler iniciado — monitoramento 24/7 ativo (30s)")

    await monitor_job.monitor_whales_job()

    yield  # aplicação roda aqui

    print("\n🛑 Desligando sistema...")
    if db.db_pool:
        await db.save_alert_state(alert_state)
        print("✅ Estado de alertas salvo")
    scheduler.shutdown()
    print("✅ Scheduler desligado")
    await db.close_db()
    print("👋 Sistema desligado com sucesso!")


# ============================================
# App
# ============================================

app = FastAPI(
    title="Hyperliquid Whale Tracker API",
    version="7.0",
    description="Monitoramento 24/7 de whales na Hyperliquid com AI analytics.",
    lifespan=lifespan,
)

# CORS: aceita FRONTEND_URL explicitamente + qualquer subdomínio *.onrender.com
# automaticamente (sem precisar configurar env var no Render)
_cors_origins = [FRONTEND_URL, "http://localhost:3000"]
_cors_origin_regex = r"https://.*\.onrender\.com"

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(_cors_origins)),
    allow_origin_regex=_cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# Inicialização do estado compartilhado
# ============================================

hl_service.init_state(cache, alert_state, KNOWN_WHALES)
monitor_job.init_state(cache)
whales_router.init_state(KNOWN_WHALES, cache, alert_state, scheduler)
telegram_router.init_state(alert_state, KNOWN_WHALES, scheduler)
ai_router.init_state(cache)

# ============================================
# Rotas
# ============================================

app.include_router(whales_router.router)
app.include_router(telegram_router.router)
app.include_router(db_router.router)
app.include_router(ai_router.router)


@app.get("/")
async def root():
    return {
        "message": "Hyperliquid Whale Tracker API",
        "version": "7.0",
        "telegram_enabled": TELEGRAM_ENABLED,
        "database_enabled": db.db_pool is not None,
        "total_whales": len(KNOWN_WHALES),
        "scheduler_running": scheduler.running,
        "endpoints": {
            "GET /whales": "Lista todas as whales com métricas",
            "GET /whales/{address}": "Dados de uma whale",
            "POST /whales": "Adicionar whale",
            "DELETE /whales/{address}": "Remover whale",
            "GET /health": "Status da API",
            "GET /keep-alive": "Keep-alive para cron",
            "GET /telegram/status": "Status do Telegram",
            "GET /telegram/config": "Ler configuração do Telegram",
            "POST /telegram/config": "Salvar token/chat_id do Telegram",
            "POST /telegram/send-resume": "Enviar resumo via Telegram",
            "GET /api/database/health": "Saúde do banco",
            "GET /api/database/backup": "Backup JSON",
            "GET /api/database/trades": "Histórico de trades",
            "GET /api/ai/whale-scores": "Intelligence scores",
            "GET /api/ai/market-sentiment": "Sentiment do mercado",
            "GET /api/ai/whale-correlation": "Matriz de correlação",
            "GET /api/ai/predictive-signals": "Sinais preditivos",
        },
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
