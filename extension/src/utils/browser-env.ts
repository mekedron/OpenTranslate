import { browser } from "#imports"

/**
 * True when this build targets Safari (`wxt build -b safari`).
 * WXT injects `import.meta.env.BROWSER` at build time.
 */
export const IS_SAFARI = import.meta.env.BROWSER === "safari"

/**
 * `browser.contextMenus` exists in Safari on macOS but NOT on iOS (the API is
 * `undefined` there). Guard context-menu registration with this so the iOS
 * background service worker doesn't throw on startup.
 */
export function isContextMenusAvailable(): boolean {
  return typeof browser.contextMenus?.create === "function"
}
