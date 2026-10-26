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

## Existing backend

`API_AUTH_TOKEN` is required. Costly REST calls use `Authorization: Bearer …`; WebSockets accept that header or a short-lived `access_token`. For loopback development, `VITE_TRADESLENS_API_TOKEN` supplies the browser client. A Vite variable is visible to the browser, so use a low-privilege, short-lived local token and put any public deployment behind a real gateway/session layer. Configure explicit `BACKEND_CORS_ORIGINS`, `MAX_BIGQUERY_BYTES_BILLED`, `MAX_POOL_WATCHES`, and `MAX_WEBSOCKET_CONNECTIONS`.
