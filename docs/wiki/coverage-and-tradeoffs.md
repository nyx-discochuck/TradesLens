# Coverage, decisions, and limitations

The checked Gateway contract exposes 90 complete daily rows, 383 surfaced pools from a registry of 860, and live Legacy/CL/DLMM swaps. It identifies the artifact as `fresh-complete-days-partial-universe` and says `lifetimeFirstSeen: false`.

Historical and live freshness are intentionally separate. The history date describes completed daily coverage; `generatedAt` describes artifact age. Live status is called “near tip” only when the Gateway publishes valid finite `headBlock` and `safeTipBlock` values, generation age is within policy, and their lag is within policy. Missing fields produce unavailable/503, never a guessed near-tip state.

The UI can show dated priced volume, event/transaction/user counts, active pools, rankings, pricing coverage, raw swap amounts, and explicitly unpriced swaps. “New users” means first seen inside the window, not lifetime-new.

## Deliberately unavailable

- TVL, fees, and LP revenue are `null`; swap logs do not establish them.
- Missing USD values remain `null`, never zero.
- No lifetime total or factory-complete history is claimed.
- Position-ledger and xPHAR exit routes are not folded into swap volume.

The sidecar avoids new Python dependencies and preserves a clear provenance boundary. A future warehouse path would require immutable snapshots, separate historical/live checkpoints, overlap reconciliation, and explicit unassigned/unpriced partitions.
