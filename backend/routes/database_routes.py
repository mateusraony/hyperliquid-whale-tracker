"""
Rotas de banco de dados: health, backup e histórico de trades.
"""

from fastapi import APIRouter, HTTPException

import db.database as db

router = APIRouter()


@router.get("/api/database/health")
async def database_health():
    return await db.get_database_health()


@router.get("/api/database/backup")
async def database_backup():
    return await db.export_backup_json()


@router.get("/api/database/trades")
async def get_trades(limit: int = 100, wallet: str = None):
    if not db.db_pool:
        raise HTTPException(status_code=503, detail="Banco de dados não conectado.")
    try:
        async with db.db_pool.acquire() as conn:
            if wallet:
                rows = await conn.fetch(
                    "SELECT * FROM trades WHERE wallet=$1 ORDER BY open_timestamp DESC LIMIT $2",
                    wallet, limit,
                )
            else:
                rows = await conn.fetch(
                    "SELECT * FROM trades ORDER BY open_timestamp DESC LIMIT $1",
                    limit,
                )
            return {
                "trades": [dict(r) for r in rows],
                "count": len(rows),
                "filtered_by_wallet": wallet,
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
