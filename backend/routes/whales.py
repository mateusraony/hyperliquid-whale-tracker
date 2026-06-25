"""
Rotas de gerenciamento de whales: CRUD + health + keep-alive.
"""

from datetime import datetime
from fastapi import APIRouter, HTTPException

from models.schemas import AddWhaleRequest
from services.hyperliquid import fetch_all_whales, fetch_whale_data
import db.database as db

router = APIRouter()

# Estado compartilhado injetado de main.py
_known_whales: dict = {}
_cache: dict = {}
_alert_state: dict = {}
_scheduler = None


def init_state(known_whales: dict, cache: dict, alert_state: dict, scheduler):
    global _known_whales, _cache, _alert_state, _scheduler
    _known_whales = known_whales
    _cache = cache
    _alert_state = alert_state
    _scheduler = scheduler


def _save_whales():
    from pathlib import Path
    import json
    path = Path("whales_data.json")
    try:
        with open(path, "w") as f:
            json.dump(_known_whales, f, indent=2)
    except Exception as e:
        print(f"❌ Erro ao salvar whales: {e}")


@router.get("/whales")
async def get_whales():
    whales = await fetch_all_whales()
    _cache["whales"] = whales
    _cache["last_update"] = datetime.now()
    return {
        "whales": whales,
        "count": len(whales),
        "last_update": _cache["last_update"].isoformat(),
    }


@router.get("/whales/{address}")
async def get_whale(address: str):
    return await fetch_whale_data(address)


@router.post("/whales")
async def add_whale(request: AddWhaleRequest):
    if not request.address.startswith("0x") or len(request.address) != 42:
        raise HTTPException(status_code=400, detail="Endereço inválido. Use formato 0x… com 42 caracteres.")
    if request.address in _known_whales:
        raise HTTPException(status_code=400, detail="Whale já está sendo monitorada.")

    nickname = request.nickname or f"Whale {request.address[:6]}"
    test = await fetch_whale_data(request.address, nickname)
    if "error" in test:
        raise HTTPException(status_code=400, detail=f"Erro ao buscar whale: {test['error']}")

    _known_whales[request.address] = nickname
    _save_whales()

    return {
        "message": "Whale adicionada com sucesso!",
        "address": request.address,
        "nickname": nickname,
        "total_whales": len(_known_whales),
    }


@router.delete("/whales/{address}")
async def delete_whale(address: str):
    if address not in _known_whales:
        raise HTTPException(status_code=404, detail="Whale não encontrada.")

    removed = _known_whales.pop(address)
    _save_whales()

    for key in [k for k in _alert_state["positions"] if k.startswith(address)]:
        _alert_state["positions"].pop(key, None)
        _alert_state["liquidation_warnings"].discard(key)
    for key in [k for k in _alert_state["orders"] if k.startswith(address)]:
        _alert_state["orders"].pop(key, None)

    await db.save_alert_state(_alert_state)
    _cache["whales"] = [w for w in _cache.get("whales", []) if w.get("address") != address]

    return {
        "message": "Whale removida!",
        "address": address,
        "nickname": removed,
        "total_whales": len(_known_whales),
    }


@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "total_whales": len(_known_whales),
        "telegram_enabled": db.db_pool is not None,
        "database_connected": db.db_pool is not None,
        "scheduler_running": _scheduler.running if _scheduler else False,
        "cache_age": (datetime.now() - _cache["last_update"]).seconds if _cache.get("last_update") else None,
        "market_prices_cached": len(_cache.get("market_prices", {})),
    }


@router.get("/keep-alive")
async def keep_alive():
    return {
        "status": "alive",
        "timestamp": datetime.now().isoformat(),
        "scheduler_running": _scheduler.running if _scheduler else False,
        "database_connected": db.db_pool is not None,
        "total_whales": len(_known_whales),
        "message": "Serviço ativo e monitorando!",
    }
