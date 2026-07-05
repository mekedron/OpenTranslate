# OpenTranslate

A Safari Web Extension for **full-page translation** on **macOS, iPhone, and iPad**. It exists
because Safari's built-in translation is limited and does not cover many languages (e.g. Finnish) well.

**[Website](https://mekedron.github.io/OpenTranslate/)** · **[Releases](https://github.com/mekedron/OpenTranslate/releases)**

OpenTranslate ships a rich translation engine — **~32 providers** (Google & Microsoft free,
DeepL/DeepLX, and 28 LLM providers via the Vercel AI SDK: OpenAI, Anthropic, Gemini, DeepSeek,
Mistral, Groq, OpenRouter, Ollama, and more) — with in-page bilingual / translation-only
rendering, a popup, and a full settings page.

Settings are stored **locally on each device** — no account, no cloud sync, no telemetry.

## Repository layout

| Path          | Contents |
|---------------|----------|
| `extension/`  | The WXT web-extension source. Source of truth. |
| `apple/`      | The generated Xcode project (macOS + iOS app & extension targets), hand-edited for signing. Committed. |
| `site/`       | The [landing page](https://mekedron.github.io/OpenTranslate/) source, deployed to GitHub Pages via Actions. |
| `scripts/`    | Build / convert / run helpers. |
| `docs/SAFARI.md` | Build, sign, and test runbook + provenance. |

## Quick start

```bash
# 1. Build the web extension for Safari
cd extension && pnpm install && pnpm build:safari      # → extension/.output/safari-mv3

# 2. (first time only) generate the Xcode project
../scripts/gen-xcode.sh

# 3. build & run — open apple/OpenTranslate/OpenTranslate.xcodeproj in Xcode,
#    or use ../scripts/run-ios-sim.sh for the iOS Simulator.
```

See [`docs/SAFARI.md`](docs/SAFARI.md) for the full runbook, including enabling unsigned
extensions on macOS and granting per-site access.

## Download

There's no App Store listing yet — for now, grab the latest build from
[GitHub Releases](https://github.com/mekedron/OpenTranslate/releases).

## Support

OpenTranslate is built and maintained by one solo developer, for free. If it's useful to you,
consider [buying me a coffee](https://buymeacoffee.com/mekedron) ☕ — it keeps the commits coming.

## License

OpenTranslate is free software licensed under the **GNU General Public License v3.0 or later**
(`GPL-3.0-or-later`). See [`LICENSE`](LICENSE) for the full text.

Copyright © 2026 Nikita R and OpenTranslate contributors.

## Credits

OpenTranslate is based on [read-frog](https://github.com/mengxi-ream/read-frog) by Mengxi Ream
and the read-frog contributors, which is also licensed under GPL-3.0-or-later. The translation
engine, in-page rendering, and settings UI originate from that project; OpenTranslate adapts it
into a focused Safari (macOS + iOS) translator and drops the parts that don't fit — text-to-speech,
subtitle/video translation, the Chrome side panel, and read-frog's cloud services. Many thanks to
the upstream authors.
