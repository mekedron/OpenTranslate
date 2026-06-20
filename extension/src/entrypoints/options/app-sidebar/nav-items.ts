export const ROUTE_DEFS = [
  { path: "/" },
  { path: "/api-providers" },
  { path: "/custom-actions" },
  { path: "/translation" },
  { path: "/floating-button" },
  { path: "/selection-toolbar" },
  { path: "/context-menu" },
  { path: "/input-translation" },
  { path: "/statistics" },
  { path: "/about" },
  { path: "/config" },
] as const

/**
 * Routes for overlay tools that only work on macOS Safari. The context menu API
 * is absent on iOS/iPadOS, and the in-page selection toolbar is unusable there
 * (Safari's native selection callout always covers it). Hidden from the sidebar
 * nav and command palette on touch devices — see {@link isTouchDevice}.
 */
export const DESKTOP_ONLY_PATHS: string[] = ["/selection-toolbar", "/context-menu"]
