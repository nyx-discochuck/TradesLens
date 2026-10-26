import hmac
import re
from enum import Enum

from fastapi import Header, HTTPException, WebSocket
from app.core.config import settings

class ChainName(str, Enum):
    ethereum = "Ethereum"
    arbitrum = "Arbitrum"
    optimism = "Optimism"
    avalanche = "Avalanche"

ADDRESS_RE = re.compile(r"^0x[0-9a-fA-F]{40}$")

def canonical_address(value: str) -> str:
    if not ADDRESS_RE.fullmatch(value):
        raise HTTPException(status_code=422, detail="invalid EVM address")
    return value.lower()

def require_api_token(authorization: str | None = Header(default=None)) -> None:
    expected = f"Bearer {settings.API_AUTH_TOKEN}"
    if not authorization or not hmac.compare_digest(authorization, expected):
        raise HTTPException(status_code=401, detail="authentication required")

async def require_websocket_token(websocket: WebSocket) -> bool:
    supplied = websocket.headers.get("authorization") or websocket.query_params.get("access_token")
    if supplied and not supplied.startswith("Bearer "):
        supplied = f"Bearer {supplied}"
    if supplied and hmac.compare_digest(supplied, f"Bearer {settings.API_AUTH_TOKEN}"):
        return True
    await websocket.close(code=1008, reason="authentication required")
    return False
