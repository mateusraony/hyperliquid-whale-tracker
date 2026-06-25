"""
database.py — PostgreSQL para Whale Tracker
Tracking de trades, liquidações e métricas por wallet.
"""

import os
import asyncpg
from datetime import datetime
from typing import Optional
import json

from config.settings import DATABASE_URL

db_pool = None


async def init_db():
    global db_pool
    if not DATABASE_URL:
        print("⚠️ DATABASE_URL não configurado. Métricas desabilitadas.")
        return False
    try:
        db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=10, command_timeout=60)
        print("✅ Pool PostgreSQL criado!")
        await create_tables()
        print("✅ Banco inicializado!")
        return True
    except Exception as e:
        print(f"❌ Erro PostgreSQL: {e}")
        print("⚠️ Sistema continuará sem banco de dados")
        return False


async def close_db():
    global db_pool
    if db_pool:
        await db_pool.close()
        print("✅ Pool PostgreSQL fechado")


async def create_tables():
    create_trades = """
    CREATE TABLE IF NOT EXISTS trades (
        id SERIAL PRIMARY KEY,
        wallet VARCHAR(42) NOT NULL,
        nickname VARCHAR(100),
        token VARCHAR(20) NOT NULL,
        side VARCHAR(5) NOT NULL,
        size DECIMAL(20, 8) NOT NULL,
        entry_price DECIMAL(20, 8),
        exit_price DECIMAL(20, 8),
        pnl DECIMAL(20, 2),
        leverage DECIMAL(10, 2),
        open_timestamp TIMESTAMP NOT NULL,
        close_timestamp TIMESTAMP,
        status VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
    );
    """
    create_liquidations = """
    CREATE TABLE IF NOT EXISTS liquidations (
        id SERIAL PRIMARY KEY,
        wallet VARCHAR(42) NOT NULL,
        nickname VARCHAR(100),
        token VARCHAR(20) NOT NULL,
        side VARCHAR(5) NOT NULL,
        size DECIMAL(20, 8) NOT NULL,
        liquidation_price DECIMAL(20, 8),
        loss_amount DECIMAL(20, 2),
        timestamp TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
    );
    """
    create_snapshots = """
    CREATE TABLE IF NOT EXISTS wallet_snapshots (
        id SERIAL PRIMARY KEY,
        wallet VARCHAR(42) NOT NULL,
        nickname VARCHAR(100),
        timestamp TIMESTAMP NOT NULL,
        total_value DECIMAL(20, 2),
        positions_count INT,
        margin_used DECIMAL(20, 2),
        created_at TIMESTAMP DEFAULT NOW()
    );
    """
    create_alert_state = """
    CREATE TABLE IF NOT EXISTS alert_state (
        id SERIAL PRIMARY KEY,
        state_key VARCHAR(50) UNIQUE NOT NULL,
        state_data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
    );
    """
    create_indexes = """
    CREATE INDEX IF NOT EXISTS idx_trades_wallet ON trades(wallet);
    CREATE INDEX IF NOT EXISTS idx_trades_close_timestamp ON trades(close_timestamp);
    CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
    CREATE INDEX IF NOT EXISTS idx_liquidations_wallet ON liquidations(wallet);
    CREATE INDEX IF NOT EXISTS idx_liquidations_timestamp ON liquidations(timestamp);
    CREATE INDEX IF NOT EXISTS idx_wallet_snapshots_wallet ON wallet_snapshots(wallet);
    CREATE INDEX IF NOT EXISTS idx_wallet_snapshots_timestamp ON wallet_snapshots(timestamp);
    CREATE INDEX IF NOT EXISTS idx_alert_state_key ON alert_state(state_key);
    """
    async with db_pool.acquire() as conn:
        await conn.execute(create_trades)
        await conn.execute(create_liquidations)
        await conn.execute(create_snapshots)
        await conn.execute(create_alert_state)
        await conn.execute(create_indexes)
        print("✅ Tabelas e índices criados/verificados")


# ============================================
# Estado de alertas persistente
# ============================================

async def save_alert_state(alert_state: dict):
    if not db_pool:
        return
    try:
        state_to_save = {
            "positions": alert_state.get("positions", {}),
            "orders": alert_state.get("orders", {}),
            "liquidation_warnings": list(alert_state.get("liquidation_warnings", set())),
            "last_alert_time": alert_state.get("last_alert_time", {}),
        }
        async with db_pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO alert_state (state_key, state_data, updated_at)
                VALUES ($1, $2, NOW())
                ON CONFLICT (state_key)
                DO UPDATE SET state_data = $2, updated_at = NOW()
                """,
                "current_alert_state",
                json.dumps(state_to_save),
            )
    except Exception as e:
        print(f"❌ Erro ao salvar estado de alertas: {e}")


async def load_alert_state() -> Optional[dict]:
    if not db_pool:
        return None
    try:
        async with db_pool.acquire() as conn:
            result = await conn.fetchval(
                "SELECT state_data FROM alert_state WHERE state_key = $1 LIMIT 1",
                "current_alert_state",
            )
            if result:
                data = json.loads(result) if isinstance(result, str) else result
                data["liquidation_warnings"] = set(data.get("liquidation_warnings", []))
                print(f"✅ Estado carregado: {len(data.get('positions', {}))} posições, {len(data.get('orders', {}))} orders")
                return data
            return None
    except Exception as e:
        print(f"❌ Erro ao carregar estado: {e}")
        return None


# ============================================
# Tracking de trades
# ============================================

async def save_open_trade(wallet: str, nickname: str, position: dict):
    if not db_pool:
        return
    try:
        token = position.get("coin", "UNKNOWN")
        side = "LONG" if float(position.get("szi", 0)) > 0 else "SHORT"
        size = abs(float(position.get("szi", 0)))
        entry_price = float(position.get("entryPx", 0))
        leverage_data = position.get("leverage", {})
        leverage = float(leverage_data.get("value", 1)) if isinstance(leverage_data, dict) else 1.0

        async with db_pool.acquire() as conn:
            existing = await conn.fetchval(
                "SELECT id FROM trades WHERE wallet = $1 AND token = $2 AND status = 'open' LIMIT 1",
                wallet, token,
            )
            if existing:
                return
            await conn.execute(
                """
                INSERT INTO trades (wallet, nickname, token, side, size, entry_price, leverage, open_timestamp, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                """,
                wallet, nickname, token, side, size, entry_price, leverage, datetime.now(), "open",
            )
            print(f"💾 Trade salvo: {nickname} | {token} {side}")
    except Exception as e:
        print(f"❌ Erro ao salvar trade: {e}")


async def close_trade(wallet: str, token: str, exit_price: float, pnl: float):
    if not db_pool:
        return
    try:
        async with db_pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE trades SET exit_price=$1, pnl=$2, close_timestamp=$3, status='closed'
                WHERE wallet=$4 AND token=$5 AND status='open'
                """,
                exit_price, pnl, datetime.now(), wallet, token,
            )
    except Exception as e:
        print(f"❌ Erro ao fechar trade: {e}")


async def save_liquidation(wallet: str, nickname: str, position: dict, loss: float):
    if not db_pool:
        return
    try:
        token = position.get("coin", "UNKNOWN")
        side = "LONG" if float(position.get("szi", 0)) > 0 else "SHORT"
        size = abs(float(position.get("szi", 0)))
        liq_px = float(position.get("liquidationPx", 0))

        async with db_pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO liquidations (wallet, nickname, token, side, size, liquidation_price, loss_amount, timestamp)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                """,
                wallet, nickname, token, side, size, liq_px, loss, datetime.now(),
            )
        await close_trade(wallet, token, liq_px, loss)
        print(f"💀 Liquidação salva: {nickname} | {token} | -${abs(loss):,.2f}")
    except Exception as e:
        print(f"❌ Erro ao salvar liquidação: {e}")


# ============================================
# Métricas individuais por wallet (Fase 5)
# ============================================

async def calculate_wallet_metrics(wallet: str, current_positions: list) -> dict:
    if not db_pool:
        return {
            "win_rate_global": None, "win_rate_long": None, "win_rate_short": None,
            "sharpe_ratio": None, "portfolio_heat": None,
            "liquidations_1d": None, "liquidations_1w": None, "liquidations_1m": None,
            "total_trades": 0,
        }
    try:
        async with db_pool.acquire() as conn:
            wr = await conn.fetchrow(
                "SELECT COUNT(*) FILTER (WHERE pnl > 0) as wins, COUNT(*) as total FROM trades WHERE wallet=$1 AND status='closed' AND pnl IS NOT NULL",
                wallet,
            )
            total = wr["total"] or 0
            win_rate_global = (wr["wins"] / total * 100) if total > 0 else None

            lr = await conn.fetchrow(
                "SELECT COUNT(*) FILTER (WHERE pnl > 0) as wins, COUNT(*) as total FROM trades WHERE wallet=$1 AND status='closed' AND side='LONG' AND pnl IS NOT NULL",
                wallet,
            )
            win_rate_long = (lr["wins"] / lr["total"] * 100) if lr["total"] > 0 else None

            sr = await conn.fetchrow(
                "SELECT COUNT(*) FILTER (WHERE pnl > 0) as wins, COUNT(*) as total FROM trades WHERE wallet=$1 AND status='closed' AND side='SHORT' AND pnl IS NOT NULL",
                wallet,
            )
            win_rate_short = (sr["wins"] / sr["total"] * 100) if sr["total"] > 0 else None

            sharpe_rows = await conn.fetch(
                "SELECT pnl FROM trades WHERE wallet=$1 AND status='closed' AND pnl IS NOT NULL AND close_timestamp >= NOW() - INTERVAL '30 days'",
                wallet,
            )
            sharpe_ratio = None
            if len(sharpe_rows) >= 30:
                pnls = [float(r["pnl"]) for r in sharpe_rows]
                avg = sum(pnls) / len(pnls)
                std = (sum((x - avg) ** 2 for x in pnls) / len(pnls)) ** 0.5
                sharpe_ratio = (avg / std) if std > 0 else 0.0

            portfolio_heat = None
            if current_positions:
                total_margin = sum(
                    abs(float(p.get("positionValue", 0))) / max(float(p.get("leverage", {}).get("value", 1) if isinstance(p.get("leverage"), dict) else 1), 1)
                    for p in current_positions
                )
                total_value = sum(abs(float(p.get("positionValue", 0))) for p in current_positions)
                portfolio_heat = (total_margin / total_value * 100) if total_value > 0 else 0.0

            liq_1d = await conn.fetchval("SELECT COUNT(*) FROM liquidations WHERE wallet=$1 AND timestamp >= NOW() - INTERVAL '1 day'", wallet) or 0
            liq_1w = await conn.fetchval("SELECT COUNT(*) FROM liquidations WHERE wallet=$1 AND timestamp >= NOW() - INTERVAL '7 days'", wallet) or 0
            liq_1m = await conn.fetchval("SELECT COUNT(*) FROM liquidations WHERE wallet=$1 AND timestamp >= NOW() - INTERVAL '30 days'", wallet) or 0

            total_pnl_row = await conn.fetchrow(
                "SELECT COALESCE(SUM(pnl), 0) as total_pnl FROM trades WHERE wallet=$1 AND status='closed'",
                wallet,
            )

            return {
                "win_rate_global": round(win_rate_global, 2) if win_rate_global is not None else None,
                "win_rate_long": round(win_rate_long, 2) if win_rate_long is not None else None,
                "win_rate_short": round(win_rate_short, 2) if win_rate_short is not None else None,
                "sharpe_ratio": round(sharpe_ratio, 2) if sharpe_ratio is not None else None,
                "portfolio_heat": round(portfolio_heat, 2) if portfolio_heat is not None else None,
                "liquidations_1d": liq_1d,
                "liquidations_1w": liq_1w,
                "liquidations_1m": liq_1m,
                "total_trades": total,
                "total_pnl": float(total_pnl_row["total_pnl"]) if total_pnl_row else 0.0,
            }
    except Exception as e:
        print(f"❌ Erro métricas wallet {wallet[:8]}: {e}")
        return {
            "win_rate_global": None, "win_rate_long": None, "win_rate_short": None,
            "sharpe_ratio": None, "portfolio_heat": None,
            "liquidations_1d": None, "liquidations_1w": None, "liquidations_1m": None,
            "total_trades": 0, "total_pnl": 0.0, "error": str(e),
        }


# ============================================
# Saúde e backup
# ============================================

async def get_database_health() -> dict:
    if not db_pool:
        return {"status": "disconnected"}
    try:
        async with db_pool.acquire() as conn:
            total_trades = await conn.fetchval("SELECT COUNT(*) FROM trades")
            open_trades = await conn.fetchval("SELECT COUNT(*) FROM trades WHERE status = 'open'")
            closed_trades = await conn.fetchval("SELECT COUNT(*) FROM trades WHERE status = 'closed'")
            total_liq = await conn.fetchval("SELECT COUNT(*) FROM liquidations")
            liq_24h = await conn.fetchval("SELECT COUNT(*) FROM liquidations WHERE timestamp >= NOW() - INTERVAL '1 day'")
            db_size = await conn.fetchval("SELECT pg_size_pretty(pg_database_size(current_database()))")
            alert_saved = await conn.fetchval("SELECT COUNT(*) FROM alert_state WHERE state_key = 'current_alert_state'")
            return {
                "status": "connected",
                "total_trades": total_trades,
                "open_trades": open_trades,
                "closed_trades": closed_trades,
                "total_liquidations": total_liq,
                "liquidations_24h": liq_24h,
                "database_size": db_size,
                "pool_size": db_pool.get_size(),
                "pool_free": db_pool.get_idle_size(),
                "alert_state_saved": alert_saved > 0,
            }
    except Exception as e:
        return {"status": "error", "error": str(e)}


async def export_backup_json() -> dict:
    if not db_pool:
        return {"error": "Database not connected"}
    try:
        async with db_pool.acquire() as conn:
            trades = await conn.fetch("SELECT * FROM trades ORDER BY open_timestamp DESC")
            liquidations = await conn.fetch("SELECT * FROM liquidations ORDER BY timestamp DESC")
            alert_raw = await conn.fetchval(
                "SELECT state_data FROM alert_state WHERE state_key = 'current_alert_state'"
            )
            return {
                "timestamp": datetime.now().isoformat(),
                "trades": [dict(r) for r in trades],
                "liquidations": [dict(r) for r in liquidations],
                "alert_state": json.loads(alert_raw) if alert_raw else None,
                "total_trades": len(trades),
                "total_liquidations": len(liquidations),
            }
    except Exception as e:
        return {"error": str(e)}
