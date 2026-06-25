"""
Rotas Telegram: status e envio de resumo.
"""

from fastapi import APIRouter, HTTPException

from services.telegram_service import telegram_bot, get_brt_time, get_wallet_link
from services.hyperliquid import fetch_all_whales, safe_float
from config.settings import TELEGRAM_ENABLED, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

router = APIRouter()

_alert_state: dict = {}
_known_whales: dict = {}
_scheduler = None


def init_state(alert_state: dict, known_whales: dict, scheduler):
    global _alert_state, _known_whales, _scheduler
    _alert_state = alert_state
    _known_whales = known_whales
    _scheduler = scheduler


@router.get("/telegram/status")
async def telegram_status():
    return {
        "enabled": TELEGRAM_ENABLED,
        "bot_token_configured": bool(TELEGRAM_BOT_TOKEN),
        "chat_id_configured": bool(TELEGRAM_CHAT_ID),
        "active_positions_tracked": len(_alert_state.get("positions", {})),
        "active_orders_tracked": len(_alert_state.get("orders", {})),
        "liquidation_warnings_active": len(_alert_state.get("liquidation_warnings", set())),
        "scheduler_running": _scheduler.running if _scheduler else False,
    }


@router.post("/telegram/send-resume")
async def send_telegram_resume():
    try:
        whales = await fetch_all_whales()

        total_value = 0.0
        total_positions = 0
        whales_active = 0
        lines = ["📊 <b>RESUMO GERAL - WHALES TRACKER</b>\n"]

        for whale in whales:
            if "error" in whale:
                continue
            positions = whale.get("positions", [])
            if not positions:
                continue
            whales_active += 1
            total_positions += len(positions)
            value = safe_float(whale.get("total_position_value", 0))
            total_value += value
            fonte_nome, wallet_link = get_wallet_link(whale["address"])
            lines.append(
                f"🐋 <b>{whale['nickname']}</b>\n"
                f"   Posições: {len(positions)}\n"
                f"   Valor: ${value:,.0f}\n"
                f"   🔗 {fonte_nome}: {wallet_link}\n"
            )

        lines.insert(
            1,
            f"💰 <b>Total: ${total_value:,.0f}</b>\n"
            f"🐋 Whales ativas: {whales_active}/{len(_known_whales)}\n"
            f"📊 Posições abertas: {total_positions}\n"
            f"⏰ {get_brt_time()} BRT\n\n",
        )

        await telegram_bot.send_message("\n".join(lines))

        return {
            "status": "success",
            "message": "Resumo enviado!",
            "whales_ativas": whales_active,
            "total_value": total_value,
            "total_positions": total_positions,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
