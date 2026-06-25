"""
Rotas de IA / Analytics: whale scores, market sentiment, correlação, sinais preditivos.
"""

from datetime import datetime
from fastapi import APIRouter, HTTPException

from services.hyperliquid import fetch_all_whales, safe_float
import db.database as db

router = APIRouter()

_cache: dict = {}


def init_state(cache: dict):
    global _cache
    _cache = cache


# ============================================
# Whale Intelligence Scores
# ============================================

@router.get("/api/ai/whale-scores")
async def get_whale_intelligence_scores():
    if not db.db_pool:
        raise HTTPException(status_code=503, detail="Banco de dados não conectado.")

    whales = _cache.get("whales") or await fetch_all_whales()
    _cache["whales"] = whales

    scores = []
    for whale in whales:
        if "error" in whale:
            continue
        address = whale.get("address")
        nickname = whale.get("nickname", "Unknown")
        metrics = whale.get("metrics", {})

        win_rate = metrics.get("win_rate_global") or 0
        sharpe = metrics.get("sharpe_ratio") or 0
        total_trades = metrics.get("total_trades") or 0
        total_pnl = metrics.get("total_pnl") or 0

        async with db.db_pool.acquire() as conn:
            trades = await conn.fetch(
                "SELECT pnl FROM trades WHERE wallet=$1 AND status='closed' ORDER BY close_timestamp DESC LIMIT 100",
                address,
            )

        consistency = 50
        if len(trades) >= 5:
            pnls = [float(t["pnl"]) for t in trades]
            mean = sum(pnls) / len(pnls)
            std = (sum((x - mean) ** 2 for x in pnls) / len(pnls)) ** 0.5
            avg_abs = sum(abs(x) for x in pnls) / len(pnls)
            consistency = 100 - min(100, (std / avg_abs * 100)) if avg_abs > 0 else 50

        avg_trade = abs(total_pnl / total_trades) if total_trades > 0 else 0
        volume_score = min(100, (avg_trade / 100000) * 100)

        async with db.db_pool.acquire() as conn:
            recent = await conn.fetchrow(
                "SELECT COALESCE(SUM(pnl), 0) as pnl FROM trades WHERE wallet=$1 AND close_timestamp >= NOW() - INTERVAL '7 days'",
                address,
            )
        recent_pnl = float(recent["pnl"]) if recent else 0
        recent_score = min(100, max(0, 50 + (recent_pnl / 10000) * 50))

        score = (
            win_rate * 0.30
            + min(100, sharpe * 25) * 0.25
            + consistency * 0.20
            + volume_score * 0.15
            + recent_score * 0.10
        )

        if score >= 85:
            stars, tier = 5, "S-Tier"
        elif score >= 75:
            stars, tier = 4, "A-Tier"
        elif score >= 65:
            stars, tier = 3, "B-Tier"
        elif score >= 50:
            stars, tier = 2, "C-Tier"
        else:
            stars, tier = 1, "D-Tier"

        scores.append({
            "address": address,
            "nickname": nickname,
            "intelligence_score": round(score, 1),
            "stars": stars,
            "tier": tier,
            "breakdown": {
                "win_rate": round(win_rate, 1),
                "sharpe_ratio": round(sharpe, 2),
                "consistency": round(consistency, 1),
                "avg_trade_size": round(avg_trade, 2),
                "recent_pnl_7d": round(recent_pnl, 2),
            },
            "total_trades": total_trades,
            "total_pnl": round(total_pnl, 2),
        })

    scores.sort(key=lambda x: x["intelligence_score"], reverse=True)
    return {"whale_scores": scores, "top_3": scores[:3], "count": len(scores), "timestamp": datetime.now().isoformat()}


# ============================================
# Market Sentiment
# ============================================

@router.get("/api/ai/market-sentiment")
async def get_market_sentiment():
    whales = _cache.get("whales") or await fetch_all_whales()
    _cache["whales"] = whales

    total_longs = total_shorts = 0
    vol_long = vol_short = 0.0
    token_data: dict = {}

    for whale in whales:
        if "error" in whale:
            continue
        for pos in whale.get("positions", []):
            coin = pos.get("coin", "UNKNOWN")
            szi = safe_float(pos.get("szi", 0))
            pos_val = safe_float(pos.get("positionValue", 0))
            is_long = szi > 0

            if is_long:
                total_longs += 1
                vol_long += pos_val
            else:
                total_shorts += 1
                vol_short += pos_val

            if coin not in token_data:
                token_data[coin] = {"longs": 0, "shorts": 0, "volume": 0.0, "whales": set()}
            token_data[coin]["whales"].add(whale.get("address"))
            token_data[coin]["volume"] += pos_val
            if is_long:
                token_data[coin]["longs"] += 1
            else:
                token_data[coin]["shorts"] += 1

    total = total_longs + total_shorts
    bull_pct = (total_longs / total * 100) if total > 0 else 0
    bear_pct = (total_shorts / total * 100) if total > 0 else 0

    if bull_pct >= 70:
        sentiment, icon = "STRONG BULLISH", "🟢🟢"
    elif bull_pct >= 55:
        sentiment, icon = "BULLISH", "🟢"
    elif bear_pct >= 70:
        sentiment, icon = "STRONG BEARISH", "🔴🔴"
    elif bear_pct >= 55:
        sentiment, icon = "BEARISH", "🔴"
    else:
        sentiment, icon = "NEUTRAL", "🟡"

    hot_tokens = sorted(
        [
            {
                "token": t,
                "whale_count": len(d["whales"]),
                "longs": d["longs"],
                "shorts": d["shorts"],
                "total_volume": round(d["volume"], 2),
                "consensus": "LONG" if d["longs"] > d["shorts"] else "SHORT" if d["shorts"] > d["longs"] else "MIXED",
            }
            for t, d in token_data.items()
        ],
        key=lambda x: x["total_volume"],
        reverse=True,
    )

    scores_resp = await get_whale_intelligence_scores()
    top_3 = scores_resp.get("top_3", [])
    divergences = []
    for tw in top_3:
        addr = tw["address"]
        wdata = next((w for w in whales if w.get("address") == addr), None)
        if not wdata:
            continue
        for pos in wdata.get("positions", []):
            coin = pos.get("coin")
            szi = safe_float(pos.get("szi", 0))
            w_long = szi > 0
            if coin in token_data:
                maj_long = token_data[coin]["longs"] > token_data[coin]["shorts"]
                if (w_long and not maj_long) or (not w_long and maj_long):
                    divergences.append({
                        "whale": tw["nickname"],
                        "token": coin,
                        "whale_position": "LONG" if w_long else "SHORT",
                        "majority_position": "LONG" if maj_long else "SHORT",
                        "alert_level": "HIGH" if tw["intelligence_score"] >= 85 else "MEDIUM",
                    })

    return {
        "sentiment": sentiment,
        "sentiment_icon": icon,
        "bullish_percentage": round(bull_pct, 1),
        "bearish_percentage": round(bear_pct, 1),
        "positions": {"total_longs": total_longs, "total_shorts": total_shorts, "volume_long": round(vol_long, 2), "volume_short": round(vol_short, 2)},
        "hot_tokens": hot_tokens[:10],
        "divergences": divergences,
        "timestamp": datetime.now().isoformat(),
    }


# ============================================
# Whale Correlation Matrix
# ============================================

@router.get("/api/ai/whale-correlation")
async def get_whale_correlation():
    if not db.db_pool:
        raise HTTPException(status_code=503, detail="Banco de dados não conectado.")

    whales = _cache.get("whales") or await fetch_all_whales()
    _cache["whales"] = whales

    profiles = {}
    for whale in whales:
        if "error" in whale:
            continue
        addr = whale.get("address")
        profile = {
            pos.get("coin"): "LONG" if safe_float(pos.get("szi", 0)) > 0 else "SHORT"
            for pos in whale.get("positions", [])
        }
        profiles[addr] = {"nickname": whale.get("nickname", "Unknown"), "profile": profile}

    addresses = list(profiles.keys())
    matrix = []
    for i, a1 in enumerate(addresses):
        for a2 in addresses[i + 1:]:
            p1, p2 = profiles[a1]["profile"], profiles[a2]["profile"]
            common = set(p1) & set(p2)
            if not common:
                continue
            same = sum(1 for t in common if p1[t] == p2[t])
            corr = same / len(common) * 100
            if corr >= 50:
                matrix.append({
                    "whale1": profiles[a1]["nickname"], "whale1_address": a1,
                    "whale2": profiles[a2]["nickname"], "whale2_address": a2,
                    "correlation": round(corr, 1),
                    "common_tokens": len(common),
                    "same_direction_count": same,
                })

    matrix.sort(key=lambda x: x["correlation"], reverse=True)

    groups = []
    visited: set = set()
    high = [c for c in matrix if c["correlation"] >= 75]
    for corr in high:
        a1, a2 = corr["whale1_address"], corr["whale2_address"]
        if a1 not in visited or a2 not in visited:
            members = {a1, a2}
            visited |= members
            for other in high:
                if other["whale1_address"] in members or other["whale2_address"] in members:
                    members.add(other["whale1_address"])
                    members.add(other["whale2_address"])
            groups.append({
                "group_id": len(groups) + 1,
                "members": [profiles[a]["nickname"] for a in members],
                "size": len(members),
            })

    return {
        "correlation_matrix": matrix[:20],
        "highly_correlated_groups": groups,
        "total_pairs_analyzed": len(addresses) * (len(addresses) - 1) // 2,
        "significant_correlations": len(matrix),
        "timestamp": datetime.now().isoformat(),
    }


# ============================================
# Predictive Signals
# ============================================

@router.get("/api/ai/predictive-signals")
async def get_predictive_signals():
    if not db.db_pool:
        raise HTTPException(status_code=503, detail="Banco de dados não conectado.")

    whales = _cache.get("whales") or await fetch_all_whales()
    _cache["whales"] = whales

    scores_resp = await get_whale_intelligence_scores()
    top_3_addrs = [w["address"] for w in scores_resp.get("whale_scores", [])[:3]]
    signals = []

    async with db.db_pool.acquire() as conn:
        recent = await conn.fetch(
            """
            SELECT wallet, token, side, size, entry_price, open_timestamp FROM trades
            WHERE open_timestamp >= NOW() - INTERVAL '4 hours' AND status = 'open'
            ORDER BY open_timestamp DESC
            """
        )

    token_activity: dict = {}
    for trade in recent:
        token = trade["token"]
        wallet = trade["wallet"]
        side = trade["side"]
        size = float(trade["size"])
        if token not in token_activity:
            token_activity[token] = {"longs": [], "shorts": [], "top_whale_longs": 0, "top_whale_shorts": 0, "total_volume": 0}
        token_activity[token]["total_volume"] += size
        if "long" in side.lower():
            token_activity[token]["longs"].append(wallet)
            if wallet in top_3_addrs:
                token_activity[token]["top_whale_longs"] += 1
        else:
            token_activity[token]["shorts"].append(wallet)
            if wallet in top_3_addrs:
                token_activity[token]["top_whale_shorts"] += 1

    for token, act in token_activity.items():
        if act["top_whale_longs"] >= 3:
            async with db.db_pool.acquire() as conn:
                hist = await conn.fetchrow(
                    "SELECT COUNT(*) FILTER (WHERE pnl > 0) as wins, COUNT(*) as total FROM trades WHERE token=$1 AND status='closed' AND close_timestamp >= NOW() - INTERVAL '30 days'",
                    token,
                )
            confidence = min(95, 70 + ((hist["wins"] / hist["total"] * 100) - 50) * 0.5) if hist and hist["total"] > 0 else 75
            signals.append({"signal_type": "STRONG BUY", "token": token, "confidence": round(confidence, 1), "reason": f"{act['top_whale_longs']} top whales abriram LONG nas últimas 4h", "volume": round(act["total_volume"], 2), "color": "green", "icon": "🟢"})

    for whale_data in whales:
        if "error" in whale_data or whale_data.get("address") not in top_3_addrs:
            continue
        addr = whale_data["address"]
        async with db.db_pool.acquire() as conn:
            closed = await conn.fetch(
                "SELECT token, size, pnl FROM trades WHERE wallet=$1 AND status='closed' AND close_timestamp >= NOW() - INTERVAL '24 hours'",
                addr,
            )
        for trade in closed:
            if float(trade["pnl"]) > 0 and float(trade["size"]) > 50000:
                signals.append({"signal_type": "CAUTION", "token": trade["token"], "confidence": 72, "reason": f"Top whale fechou ${float(trade['size']):,.0f} em {trade['token']} (lucro: ${float(trade['pnl']):,.0f})", "volume": float(trade["size"]), "color": "yellow", "icon": "🟡"})

    for token, act in token_activity.items():
        if len(set(act["longs"])) >= 2 and act["total_volume"] < 100000:
            signals.append({"signal_type": "WATCH", "token": token, "confidence": 65, "reason": f"{len(set(act['longs']))} whales acumulando {token} silenciosamente", "volume": round(act["total_volume"], 2), "color": "blue", "icon": "🔵"})

    signals.sort(key=lambda x: x["confidence"], reverse=True)

    return {
        "signals": signals,
        "strong_buy_count": sum(1 for s in signals if s["signal_type"] == "STRONG BUY"),
        "caution_count": sum(1 for s in signals if s["signal_type"] == "CAUTION"),
        "watch_count": sum(1 for s in signals if s["signal_type"] == "WATCH"),
        "timestamp": datetime.now().isoformat(),
    }
