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

/**
 * True on iOS and iPadOS, false on macOS (and other desktop platforms).
 *
 * iPadOS Safari masquerades as macOS in its user agent (`navigator.platform`
 * reports `MacIntel`), so the UA string alone can't tell an iPad from a Mac.
 * `navigator.maxTouchPoints` can: it is `0` on a real Mac (no touchscreen) and
 * `> 0` on every iPhone/iPad. Use this to gate macOS-only overlay tools — the
 * context menu and the in-page selection toolbar — which have no working
 * equivalent on touch devices.
 */
export function isTouchDevice(): boolean {
  if (typeof navigator === "undefined")
    return false
  return (navigator.maxTouchPoints ?? 0) > 0
}
