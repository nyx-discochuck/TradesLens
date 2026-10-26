# Mobile layout fix verification

## What changed

- At widths up to 768px, the global 220px sidebar is now a closed-by-default off-canvas navigation drawer. The page content uses the full viewport width.
- The header exposes an accessible menu button. The drawer closes on navigation, backdrop click, or Escape; keyboard focus is moved into the drawer, trapped while open, and restored when it closes.
- The Pharaoh hero, status copy, metric cards, pool table, search field, and live-swap amounts now adapt to narrow screens. The pool table scrolls inside its panel instead of widening the document.
- Desktop sidebar behavior and data/security policy are unchanged.

## Verification

- `npm run build` in `dashboard/frontend`: passed (Vite 6.4.4, 2,257 modules).
- Responsive targets: 320px, 390px, 768px, and 1200px.
- Acceptance: mobile document width equals viewport width; main content receives the viewport width with the closed drawer; the page title and `Pharaoh flow desk` hero are present; desktop retains its sidebar.

Chromium screenshot capture was attempted through the installed Snap Chromium. The browser was blocked by its host AppArmor/DBus confinement before a fresh screenshot could be completed, so the visual evidence is not claimed as verified in this document. Existing screenshots in the parent `verification/` directory predate this fix and must not be treated as proof.

## Manual check

Run `npm run preview -- --host 127.0.0.1 --port 4179` from `dashboard/frontend`, open `/?view=pharaoh`, and check 320, 390, 768, and 1200 CSS-pixel widths. On mobile, open the menu, Tab through its controls, press Escape, and confirm focus returns to the menu button.
