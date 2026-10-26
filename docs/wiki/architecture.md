# Architecture and data flow

## What changed and why

Pharaoh spans Legacy constant-product, concentrated-liquidity (CL), and DLMM swap formats already normalized by the separately operated avax-radar Gateway. Forcing them through the upstream Uniswap V3 handler would discard mechanism-specific meaning, so this branch adds a small adapter alongside the existing BigQuery backend.

```text
avax-radar Gateway on 127.0.0.1:43140
  -> schema-validating Node adapter on 127.0.0.1:8002
     -> overview / search / pool / swaps / history / trending JSON
        -> React Pharaoh view
```

The adapter is the only Pharaoh chain-data consumer. It has no RPC client, public-RPC environment variable, Envio fork, warehouse ingestion process, or fallback provider. Gateway failure produces `503 pharaoh_data_unavailable` instead of changing provenance.

## Components

- `dashboard/pharaoh-adapter/server.mjs`: Gateway client, validators, cache, bounds, mappings, and SnowScan URLs using built-in Node APIs.
- `dashboard/frontend/src/PharaohDashboard.jsx`: bounded statistics, pool search/ranking, and near-tip swaps.
- `dashboard/backend/app/core/security.py`: chain enum, address validation, and bearer checks for existing costly warehouse routes.
- `dashboard/backend/app/core/database.py`: typed pool struct arrays and maximum bytes billed.

Historical complete days and the bounded live cursor remain separate. The UI never merges them into a lifetime claim.
