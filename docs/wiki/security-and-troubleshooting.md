# Security and troubleshooting

## Security changes

- No embedded Dune credential remains in the current tree. `DUNE_API_KEY` is required and sent in a header.
- Pool watches use the Google client library's typed `STRUCT` array representation, a chain enum, and strict address validation.
- Costly BigQuery routes require header authentication and enforce row, offset, process connection, pool-watch, send-timeout, and bytes-billed ceilings. Failed sockets are removed and idle pollers stop after the last disconnect.
- No backend token is compiled into the browser or placed in a WebSocket URL. Legacy browser analytics stay disabled until an HttpOnly same-origin session exists; the private bearer API remains available to trusted non-browser clients.
- Query text, parameters, and raw exception strings are not emitted on remediated paths.
- Compose admin/data ports are loopback-only; secrets have no fallback; Hasura console/anonymous role are disabled.

The exposed credential may remain in upstream/fork history. Its owner must rotate it; this branch cannot claim revocation.

## Troubleshooting

**`pharaoh_data_unavailable`** — verify the Gateway is on `127.0.0.1:43140` and both routes return documented schema versions. No RPC fallback exists.

**CORS error** — add the exact local frontend origin to `ALLOWED_ORIGINS`; do not use `*` with credentials.

**401** — supply configured `API_AUTH_TOKEN`; never commit it.

**Em dash metric** — source data is unavailable. Do not replace unknown TVL, fee, revenue, or pricing values with zero.

**Missing SnowScan link** — links require a strictly valid transaction hash or address.

**503 from Pharaoh adapter** — the Gateway is unreachable, incompatible, or outside the configured generation-age/head-lag bounds. The adapter does not serve an expired cache. A prior day's `completeThrough` is normal for a complete-day artifact and is not itself the freshness clock.

## Rights note

The upstream commit has no repository-wide license grant. Existing notices are preserved and no new license is assigned to upstream code. Redistribution rights remain unresolved.
