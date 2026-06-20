// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest"

async function loadStyleInjector() {
  vi.resetModules()

  vi.doMock("@/assets/styles/custom-translation-node.css?raw", () => ({
    default: "@import '@/assets/styles/host-theme.css';\n[data-opentranslate-custom-translation-style='blur'] { opacity: 0.75; }",
  }))
  vi.doMock("@/assets/styles/host-theme.css?raw", () => ({
    default: ":root { --opentranslate-primary: oklch(0.205 0 0); --opentranslate-brand: oklch(76.034% 0.12361 82.191); }",
  }))
  vi.doMock("@/assets/styles/translation-node-preset.css?raw", () => ({
    default: ".opentranslate-translated-content-wrapper { display: inline; }",
  }))

  return import("../style-injector")
}

describe("style-injector", () => {
  beforeEach(() => {
    document.head.innerHTML = ""
    document.body.innerHTML = ""

    Object.defineProperty(document, "adoptedStyleSheets", {
      configurable: true,
      value: undefined,
    })
  })

  it("injects preset styles into the document", async () => {
    const { ensurePresetStyles } = await loadStyleInjector()

    ensurePresetStyles(document)

    const presetStyle = document.head.querySelector<HTMLStyleElement>("#opentranslate-preset-styles")
    expect(presetStyle).not.toBeNull()
    expect(presetStyle?.textContent).toContain(".opentranslate-translated-content-wrapper")
    expect(presetStyle?.textContent).toContain(":root")
    expect(presetStyle?.textContent).not.toContain(":host")
  })

  it("uses adoptedStyleSheets for document preset styles when available", async () => {
    const { ensurePresetStyles } = await loadStyleInjector()

    Object.defineProperty(document, "adoptedStyleSheets", {
      configurable: true,
      value: [],
      writable: true,
    })

    ensurePresetStyles(document)

    expect(document.adoptedStyleSheets).toHaveLength(1)
    expect(document.adoptedStyleSheets[0]?.cssRules[0]?.cssText).toContain("--opentranslate-brand")
    expect(document.head.querySelector("#opentranslate-preset-styles")).toBeNull()
  })

  it("falls back to style elements when adoptedStyleSheets assignment throws", async () => {
    const { ensurePresetStyles } = await loadStyleInjector()
    const adoptedStyleSheets: CSSStyleSheet[] = []

    Object.defineProperty(document, "adoptedStyleSheets", {
      configurable: true,
      get() {
        return adoptedStyleSheets
      },
      set() {
        throw new Error("Xray wrapper")
      },
    })

    ensurePresetStyles(document)

    const presetStyle = document.head.querySelector<HTMLStyleElement>("#opentranslate-preset-styles")
    expect(presetStyle).not.toBeNull()
    expect(adoptedStyleSheets).toHaveLength(0)
  })

  it("injects preset styles into shadow roots with :host variables", async () => {
    const { ensurePresetStyles } = await loadStyleInjector()
    const host = document.createElement("div")
    const shadow = host.attachShadow({ mode: "open" })

    Object.defineProperty(shadow, "adoptedStyleSheets", {
      configurable: true,
      value: undefined,
    })

    ensurePresetStyles(shadow)

    const presetStyle = shadow.querySelector<HTMLStyleElement>("#opentranslate-preset-styles")
    expect(presetStyle).not.toBeNull()
    expect(presetStyle?.textContent).toContain(".opentranslate-translated-content-wrapper")
    expect(presetStyle?.textContent).toContain(":host")
    expect(presetStyle?.textContent).not.toContain(":root {")
  })

  it("ensures preset styles exist before custom document CSS", async () => {
    const { ensureCustomCSS } = await loadStyleInjector()

    await ensureCustomCSS(document, ".custom-translation-style { color: red; }")

    const presetStyle = document.head.querySelector<HTMLStyleElement>("#opentranslate-preset-styles")
    const customStyle = document.head.querySelector<HTMLStyleElement>("#opentranslate-custom-styles")

    expect(presetStyle).not.toBeNull()
    expect(customStyle).not.toBeNull()
    expect(customStyle?.textContent).toContain(".custom-translation-style")
  })

  it("uses adoptedStyleSheets for document custom CSS when available", async () => {
    const { ensureCustomCSS } = await loadStyleInjector()

    Object.defineProperty(document, "adoptedStyleSheets", {
      configurable: true,
      value: [],
      writable: true,
    })

    await ensureCustomCSS(document, ".custom-translation-style { color: blue; }")

    expect(document.adoptedStyleSheets).toHaveLength(2)
    expect(Array.from(document.adoptedStyleSheets[1]?.cssRules ?? [], rule => rule.cssText).join("\n")).toContain("color: blue")
    expect(document.head.querySelector("#opentranslate-custom-styles")).toBeNull()
  })
})
