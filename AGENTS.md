# AGENTS.md

Guidance for AI agents and contributors working in this repo.

## Layout

- `extension/` — the WXT web extension (React 19, Tailwind 4, Jotai, Base UI). **Source of truth.**
- `apple/` — generated Xcode project that wraps the built extension for Safari (macOS + iOS).
- `docs/SAFARI.md` — the build & test runbook (build the web extension, sync resources, run in Xcode/Simulator).

## Build & run

See `docs/SAFARI.md`. The short version, from `extension/`:

```bash
pnpm build:safari          # → extension/.output/safari-mv3
scripts/sync-resources.sh  # copy the build into the Xcode project (no converter re-run)
scripts/run-ios-sim.sh     # build + install + launch on the iOS Simulator
```

## Testing

### Unit tests

```bash
pnpm test          # vitest run
pnpm type-check    # tsc --noEmit
pnpm lint          # eslint
```

### Testing Safari-only UI in WebKit

Some bugs reproduce only in **Safari's engine** (e.g. Base UI / floating-ui dropdown
positioning inside the narrow extension popup). To reproduce them — or confirm a fix with a
screenshot — in seconds using **Playwright + WebKit**, with no Xcode build, follow the
**playwright-webkit-testing** skill: [`.claude/skills/playwright-webkit-testing/SKILL.md`](.claude/skills/playwright-webkit-testing/SKILL.md).
The harness lives in `extension/test/webkit/`.
