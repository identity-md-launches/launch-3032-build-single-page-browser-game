# Hamster Tap Tycoon design

## Overview

This is a casual, single-player hamster clicker. The primary visual is a cheerful CSS hamster holding a coin inside a large gold medallion. A warm charcoal interface gives that button the strongest emphasis. The balance and earnings sit above it; upgrades form one compact list alongside or below it. Header utilities stay small and the game has no introductory hero.

`index.html` is the source of truth for the page, all tokens, component styles and behavior. The interface has one dark theme, English copy and a system font stack. The footer and help dialog explain that progress is session-only.

## Colors

All tokens are in the `:root` block in `index.html`. Primitive hex values feed semantic tokens; interface components use the semantic roles.

| Semantic token | Value | Use |
| --- | --- | --- |
| `--color-page` | `#19181b` | Page background |
| `--color-surface` | `#222124` | Shop and help dialog |
| `--color-surface-hover` | `#2b292d` | Help and close hover states |
| `--color-control` | `#353237` | Disabled purchases, icon tiles, progress track |
| `--color-control-border` | `#4b464d` | Available purchase boundary |
| `--color-border` | `#353237` | Structural separators and panel outlines |
| `--color-text` | `#f7f2e9` | Primary text, available purchase fill |
| `--color-muted` | `#aaa4ad` | Descriptions, labels, disabled text |
| `--color-subtle` | `#d9d3db` | Help body, utility icons, purchase hover fill |
| `--color-accent` | `#f1c56c` | Gold progress fill, coins and brand artwork |
| `--color-accent-hover` | `#f5d797` | Floating reward fill and text selection |
| `--color-on-accent` | `#392b1d` | Floating reward text and selection text |
| `--color-focus` | `#f5d797` | 3 px keyboard outline, offset 5 px |
| `--color-success` | `#add6a7` | Ready-to-buy labels and purchase confirmation |

The medallion gradient (`#f7d78b`, `#efc064`, `#dba143`) and tan, cream and pink hamster colors are illustration-specific values in `.hamster-button` and `.hamster` descendants. They are not extra interface status colors. Icon strokes use `currentColor`.

Measured solid pairs include muted text on page **7.26:1**, on the shop **6.58:1**, and on disabled controls **5.19:1**. Primary text on the page is **15.85:1**. Gold floating-reward ink/fill is **9.79:1**. See `artifacts/validation.md` for measurement coverage and the help-dialog check. No full accessibility certification is implied.

## Typography

`--font-ui` is `ui-rounded, 'Trebuchet MS', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`. There are no font files or font network requests. The selected face depends on the operating system; computed family names do not establish which physical font rendered. Only weights 400 and 700 are requested.

| Token | Default size | Role |
| --- | --- | --- |
| `--text-caption` | 12 px / `.75rem` | Stat labels, levels, progress, footer, secondary hints |
| `--text-small` | 14 px / `.875rem` | Descriptions, help body, utility and purchase buttons |
| `--text-body` | 16 px / `1rem` | Stat numbers, upgrade titles, main instruction |
| `--text-heading` | 20 px / `1.25rem` | Phone product title, section and dialog headings |
| `--text-title` | 24 px / `1.5rem` | Desktop product title, floating rewards |
| `--text-balance` | 56 px / `3.5rem` | Coin balance |

Body line-height is 1.5; headings use 1.2, upgrade headings 1.4, the balance 1.12 and stat numbers 1.25. The product title tracks at `-.03em`, section headings at `-.02em`, and the balance at `-.04em`. Other text uses natural tracking. Headings balance wrapping. Important changing values use tabular numbers, remain selectable and wrap with `overflow-wrap: anywhere` where long values can occur. The hamster's gesture surface alone suppresses text selection.

## Layout

The spacing tokens are `--space-1` through `--space-7`: **4, 8, 12, 16, 24, 32 and 48 px** at the default root size. `.shell` caps content at **1120 px** and centers it. Reading order is header, balance, earnings, hamster, next upgrade, shop, footer.

- Below **36rem / 576 px**, the shell has 16 px side margins. The title wraps after “Hamster”, the help button shows its question icon, and the shop uses 16 px horizontal padding. The medallion is 252 px with a 284 px outer stage ring.
- From **36rem**, shell margins become 32 px, the title can run inline, the help label appears, and shop padding becomes 24 px.
- From **56rem / 896 px**, `.game-layout` uses a flexible play column plus a **380 px** shop with a 48 px gap. The title grows to 24 px, stage height to 352 px, and medallion to 294 px. The CSS hamster scales from `.88` to `1.06`. The keyboard hint appears for fine pointers. Coarse pointers keep it hidden.
- On narrower screens the shop follows the game in normal page flow. Nothing is fixed over the main action. Safe-area padding protects the page edges. The footer wraps naturally.

Rendered reflow was checked at 320, 390, 576, 895, 896, 1024 and 1440 px, and with 200% root text sizing at 390 px. The entire main button appears on the first 390 × 844 screen. No horizontal overflow was measured at those widths. Native browser zoom, translated strings and RTL layout were not checked.

## Elevation & Depth

The shop and dialog use tonal fills with a single structural border, without shadows. Upgrade rows are separated by lines inside one panel, rather than nested cards. The medallion uses inset gold rings, a 10 px darker lower edge and a soft external shadow. Hamster pieces use inset shading. These illustration shadows communicate the tactile coin, not extra interface surfaces. The dialog's backdrop is `#0b090bc9` and its own surface is opaque.

Layering is local: the stage isolates its decorative ring and dot field behind the button; floating rewards use `z-index: 4` and ignore pointer events. The native dialog uses the browser top layer.

## Shapes

`--radius-control` is **12 px** and `--radius-panel` is **24 px**. Upgrade icon tiles use **14 px** radii, code-like keyboard labels use **4 px**, and progress tracks use **8 px**. The hamster, coin and stage ring use elliptical and circular shapes. Clipping is restricted to decorative progress and visually hidden utilities; useful amounts and labels are not ellipsized.

## Components

| Pattern in `index.html` | Use and states |
| --- | --- |
| `.site-header`, `.brand`, `.help-button` | Product at leading edge; 44 px help target at trailing edge. Hover fill appears only on hover-capable devices. |
| `.balance`, `.earning-stats`, `.stat` | Balance plus tap rate, automatic rate and multiplier. Real `<output>` and `<dl>` elements. Automatic balance updates are not repeatedly announced. |
| `.stage`, `.hamster-button`, `.hamster` | Native button containing decorative CSS artwork. Accessible name includes current tap earnings. Pointer/touch, Space and Enter share one click handler. Standard press scales to `.96` for 100 ms; reduced motion removes the scale. |
| `.floating-coin` | Current reward, initially `+1`. Standard feedback rises and fades over 700 ms; reduced motion fades in place over 500 ms. Nodes are removed after 750 ms and bounded to 16. No idle animation. |
| `.next-upgrade`, `.goal-track` | The cheapest next purchase, full price, current balance and a clamped 0–100% progressbar with a descriptive accessible value. Ready state adds text and green, so color is not the only cue. |
| `.upgrade` and `.buy-button` | Three identical upgrade rows. Name, level, base effect, shortfall and price stay visible. Unaffordable buttons are natively disabled; affordable buttons receive a cream fill. Successful purchases update the level, next price and status text. If buying disables a focused button, focus returns to the hamster. |
| `.shop-message`, `#tap-status` | Polite purchase announcements and debounced tap summaries. A stable live region exists before updating it. Automatic earnings do not flood it. |
| `#help-dialog`, `.close-button` | Native modal help with a labelled heading, 44 px close button, Escape handling, browser focus containment and explicit return to its trigger. No custom modal framework. |
| `.site-footer`, `.session-note` | Required footer sentence and a visible reminder that refresh resets progress. |

Every button uses a 3 px `:focus-visible` outline. In forced-colors mode, focus uses system `Highlight` and the button boundary uses `ButtonText`. Only the decorative `.hamster` opts out of forced color replacement, preserving the illustration; the surrounding controls and text follow the user's colors. There is no asynchronous loading state, account state, transaction state or server error flow.

## Do's and Don'ts

- Begin with `.shell` and existing spacing tokens. Keep the hamster and balance before the shop on phones.
- Reuse `.buy-button` and `.upgrade` for a purchase row, including real price, disabled shortfall and announcement behavior. Keep the gold medallion as the dominant action.
- Use native controls, existing token roles and the six-size scale. Keep counters tabular and accessible amounts complete.
- Keep artwork local and decorative, motion finite, and reduced-motion feedback static in position.
- Preserve the session-only model and direct-file/offline behavior. Avoid network fonts, persistent storage and account infrastructure.

For a related screen, reuse the header, `.shell`, typography and footer; put its real primary control before explanatory copy and use the existing panel treatment for secondary content. Add a new token only for a role the existing system cannot express. This game intentionally remains one page.

Design review applied the pinned Better Interface guide. Documentation structure is adapted from the pinned Impeccable method; source attribution and licenses are in `artifacts/THIRD_PARTY_NOTICES.md` and `artifacts/design-guidance-LICENSE.txt`.
