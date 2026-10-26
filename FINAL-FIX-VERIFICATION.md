# Final fix verification

Date: 2026-10-26

This record covers the five findings in `research/freemandaily-security-20261026/fork-review/REVIEW.md` against branch `pharaoh-avalanche` after `dda9a25`.

## Implemented

- The alpha WebSocket reserves bounded capacity before accept, serializes connection/task state with an async lock, applies three-second concurrent send deadlines, drops failed clients, and cancels/resets its poll task after the last disconnect. The pool manager uses the same lifecycle safeguards. BigQuery polling remains one query per manager cycle, not one query per client.
- The Vite browser no longer reads `VITE_TRADESLENS_API_TOKEN`, sets an authorization default, puts a token in a WebSocket URL, or logs that URL. Legacy warehouse browser requests are disabled until a same-origin HttpOnly session gateway exists. The existing bearer-protected REST/WebSocket backend remains available to trusted non-browser clients, using the `Authorization` header only.
- BigQuery array parameters now use client-library array type `STRUCT` with named `chain_name` and `pool` scalar fields.
- `HTTPException` is imported by the search endpoint, preserving its fixed 503 path.
- The Pharaoh adapter validates generated timestamps and finite block fields, separates complete-day history from generation freshness, calculates published head/safe-tip lag, fails closed on stale/unknown live state, and returns 503 health when either source fails. The UI displays history-through date, artifact generation age, live generation age, head, and safety lag; it never labels unknown live data near-tip.
- Project-local generated frontend, Python cache, and build directories are ignored. Existing generated files were not deleted.

## Checks actually run

- `python3 -m compileall -q dashboard/backend/app airflow/dags` — passed.
- `node --check dashboard/pharaoh-adapter/server.mjs` — passed.
- `git diff --check` — passed before this record and again in the final gate.
- Guarded `npm run build` — passed with Vite 6.4.4 and 2,257 modules; only the existing non-blocking 719.20 kB chunk warning remained.
- Guarded `npm audit --json` — zero reported vulnerabilities across 244 dependencies.
- Source and built-output scans found no `VITE_TRADESLENS_API_TOKEN`, tokenized alpha URL, or credential-URL console message.
- Real canonical Gateway normal paths, through adapter port 18882 with a documented 24-hour historical threshold for the run: health, overview, trending, search, live swaps, and history all returned 200. History returned 90 rows and a non-stale artifact result; live returned rows with `near_tip: true`, a finite three-block head lag, and generation age.
- The current real historical artifact is older than the default 15-minute policy. A second adapter on port 18883 with default settings returned the expected sanitized 503 from `/health`; no expired cache was served.
- Snap Chromium loaded the built page from unique port 18884. A DOM check confirmed the page's own `pharaoh-shell`, 90-day coverage, history generation, and live safety-lag text before capture. Desktop 1440×1100 and mobile 390×844 screenshots were captured in `/home/openclaw/snap/chromium/common/tradeslens-pharaoh-final/` and visually inspected.
- `.gitignore` matching was checked for only the project frontend `node_modules`/`dist` and Python `__pycache__`/bytecode paths. No project data was deleted.

## Runtime uncertainty

The host does not have the backend's Python runtime packages installed, including `google-cloud-bigquery`, FastAPI, and SQLAlchemy. No packages were installed. Therefore live `ArrayQueryParameter.to_api_repr()`, forced search-DB failure, WebSocket handshake/send/drop behavior, and an actual BigQuery query were not runtime-executed here. The corrected BigQuery shape was checked against Google's official `python-bigquery` source, whose `ArrayQueryParameter` contract accepts the literal `STRUCT`/`RECORD` marker and whose struct representation derives field names from named subparameters. The repository currently specifies `google-cloud-bigquery>=3.29.0` rather than a pinned version, so this remains a deployment-time verification requirement.

No new unit-test files, packages, deployments, remote writes, production data, credentials, or Gateway changes were made.
