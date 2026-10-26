# Build and verification record

Updated: 2026-10-26

## Dependency remediation

The frontend lockfile was regenerated through the guarded `npm` command on `PATH`; no alternate package manager or native npm entrypoint was used. The direct vulnerable packages are pinned to Axios 1.20.0, Vite 6.4.4, and PostCSS 8.5.31. Overrides select fixed, more-than-seven-day-old releases of Babel core 7.29.7, baseline-browser-mapping 2.11.29, Browserslist 4.29.3, and postcss-selector-parser 6.1.5. The resolved `follow-redirects` is 1.16.1.

Socket reported no new risks during the successful guarded install. `npm audit --json` subsequently reported zero known vulnerabilities. Install lifecycle scripts were disabled. The resolved tree contains one lifecycle script, esbuild's standard `node install.js` postinstall; it did not run, and the platform package already selected by the lockfile was sufficient for the verified build.

## Checks run

- `npm run build`: passed with Vite 6.4.4 (2,257 modules transformed). Vite reports a non-blocking 719.95 kB JavaScript chunk-size warning.
- `node --check dashboard/pharaoh-adapter/server.mjs`: passed.
- `python3 -m compileall -q dashboard/backend/app airflow/dags`: passed.
- `git diff --check`: passed.
- Real canonical Gateway requests through all adapter families passed: health, overview, trending, search, pool detail, pool-filtered live swaps, and 90-day history.
- The live artifact reported 90 complete days. The test selected an actual returned pool, then received three pool-filtered receipt-success swap rows.
- The frontend now supports the local deep link `/?view=pharaoh`, and a missing navigation icon no longer crashes that view.

## Browser verification status

Headless Chromium reached the built page, but this host's snap-confined browser did not complete a trustworthy screenshot capture of the TradesLens target. Earlier files were found to show an unrelated service already occupying port 4173 and were removed. Therefore no screenshot or visual claim is included. Desktop/mobile layout, search typing, click-through pool selection, and link opening remain browser-verification gaps even though the production build and backing routes pass.

## Operational limits

The adapter must reach the owned loopback Gateway directly. On hosts with Node environment-proxy support enabled, remove proxy variables for this local process or configure the documented loopback exclusion. The data remains a partial pool universe and 90-complete-day artifact, not lifetime coverage. Unknown TVL, fee, and revenue metrics stay `null`; there is no direct-RPC fallback.
