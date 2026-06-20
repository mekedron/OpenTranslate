---
name: playwright-webkit-testing
description: Reproduce and confirm Safari-only extension UI bugs in seconds using Playwright + WebKit, with no Xcode build. Use when a layout/positioning bug appears only in Safari's engine (e.g. Base UI / floating-ui dropdown positioning in the narrow popup), or to confirm a Safari UI fix with a screenshot before the slower build:safari → sync-resources → Simulator round-trip. Harness lives in extension/test/webkit/; run from extension/.
---

# Playwright + WebKit UI testing

Some bugs only reproduce in **Safari's engine** — e.g. Base UI / floating-ui dropdown
positioning inside the narrow extension popup. Rebuilding the whole app and tapping
through the iOS Simulator for each attempt is slow, and `idb`'s Python client is broken
on Python 3.14, so we can't reliably script the Simulator's UI.

Instead, mount the **real** components in a standalone page and drive it with
**Playwright + WebKit** (the same engine as Safari). This reproduces Safari-only layout
bugs in seconds, with no Xcode build. The harness lives in `extension/test/webkit/`.

## Prerequisites (one-time)

```bash
cd extension
pnpm install                       # playwright is a devDependency
pnpm exec playwright install webkit
pnpm build:safari                  # drive.mjs reuses the compiled Tailwind CSS from here
```

## Run

```bash
# Defaults: iPhone-ish 320px wide, renders the "Translation Service" select,
# screenshots both the old bug and the fix, and reports viewport overflow.
VW=390 pnpm exec node test/webkit/drive.mjs
```

Output (per config): the menu's right edge and whether it overflows the viewport, plus a
screenshot at `test/webkit/shot-<name>.png` (gitignored). Example:

```
{"name":"bug","vw":390,"menuRight":400,"overflowsViewport":true, ...}
{"name":"fix","vw":390,"menuRight":366,"overflowsViewport":false, ...}
```

## How it works / how to adapt

- `test/webkit/example.tsx` — the page under test. It imports **real** components (via the
  `@` → `src` alias) so layout matches production exactly. Replace its body to exercise a
  different component or screen. URL query params (`?align=…&w=…`) let one run A/B several
  variants — see `drive.mjs`'s `CONFIGS`.
- `test/webkit/index.html` — mirrors the popup body (`!mr-0 overflow-x-clip`); the red
  `#root` outline marks the viewport edge so overflow is obvious in screenshots.
- `test/webkit/drive.mjs` — copies the compiled CSS, serves the page with Vite, opens it in
  WebKit at width `VW`, runs each `CONFIGS` entry (`name|queryString`), screenshots, and
  measures overflow. Set `VW` to match the target (e.g. `320` desktop popup, `390` iOS).

Use this loop to *confirm a Safari UI fix with a screenshot* before doing the slower
`build:safari` → `sync-resources.sh` → Simulator round-trip.
