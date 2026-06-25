"""
Hyperliquid API — busca de posições, preços e envio de alertas Telegram.
"""

import httpx
import asyncio
from datetime import datetime

import db.database as db
from services.telegram_service import telegram_bot, get_brt_time, get_wallet_link

# Referências ao estado compartilhado — inicializadas em main.py
_cache: dict = {}
_alert_state: dict = {}
_known_whales: dict = {}


def init_state(cache: dict, alert_state: dict, known_whales: dict):
    """Recebe as referências do estado global de main.py."""
    global _cache, _alert_state, _known_whales
    _cache = cache
    _alert_state = alert_state
    _known_whales = known_whales


# ============================================
# Utilitários
# ============================================

def safe_float(value, default=0.0) -> float:
    if value is None or value == "":
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def safe_int(value, default=0) -> int:
    if value is None or value == "":
        return default
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


# ============================================
# Preços de mercado
# ============================================

async def fetch_market_prices() -> dict:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post("https://api.hyperliquid.xyz/info", json={"type": "allMids"})
            if resp.status_code == 200:
                prices = {coin: float(price) for coin, price in resp.json().items()}
                _cache["market_prices"] = prices
                print(f"✅ Preços atualizados: {len(prices)} tokens")
                return prices
            print(f"⚠️ Preços: HTTP {resp.status_code}")
            return _cache.get("market_prices", {})
    except Exception as e:
        print(f"❌ Erro ao buscar preços: {e}")
        return _cache.get("market_prices", {})


# ============================================
# Alertas Telegram
# ============================================

async def check_and_alert_positions(whale_data: dict):
    address = whale_data.get("address")
    nickname = whale_data.get("nickname", "Whale")
    positions = whale_data.get("positions", [])
    fonte_nome, wallet_link = get_wallet_link(address)

    for position in positions:
        coin = position.get("coin", "UNKNOWN")
        pos_key = f"{address}_{coin}"

        if pos_key not in _alert_state["positions"]:
            _alert_state["positions"][pos_key] = position
            side = position.get("side", "").upper()
            size = abs(safe_float(position.get("szi", 0)))
            entry = safe_float(position.get("entryPx", 0))
            leverage = safe_float(position.get("leverage", {}).get("value", 1) if isinstance(position.get("leverage"), dict) else 1)
            position_value = size * entry
            liq_px = safe_float(position.get("liquidationPx", 0))

            msg = f"""
🟢 <b>POSIÇÃO ABERTA</b>

🐋 Wallet: {nickname}
🔗 {fonte_nome}: {wallet_link}

📊 Token: <b>{coin}</b>
{'📈 LONG' if side == 'LONG' else '📉 SHORT'}

💰 Tamanho: ${position_value:,.0f}
🎯 Alavancagem: {leverage:.1f}x
📍 Entry: ${entry:,.4f}
💀 Liquidação: ${liq_px:,.4f}

⏰ {get_brt_time()} BRT
"""
            await telegram_bot.send_message(msg.strip())
            await db.save_open_trade(address, nickname, position)

        else:
            # Update snapshot so close alerts use current PnL/size/liquidation price
            _alert_state["positions"][pos_key] = position
            pos_value = safe_float(position.get("positionValue", 0))
            szi = safe_float(position.get("szi", 1))
            current_px = pos_value / abs(szi) if szi != 0 else 0
            liq_px = safe_float(position.get("liquidationPx", 0))

            if liq_px > 0 and current_px > 0:
                dist = abs((current_px - liq_px) / current_px) * 100
                if dist <= 1.0 and pos_key not in _alert_state["liquidation_warnings"]:
                    _alert_state["liquidation_warnings"].add(pos_key)
                    side = position.get("side", "").upper()
                    msg = f"""
⚠️ <b>RISCO DE LIQUIDAÇÃO</b>

🐋 Wallet: {nickname}
🔗 {fonte_nome}: {wallet_link}

📊 Token: <b>{coin}</b>
{'📈 LONG' if side == 'LONG' else '📉 SHORT'}

💀 Liquidação: ${liq_px:,.4f}
📍 Preço Atual: ${current_px:,.4f}
🚨 Distância: {dist:.2f}%

⏰ {get_brt_time()} BRT
"""
                    await telegram_bot.send_message(msg.strip())
                elif dist > 2.0 and pos_key in _alert_state["liquidation_warnings"]:
                    _alert_state["liquidation_warnings"].discard(pos_key)

    stored = {k: v for k, v in _alert_state["positions"].items() if k.startswith(address)}
    current_coins = {pos.get("coin") for pos in positions}

    for pos_key in list(stored.keys()):
        coin = pos_key.split("_", 1)[1]
        if coin not in current_coins:
            closed = _alert_state["positions"].pop(pos_key)
            # Check before discarding so is_liq detection works
            was_at_risk = pos_key in _alert_state["liquidation_warnings"]
            _alert_state["liquidation_warnings"].discard(pos_key)

            side = closed.get("side", "").upper()
            unrealized = safe_float(closed.get("unrealizedPnl", 0))
            szi = safe_float(closed.get("szi", 0))
            entry_px = safe_float(closed.get("entryPx", 1))
            pos_value = abs(szi) * entry_px
            loss_pct = (unrealized / pos_value * 100) if pos_value > 0 else 0
            is_liq = was_at_risk and loss_pct < -50

            if is_liq:
                msg = f"""
💀💀 <b>POSIÇÃO LIQUIDADA</b>

🐋 Wallet: {nickname}
🔗 {fonte_nome}: {wallet_link}

📊 Token: <b>{coin}</b>
{'📈 LONG' if side == 'LONG' else '📉 SHORT'}

💵 Perda: ${unrealized:,.2f} ({loss_pct:.1f}%)
⚡ LIQUIDAÇÃO CONFIRMADA

⏰ {get_brt_time()} BRT
"""
                await db.save_liquidation(address, nickname, closed, unrealized)
            else:
                emoji = "✅" if unrealized > 0 else "❌"
                result = "LUCRO" if unrealized > 0 else "PREJUÍZO"
                msg = f"""
{emoji} <b>POSIÇÃO FECHADA</b>

🐋 Wallet: {nickname}
🔗 {fonte_nome}: {wallet_link}

📊 Token: <b>{coin}</b>
{'📈 LONG' if side == 'LONG' else '📉 SHORT'}

💵 PnL: ${unrealized:,.2f}
🎯 Resultado: {result}

⏰ {get_brt_time()} BRT
"""
                exit_px = entry_px * (1 + unrealized / pos_value) if pos_value > 0 else entry_px
                await db.close_trade(address, coin, exit_px, unrealized)

            await telegram_bot.send_message(msg.strip())

    await db.save_alert_state(_alert_state)


async def check_and_alert_orders(whale_data: dict):
    address = whale_data.get("address")
    nickname = whale_data.get("nickname", "Whale")
    orders = whale_data.get("orders", [])
    fonte_nome, wallet_link = get_wallet_link(address)

    for order in orders:
        order_id = order.get("oid", "")
        order_key = f"{address}_{order_id}"

        if order_key not in _alert_state["orders"]:
            _alert_state["orders"][order_key] = order
            coin = order.get("coin", "UNKNOWN")
            side = "COMPRA" if order.get("side") == "B" else "VENDA"
            size = abs(safe_float(order.get("sz", 0)))
            limit_px = safe_float(order.get("limitPx", 0))

            msg = f"""
📝 <b>ORDER CRIADA</b>

🐋 Wallet: {nickname}
🔗 {fonte_nome}: {wallet_link}

📊 Token: <b>{coin}</b>
{'🟢 ' + side if side == 'COMPRA' else '🔴 ' + side}

💰 Quantidade: {size:,.4f}
💵 Preço Limite: ${limit_px:,.4f}

⏰ {get_brt_time()} BRT
"""
            await telegram_bot.send_message(msg.strip())

    stored_orders = {k: v for k, v in _alert_state["orders"].items() if k.startswith(address)}
    current_ids = {o.get("oid") for o in orders}

    for order_key in list(stored_orders.keys()):
        oid = order_key.split("_", 1)[1]
        if oid not in current_ids:
            closed_order = _alert_state["orders"].pop(order_key)
            coin = closed_order.get("coin", "UNKNOWN")
            side = "COMPRA" if closed_order.get("side") == "B" else "VENDA"

            msg = f"""
✅ <b>ORDER CONCLUÍDA/CANCELADA</b>

🐋 Wallet: {nickname}
🔗 {fonte_nome}: {wallet_link}

📊 Token: <b>{coin}</b>
{'🟢 ' + side if side == 'COMPRA' else '🔴 ' + side}

⏰ {get_brt_time()} BRT
"""
            await telegram_bot.send_message(msg.strip())

    await db.save_alert_state(_alert_state)


# ============================================
# Busca de dados de whale
# ============================================

async def fetch_whale_data(address: str, nickname: str = None) -> dict:
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            state_resp, orders_resp = await asyncio.gather(
                client.post(
                    "https://api.hyperliquid.xyz/info",
                    json={"type": "clearinghouseState", "user": address},
                ),
                client.post(
                    "https://api.hyperliquid.xyz/info",
                    json={"type": "openOrders", "user": address},
                ),
            )
            if state_resp.status_code != 200:
                raise Exception(f"clearinghouseState HTTP {state_resp.status_code}")

            data = state_resp.json()
            raw_orders = orders_resp.json() if orders_resp.status_code == 200 else []
            market_prices = _cache.get("market_prices", {})

            positions = []
            for pos in data.get("assetPositions", []):
                if "position" not in pos:
                    continue
                p = pos["position"]
                coin = p.get("coin", "")
                mark_px = market_prices.get(coin, 0)
                positions.append({
                    "coin": coin,
                    "side": "LONG" if safe_float(p.get("szi", "0")) > 0 else "SHORT",
                    "size": abs(safe_float(p.get("szi", 0))),
                    "szi": p.get("szi", "0"),
                    "entryPx": p.get("entryPx", "0"),
                    "positionValue": p.get("positionValue", "0"),
                    "unrealizedPnl": p.get("unrealizedPnl", "0"),
                    "leverage": p.get("leverage", {}),
                    "liquidationPx": p.get("liquidationPx", "0"),
                    "markPx": str(mark_px),
                })

            orders = [
                {
                    "coin": o.get("coin", ""),
                    "side": o.get("side", ""),
                    "sz": o.get("sz", "0"),
                    "limitPx": o.get("limitPx", "0"),
                    "oid": o.get("oid", ""),
                }
                for o in (raw_orders if isinstance(raw_orders, list) else [])
            ]

            total_value = sum(abs(safe_float(p.get("positionValue", 0))) for p in positions)

            if not nickname:
                nickname = _known_whales.get(address, f"Whale {address[:6]}")

            metrics = await db.calculate_wallet_metrics(address, positions)

            whale_data = {
                "address": address,
                "nickname": nickname,
                "positions": positions,
                "orders": orders,
                "total_positions": len(positions),
                "total_orders": len(orders),
                "total_position_value": total_value,
                "metrics": metrics,
                "last_update": datetime.now().isoformat(),
            }

            await check_and_alert_positions(whale_data)
            await check_and_alert_orders(whale_data)
            return whale_data

    except Exception as e:
        print(f"❌ Erro whale {address[:8]}: {e}")
        return {
            "address": address,
            "nickname": nickname or _known_whales.get(address, f"Whale {address[:6]}"),
            "error": str(e),
            "last_update": datetime.now().isoformat(),
        }


async def fetch_all_whales() -> list:
    await fetch_market_prices()
    tasks = [fetch_whale_data(addr, nick) for addr, nick in _known_whales.items()]
    return await asyncio.gather(*tasks)
