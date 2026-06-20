import process from "node:process"
import { defineConfig } from "wxt"

const WXT_API_KEY_PATTERN = /^WXT_.*API_KEY/
const ALLOWED_BUNDLED_API_KEYS = new Set<string>()

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: "src",
  imports: false,
  modules: ["@wxt-dev/module-react", "@wxt-dev/i18n/module"],
  manifestVersion: 3,
  hooks: {
    // Safari (WebKit) surfaces two things WXT emits in web_accessible_resources
    // entries as "Invalid `web_accessible_resources` manifest entry" in the
    // Extensions pane. Strip both for the Safari build:
    //
    //   1. `use_dynamic_url` — unsupported key. WXT adds it to the content-script
    //      CSS entries (selection.css/side.css); the CSS still loads without it,
    //      just at a stable extension URL.
    //
    //   2. `file:///*` match patterns. WebKit lists `file`/`ftp` as *valid* but
    //      *unsupported* schemes (validSchemes ⊃ supportedSchemes), and its MV3
    //      WAR parser flags the entry when ANY match pattern is unsupported —
    //      even though the supported `*://*/*` survives and the entry still works.
    //      That single unsupported pattern is enough to record the error. Drop the
    //      file/ftp patterns; Safari can't expose extension resources to file://
    //      pages anyway. (See WebKit WebExtension.cpp parseWebAccessibleResourcesVersion3.)
    "build:manifestGenerated": (wxt, manifest) => {
      if (wxt.config.browser !== "safari")
        return
      const war = manifest.web_accessible_resources
      if (!Array.isArray(war))
        return
      const unsupportedScheme = /^(?:file|ftp):/i
      for (const entry of war) {
        if (!entry || typeof entry !== "object")
          continue
        const record = entry as Record<string, unknown>
        delete record.use_dynamic_url
        if (Array.isArray(record.matches)) {
          record.matches = (record.matches as unknown[]).filter(
            pattern => typeof pattern !== "string" || !unsupportedScheme.test(pattern),
          )
        }
      }
      // Drop any entry left with an empty `matches` after filtering (defensive —
      // `*://*/*` survives for all of our entries, so none are actually removed).
      manifest.web_accessible_resources = war.filter((entry) => {
        if (!entry || typeof entry !== "object")
          return true
        const matches = (entry as Record<string, unknown>).matches
        return !Array.isArray(matches) || matches.length > 0
      }) as typeof manifest.web_accessible_resources
    },
  },
  manifest: ({ mode, browser }) => ({
    name: "__MSG_extName__",
    description: "__MSG_extDescription__",
    default_locale: "en",
    // Fixed extension ID for development
    ...(mode === "development" && (browser === "chrome" || browser === "edge") && {
      key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAw2KhiXO2vySZtPu5pNSbyKhYavh8Be7gXmCZt8aJf6tQ/L3JK0qzL+3JSc/o20td3Jw+B2Dcw+EI93NAZr24xKnTNXQiJpuIuHb8xLXD0Ra/HrTVi4TJIhPdESogoG4uL6CD/F3TxfZJ2trX4Bt9cdAw1RGGeU+xU0g+YFfEka4ZUCpFAmTEw9H3/DU+nCp8yGaJWyiVgCTcFe38GZKEPt0iMJkTw956wz/iiafLx0pNG/RaztG9cAPoQOD2+SMFaeQ+b/G4OG17TYhzb09AhNBl6zSJ3jTKHSwuedCFwCce8Q/EchJfQZv71mjAE97bzwvkDYPCLj31Z5FE8HntMwIDAQAB",
    }),
    permissions: [
      "storage",
      "tabs",
      "alarms",
      "contextMenus",
      "scripting",
      "webNavigation",
      // Safari uses activeTab (its per-site permission model) so the toolbar
      // action works. Other browsers get offscreen/sidePanel (absent on Firefox).
      ...(browser === "safari"
        ? ["activeTab"]
        : (browser !== "firefox" ? ["offscreen", "sidePanel"] : [])),
    ],
    host_permissions: [
      "*://*/*", // Required for scripting.executeScript in any frame
    ],
    // Allow images/SVGs referenced by content-script UI <img> tags to be loaded from
    // moz-extension:// URLs on regular pages. Firefox enforces this more strictly.
    web_accessible_resources: [
      {
        resources: ["assets/*.png", "assets/*.svg", "assets/*.webp"],
        matches: ["*://*/*", "file:///*"],
      },
    ],
    // Firefox-specific settings for MV3
    ...(browser === "firefox" && {
      // Override default CSP to exclude `upgrade-insecure-requests` (Firefox MV3 default),
      // which would upgrade custom provider HTTP URLs (e.g. LAN) to HTTPS.
      content_security_policy: {
        extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
      },
      browser_specific_settings: {
        gecko: {
          id: "{bd311a81-4530-4fcc-9178-74006155461b}",
          strict_min_version: "112.0",
          data_collection_permissions: {
            required: ["none"],
          },
        },
      },
    }),
    // Safari: mirror the Firefox CSP override so custom/LAN provider HTTP URLs
    // (e.g. a self-hosted DeepLX endpoint) aren't force-upgraded to HTTPS.
    ...(browser === "safari" && {
      content_security_policy: {
        extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
      },
    }),
  }),
  zip: {
    excludeSources: ["docs/**/*", "assets/**/*", "repos/**/*", "readmes/**/*"],
  },
  dev: {
    server: {
      // Prefer 3333 over WXT's default 3000 while still allowing WXT to pick
      // another open port when 3333 is already taken.
      port: 3333,
      strictPort: false,
    },
  },
  vite: configEnv => ({
    plugins: [
      ...(configEnv.mode === "production"
        ? [
            {
              name: "check-api-key-env",
              buildStart() {
                const apiKeyVars = Object.keys(process.env)
                  .filter(key => WXT_API_KEY_PATTERN.test(key))
                  .filter(key => !ALLOWED_BUNDLED_API_KEYS.has(key))

                if (apiKeyVars.length > 0) {
                  throw new Error(
                    `\n\nFound WXT_*_API_KEY environment variables that may be bundled:\n`
                    + `${apiKeyVars.map(k => `   - ${k}`).join("\n")}\n\n`
                    + `Please unset these variables before building for production.\n`,
                  )
                }
              },
            },
          ]
        : []),
    ],
  }),
})
