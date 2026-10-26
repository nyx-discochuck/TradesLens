import logging
import asyncio
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import text
from app.core.database import get_db, BigQuerySession
from app.core.config import settings
from app.core.security import ChainName, require_api_token, require_websocket_token

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.broadcast_task: Optional[asyncio.Task] = None
        self.last_data = None
        self.last_hash = None
        self._lock = asyncio.Lock()
        self._send_timeout_seconds = 3

    async def connect(self, websocket: WebSocket):
        async with self._lock:
            if len(self.active_connections) >= settings.MAX_WEBSOCKET_CONNECTIONS:
                await websocket.close(code=1013, reason="connection capacity reached")
                return False
            self.active_connections.append(websocket)
        try:
            await websocket.accept()
        except Exception:
            async with self._lock:
                if websocket in self.active_connections:
                    self.active_connections.remove(websocket)
            raise
        # Send initial data immediately to the new user if we have it
        if self.last_data:
            try:
                await asyncio.wait_for(websocket.send_json(self.last_data), self._send_timeout_seconds)
            except Exception:
                await self.disconnect(websocket)
                return False
        
        # Start the background broadcast task if not already running
        async with self._lock:
            if not self.broadcast_task or self.broadcast_task.done():
                self.broadcast_task = asyncio.create_task(self.run_broadcast_loop())
        return True

    async def disconnect(self, websocket: WebSocket):
        task = None
        async with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
            if not self.active_connections and self.broadcast_task:
                task = self.broadcast_task
                self.broadcast_task = None
        if task and task is not asyncio.current_task() and not task.done():
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)

    async def broadcast(self, message: list):
        async with self._lock:
            connections = list(self.active_connections)
        if not connections:
            return

        async def bounded_send(connection):
            try:
                await asyncio.wait_for(connection.send_json(message), self._send_timeout_seconds)
                return connection, True
            except Exception:
                return connection, False

        results = await asyncio.gather(*(bounded_send(connection) for connection in connections))
        failed = {connection for connection, ok in results if not ok}
        if failed:
            async with self._lock:
                self.active_connections = [item for item in self.active_connections if item not in failed]

    async def run_broadcast_loop(self):
        logger.info("STARTING GLOBAL BROADCAST LOOP")
        try:
            while self.active_connections:

                db = BigQuerySession()
                try:
                    current_data = fetch_alpha_metrics_data(db, limit=100)
                    current_hash = hash(str(current_data))
                    
                    if current_hash != self.last_hash:
                        logger.info("GLOBAL BROADCAST: Change detected, pushing to all clients")
                        self.last_data = current_data
                        self.last_hash = current_hash
                        await self.broadcast(current_data)
                except Exception as e:
                    logger.error(f"BROADCAST LOOP ERROR: {str(e)}")
                finally:
                    db.close()
                
                await asyncio.sleep(5)
        except asyncio.CancelledError:
            logger.info("BROADCAST LOOP STOPPED")
        finally:
            async with self._lock:
                if self.broadcast_task is asyncio.current_task():
                    self.broadcast_task = None

manager = ConnectionManager()

def fetch_alpha_metrics_data(db, chain_name: Optional[str] = None, limit: int = 50, offset: int = 0):
    where_clauses = ["pct_change_6h IS NOT NULL", "pct_change_24h IS NOT NULL"]
    params = {"limit": limit, "offset": offset}

    if chain_name:
        where_clauses.append("chain_name = :chain_name")
        params["chain_name"] = chain_name

    where_stmt = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    query = text(f"""
        SELECT 
            pool,
            token_pool,
            base_token_address,
            base_token_symbol,
            chain_name,
            price,
            volume as total_volume,
            pool_revenue,
            volume_24h,
            volume_3d,
            volume_7d,
            total_buy_5m,
            total_sell_5m,
            total_buy_10m,
            total_sell_10m,
            total_buy_24h,
            total_sell_24h,
            avg_swap_volume,
            price_5m_ago,
            price_1h_ago,
            price_6h_ago,
            price_24h_ago,
            change_5m,
            change_1h,
            change_6h,
            change_24h,
            pct_change_5m,
            pct_change_1h,
            pct_change_6h,
            pct_change_24h
        FROM fct_dex_swaps
        {where_stmt}
        ORDER BY pct_change_24h DESC
        LIMIT :limit OFFSET :offset
    """)

    results = db.execute(query, params).all()
    
    return [
        {
            "pool_address": r.pool,
            "pair": r.token_pool,
            "base_token": {
                "address": r.base_token_address,
                "symbol": r.base_token_symbol
            },
            "chain": r.chain_name,
            "current_price": float(r.price) if r.price else 0.0,
            "metrics": {
                "volume_24h": float(r.volume_24h) if r.volume_24h else 0.0,
                "volume_3d": float(r.volume_3d) if r.volume_3d else 0.0,
                "volume_7d": float(r.volume_7d) if r.volume_7d else 0.0,
                "total_volume": float(r.total_volume) if r.total_volume else 0.0,
                "revenue": float(r.pool_revenue) if r.pool_revenue else 0.0,
                "avg_swap_size": float(r.avg_swap_volume) if r.avg_swap_volume else 0.0
            },
            "price_change": {
                "pct_5m": float(r.pct_change_5m) if r.pct_change_5m else 0.0,
                "pct_1h": float(r.pct_change_1h) if r.pct_change_1h else 0.0,
                "pct_6h": float(r.pct_change_6h) if r.pct_change_6h else 0.0,
                "pct_24h": float(r.pct_change_24h) if r.pct_change_24h else 0.0
            },
            "pressure": {
                "buy_5m": float(r.total_buy_5m) if r.total_buy_5m else 0.0,
                "sell_5m": float(r.total_sell_5m) if r.total_sell_5m else 0.0,
                "buy_10m": float(r.total_buy_10m) if r.total_buy_10m else 0.0,
                "sell_10m": float(r.total_sell_10m) if r.total_sell_10m else 0.0,
                "buy_24h": float(r.total_buy_24h) if r.total_buy_24h else 0.0,
                "sell_24h": float(r.total_sell_24h) if r.total_sell_24h else 0.0,
            }
        }
        for r in results
    ]

router = APIRouter()

@router.get("/metrics")
def get_alpha_metrics(
    chain_name: Optional[ChainName] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0, le=10_000),
    _: None = Depends(require_api_token),
    db = Depends(get_db)
):
    """
    Get pool-level alpha metrics including 24h/3d/7d volumes and buy/sell pressure.
    """
    
    try:
        return fetch_alpha_metrics_data(db, chain_name.value if chain_name else None, limit, offset)
    except Exception:
        logger.exception("Alpha metrics query failed")
        raise HTTPException(status_code=503, detail="analytics temporarily unavailable")

@router.websocket("/ws")
async def alpha_metrics_ws(websocket: WebSocket):
    """
    WebSocket endpoint for real-time alpha metrics updates.
    Uses the Singleton Broadcast pattern for efficiency.
    """
    if not await require_websocket_token(websocket):
        return
    if not await manager.connect(websocket):
        return
    logger.info("WEBSOCKET CONNECTED: Client joined Intelligence Tunnel")
    
    try:
        # Keep the connection alive until the client disconnects
        while True:
            # We don't expect messages from client, but we must wait to detect disconnect
            await websocket.receive_text()
            
    except WebSocketDisconnect:
        logger.info("WEBSOCKET DISCONNECTED: Client left tunnel")
    except Exception as e:
        # Client disconnects often look like generic errors here
        pass
    finally:
        await manager.disconnect(websocket)
