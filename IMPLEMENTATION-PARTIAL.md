# Pharaoh / Avalanche implementation checkpoint

Updated: 2026-10-26

## Implemented locally

- Removed the committed Dune credential from the current tree. Pool sync now requires `DUNE_API_KEY`; it was not tested or printed. Rotation remains the credential owner's responsibility, and upstream Git history retains the prior record.
- Added a dependency-free Node adapter at `dashboard/pharaoh-adapter/server.mjs`. It accepts only the canonical loopback avax-radar Gateway, validates schema/source/protocol, times out, and has no RPC fallback.
- Added overview, trending, search, pool, live swap, and 90-day history routes. Unknown TVL, fee, and revenue fields are `null`; coverage is explicitly partial and non-lifetime.
- Added a responsive Pharaoh/Avalanche frontend with SnowScan links, Legacy/CL/DLMM labels, receipt-success swaps, and visible pricing gaps.
- Replaced WebSocket pool SQL interpolation with a typed BigQuery array-of-struct parameter and added enum/address validation.
- Added fail-closed authentication settings, REST/WS bounds, BigQuery byte caps, sanitized errors/logging, loopback Compose ports, required secrets, disabled Hasura console/anonymous role, and lockfile install semantics.

## Rights and operational limits

The reviewed upstream commit has no repository-wide license grant. This local user-authorized modification preserves notices and does not claim a new license. Rights to redistribute outside GitHub's platform fork functionality remain unresolved. Nothing was pushed, disclosed, deployed, or sent upstream.

The current Gateway artifact is a 90-complete-day, partial-pool-universe view, not lifetime history. The adapter fails closed when the Gateway is unavailable or incompatible.

## Verification checkpoint

`node --check`, Python compilation, `git diff --check`, and direct requests through all seven adapter route families passed. The real Gateway returned its 90-day artifact and pool-filtered live swaps through the adapter. Reviewed fixed dependency versions were resolved through the guarded npm path with lifecycle scripts disabled; Socket reported no new risks, `npm audit` reported zero known vulnerabilities, and the Vite production build passed. Browser screenshot capture was not trustworthy on this host and remains explicitly unverified; see `BUILD-VERIFICATION.md`.
