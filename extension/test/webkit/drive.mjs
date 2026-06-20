// WebKit UI harness driver. WebKit is Safari's engine, so this reproduces
// Safari-only layout/positioning bugs that Chromium/Firefox don't show — without
// a full Xcode + Simulator build.
//
// Prereq: run `pnpm build:safari` once so the compiled Tailwind CSS exists.
// Run:    pnpm exec node test/webkit/drive.mjs
// Tune:   VW=390 CONFIGS="bug|w=anchor,fix|align=end" pnpm exec node test/webkit/drive.mjs
//
// For each config it opens the Select, screenshots it (test/webkit/shot-<name>.png,
// gitignored), and reports whether the menu overflows the viewport.
import { copyFileSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { webkit } from "playwright"
import { createServer } from "vite"

const here = dirname(fileURLToPath(import.meta.url))
const extensionRoot = join(here, "../..")
const VW = Number(process.env.VW || 320)
const CONFIGS = (process.env.CONFIGS || "bug|w=anchor,fix|align=end&w=fit").split(",")

// 1. Copy the latest compiled Tailwind CSS so the harness page is styled exactly
//    like the built extension (real class widths/paddings drive the layout).
const assetsDir = join(extensionRoot, ".output/safari-mv3/assets")
const cssFile = readdirSync(assetsDir).find(f => f.startsWith("theme-") && f.endsWith(".css"))
if (!cssFile) {
  console.error("No compiled CSS found. Run `pnpm build:safari` first.")
  process.exit(1)
}
copyFileSync(join(assetsDir, cssFile), join(here, "theme.css"))

// 2. Serve the harness with Vite.
const server = await createServer({ configFile: join(here, "vite.config.mjs") })
await server.listen()
const baseUrl = server.resolvedUrls.local[0].replace(/\/$/, "")

// 3. Drive WebKit.
const browser = await webkit.launch()
const results = []
for (const entry of CONFIGS) {
  const [name, query = ""] = entry.split("|")
  const page = await browser.newPage({ viewport: { width: VW, height: 720 } })
  try {
    await page.goto(`${baseUrl}/?${query}`, { waitUntil: "networkidle" })
    await page.click("[data-slot=select-trigger]")
    await page.waitForSelector("[data-slot=select-content]", { timeout: 3000 })
    await page.waitForTimeout(300)
    const box = await (await page.$("[data-slot=select-content]")).boundingBox()
    const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    await page.screenshot({ path: join(here, `shot-${name}.png`) })
    results.push({ name, vw: VW, menuRight: Math.round(box.x + box.width), overflowsViewport: overflows, shot: `test/webkit/shot-${name}.png` })
  }
  catch (e) {
    results.push({ name, error: String(e).split("\n")[0] })
  }
  await page.close()
}
await browser.close()
await server.close()
for (const r of results) console.log(JSON.stringify(r))
