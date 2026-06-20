# OpenTranslate — Safari build & test runbook

## Provenance
Ported from **read-frog** at commit `46a01782` ("feat(providers): add Azure provider"),
vendored on 2026-06-19. Upstream is a WXT 0.20.26 extension (React 19, Tailwind 4, Jotai,
Vercel AI SDK v6). Only the build-relevant subset was copied into `extension/`; see the
initial vendor commit.

## Toolchain (verified)
Xcode 26.5, `safari-web-extension-converter` present, iOS 26.5 + macOS 26.5 SDKs,
iPhone 17 simulators, Node 26, pnpm 10.33. WXT builds Safari via `wxt build -b safari`
→ `extension/.output/safari-mv3`. The converter emits **both** macOS + iOS app & extension
targets by default.

## Identifiers
- App bundle id: `com.mekedron.OpenTranslate`
- Extension bundle id: `com.mekedron.OpenTranslate.Extension`

## Two-tree model (important)
- `extension/` is the source of truth; `pnpm build:safari` writes `extension/.output/safari-mv3`.
- `apple/OpenTranslate` is the Xcode project. It is generated **once** with `--copy-resources`,
  then **committed and hand-edited** (signing team, Info.plist).
- **Day-to-day rebuilds never re-run the converter.** Instead, copy the freshly built web
  bundle into the project's `Resources/` (see `scripts/sync-resources.sh`). This preserves all
  hand edits. Only re-run the converter (with `--rebuild-project`, never `--force`) when the
  manifest's *structure* changes (new entrypoint / permission / web-accessible resource).

## Commands

### Build the web extension
```bash
cd extension && pnpm build:safari      # → extension/.output/safari-mv3
```

### Generate the Xcode project — ONE TIME (then commit apple/, never --force again)
```bash
scripts/gen-xcode.sh
# = xcrun safari-web-extension-converter \
#     --project-location apple --app-name OpenTranslate \
#     --bundle-identifier com.mekedron.OpenTranslate \
#     --swift --copy-resources --no-open --no-prompt --force \
#     extension/.output/safari-mv3
```

### Everyday refresh after a code change
```bash
scripts/sync-resources.sh   # rsync extension/.output/safari-mv3 → apple project Resources/
```

### Structural manifest change (new permission/entrypoint)
```bash
xcrun safari-web-extension-converter --rebuild-project apple/OpenTranslate --no-open --no-prompt extension/.output/safari-mv3
git diff apple/OpenTranslate/OpenTranslate.xcodeproj/project.pbxproj   # re-verify signing
```

## Running & testing

### macOS Safari (unsigned, no paid account)
1. Open `apple/OpenTranslate/OpenTranslate.xcodeproj`, Run the macOS scheme.
2. Safari → Settings → Advanced → "Show features for web developers".
3. Safari → Settings → Developer → "Allow unsigned extensions" (re-enable per Safari launch).
4. Safari → Settings → Extensions → enable OpenTranslate.
5. Open a Finnish site (yle.fi / hs.fi) → click the toolbar icon → allow site access → translate.
6. Verify registration: `pluginkit -mAvvv -p com.apple.Safari.web-extension | grep -i opentranslate`.
7. Debug: Develop → Web Extension Background Pages → OpenTranslate (service-worker inspector);
   page Console for content-script logs.

### iOS Simulator
1. Run the iOS scheme against an iPhone 17 simulator (or `scripts/run-ios-sim.sh`).
2. Simulator → Settings → Safari → Extensions → enable OpenTranslate → Allow All Websites.
3. Safari → open yle.fi → extensions menu → OpenTranslate → translate via the popup.
4. Debug: Mac Safari → Develop → [Simulator device] → background page / web page inspector.

### Physical iPhone
Automatic signing with the Apple Developer **Team ID** (see Signing). Trust the developer
profile on-device. Free personal team = 7-day re-sign limit.

## Signing
Both app targets + both extension targets → Automatic signing, Team = `<APPLE_TEAM_ID>`.
Simulator builds may pass `CODE_SIGNING_ALLOWED=NO`. Settings are stored locally per device
(no iCloud / no cloud sync).

## Hand edits to re-apply if the converter is re-run
_(record here as they are made — signing team, Info.plist toggles, entitlements, app group)_

## Known caveats
- Never use the `wxt-module-safari-xcode` module — it runs the converter with `--force` on
  every build and would destroy the hand-edited project.
- Safari grants host access per-site; "Allow on Every Website" gives the smoothest experience.
- Safari MV3 has no `webRequest`/`offscreen`/`sidePanel`; OpenTranslate doesn't use them.
