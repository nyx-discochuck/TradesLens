# Security and troubleshooting

## Security changes

- No embedded Dune credential remains in the current tree. `DUNE_API_KEY` is required and sent in a header.
- Pool watches use typed `STRUCT<chain_name STRING, pool STRING>` arrays, a chain enum, and strict address validation.
- Costly BigQuery routes require authentication and enforce row, offset, connection, pool-watch, and bytes-billed ceilings.
- Query text, parameters, and raw exception strings are not emitted on remediated paths.
- Compose admin/data ports are loopback-only; secrets have no fallback; Hasura console/anonymous role are disabled.

The exposed credential may remain in upstream/fork history. Its owner must rotate it; this branch cannot claim revocation.

## Troubleshooting

**`pharaoh_data_unavailable`** — verify the Gateway is on `127.0.0.1:43140` and both routes return documented schema versions. No RPC fallback exists.

**CORS error** — add the exact local frontend origin to `ALLOWED_ORIGINS`; do not use `*` with credentials.

**401** — supply configured `API_AUTH_TOKEN`; never commit it.

**Em dash metric** — source data is unavailable. Do not replace unknown TVL, fee, revenue, or pricing values with zero.

**Missing SnowScan link** — links require a strictly valid transaction hash or address.

## Rights note

The upstream commit has no repository-wide license grant. Existing notices are preserved and no new license is assigned to upstream code. Redistribution rights remain unresolved.
