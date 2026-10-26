# Setup, configuration, and use

## Requirements

- Node.js 20 or newer.
- Canonical avax-radar Gateway on `127.0.0.1:43140`.
- Frontend dependencies installed from `package-lock.json` using guarded `npm ci --ignore-scripts`.

## Run

```sh
cd dashboard/pharaoh-adapter
node --check server.mjs
node server.mjs
```

Defaults bind to `127.0.0.1:8002`. `AVAX_RADAR_GATEWAY_URL` accepts only `http://127.0.0.1:43140` or localhost. Set `VITE_PHARAOH_API_URL=http://127.0.0.1:8002` and choose **Pharaoh · Avalanche** in the dashboard. For a direct local entry, open `http://127.0.0.1:5173/?view=pharaoh`.

If the host exports an HTTP proxy, include `127.0.0.1,localhost` in both `NO_PROXY` and `no_proxy`. The supplied Compose service does this so the canonical loopback request is not tunneled.

```sh
curl http://127.0.0.1:8002/api/v1/pharaoh/overview
curl 'http://127.0.0.1:8002/api/v1/pharaoh/search?q=WAVAX'
curl 'http://127.0.0.1:8002/api/v1/pharaoh/swaps?limit=25'
```

Search is truncated to 80 characters; limits are clamped; pool filters must be EVM addresses.

The adapter rejects stale data instead of serving an expired cache. Historical artifact freshness is based on `generatedAt`, not the most recent complete-day boundary. Defaults are 15 minutes for `PHARAOH_HISTORICAL_MAX_AGE_SECONDS`, 2 minutes for `PHARAOH_LIVE_MAX_AGE_SECONDS`, and 12 blocks for `PHARAOH_LIVE_MAX_HEAD_LAG_BLOCKS`; each setting is bounded by the adapter. `/health` returns 200 only when both historical and live sources validate, otherwise 503. The UI displays history-through date separately from generation age and live head lag.

## Existing backend

`API_AUTH_TOKEN` remains required for trusted, non-browser clients of the legacy BigQuery backend. REST and WebSocket clients send it in the `Authorization` bearer header; URL credentials are rejected. The browser does **not** receive or compile this backend token, and its legacy warehouse views are disabled until a same-origin gateway provides a real HttpOnly session. Do not invent a client-visible substitute. Keep this private backend loopback-only in the interim. Configure explicit `BACKEND_CORS_ORIGINS`, `MAX_BIGQUERY_BYTES_BILLED`, `MAX_POOL_WATCHES`, and `MAX_WEBSOCKET_CONNECTIONS`.
