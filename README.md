# Hamster Tap Tycoon

A small browser game about a hamster with big plans. Tap for coins, buy upgrades, and grow your earnings. All gameplay, CSS artwork and JavaScript live in **one HTML page**. There are no runtime dependencies or network calls.

## Play or preview

Open `dist/index.html` directly, or serve the checked-in `dist/` folder with any static host. All asset paths are relative, including the favicon and share image. The game also works under a hosting subpath.

With Node.js 22 or newer:

```sh
npm run preview
```

Open the printed `http://127.0.0.1:4173/preview/` address. Stop the preview with Ctrl+C. To use a different port, run `npm run preview -- --port=8080`.

## Install, rebuild and validate

The build and preview use only Node built-ins; they work without installing packages. To install the development tools at the versions in `package-lock.json`:

```sh
npm ci
npx playwright-core install chromium
npm run build
npm run typecheck
npm test
```

`npm run build` copies the complete page and its local sharing assets into `dist/`. It deliberately keeps the export alongside the source; serve `dist/` as-is. `npm run typecheck` runs TypeScript in strict `checkJs`/`noEmit` mode on the actual inline gameplay script. There is no TypeScript or framework code in the game. `npm test` starts a temporary preview, validates the production export in a real browser, writes evidence to `test/scratch/validation/`, and closes the browser and preview.

Browser installation may require the operating-system libraries listed by Playwright. To check another installed engine, use `TEST_BROWSER=webkit npm test`. The optional `PLAYWRIGHT_MODULE`, `BROWSER_EXECUTABLE`, `TYPESCRIPT_MODULE`, and `AXE_SOURCE` overrides let a restricted worker use tools outside `node_modules`; ordinary installations need none of them. These settings affect development checks only.

The committed PNG is ready to use. After editing its original SVG, regenerate it with an installed Chromium browser, then rebuild:

```sh
node scripts/share-card.mjs
npm run build
```

## Gameplay

- Each tap starts at 1 coin. Space and Enter also work while the hamster is focused.
- Stronger tap starts at 20 coins and adds 1 base coin per tap. Its next price is rounded up after multiplying by 1.60.
- Auto-tapper starts at 60 coins and adds 1 base coin per second. Its next price is rounded up after multiplying by 1.65.
- Coin multiplier starts at 150 coins and adds 1× to **both** tap and automatic earnings. Its next price is rounded up after multiplying by 2.20. Two purchases mean 3× total earnings.
- Upgrades stack. The next-upgrade meter tracks the cheapest next purchase.

Balances, prices and earnings use integer `BigInt` arithmetic. Automatic earnings are settled from elapsed time in millisecond units, including before purchases, so a new multiplier does not apply to earlier earnings. The display updates when a whole coin is earned. Timers can be throttled in background tabs; earnings catch up when the page runs again. A suspended or closed page cannot keep running.

Progress exists only in the open page's memory. Refreshing or closing it loses everything. There are no cookies, storage writes, accounts, wallets, real-money features or external APIs. After the page loads, disconnecting from the network does not interrupt gameplay. An offline reload is not guaranteed: there is intentionally no service worker or persistent cache. A downloaded HTML file can be opened offline.

## Files

| Path | Purpose |
| --- | --- |
| `index.html` | Complete source page, inline styles, CSS hamster, inline game logic |
| `assets/` | Local SVG favicon and 1200 × 630 PNG share card |
| `artwork/share-card.svg` | Editable original for the share card |
| `scripts/` | Build, preview, JavaScript typecheck, artwork and browser checks |
| `dist/` | Finished static export, included in the delivery |
| `DESIGN.md` | Implemented tokens, components and responsive rules |
| `PATH_BUDGET.json` | Explicit per-file byte budgets, including the artifact allowlist |
| `artifacts/validation.md` | Actual verification, design findings, coverage and limitations |
| `artifacts/screenshots/` | Selected screenshots of the final export |

## Recorded results

The final production build and strict JavaScript typecheck passed. **21 interaction/export checks passed in Chromium**, including real touch, keyboard controls, exact purchase boundaries, repeat upgrades, automatic earnings, multipliers, offline play, session reset, direct-file play, sharing assets, reduced motion and responsive reflow. The pinned **taste@1 probe passed 16/16** checks. The main button was visible at 390 × 844; reflow was checked from 320 to 1440 px.

An axe-core audit found no A/AA violations in the initial, upgraded and help states. Its dialog contrast checks required a separate computed-color check, documented in [validation](artifacts/validation.md). A forced-colors illustration defect was fixed and rechecked. WebKit validation could not run because its system libraries were unavailable; the supplied browser connector also could not launch, so working local Playwright automation was used. Physical devices, screen-reader sessions and browser-native zoom were not tested. The 200% check enlarges text through the root font size.

These are worker-side observations, not independent certification. See [the full validation record](artifacts/validation.md) and [design documentation](DESIGN.md).
