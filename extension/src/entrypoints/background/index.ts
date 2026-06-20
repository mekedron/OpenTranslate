import "@/utils/zod-config"
import { browser, defineBackground } from "#imports"
import { isContextMenusAvailable } from "@/utils/browser-env"
import { logger } from "@/utils/logger"
import { onMessage } from "@/utils/message"
import { openOptionsPage } from "@/utils/navigation"
import { dispatchBackgroundStreamPort } from "./background-stream"
import { ensureInitializedConfig } from "./config"
import { setUpConfigBackup } from "./config-backup"
import { initializeContextMenu, registerContextMenuListeners } from "./context-menu"
import { cleanupAllSummaryCache, cleanupAllTranslationCache, setUpDatabaseCleanup } from "./db-cleanup"
import { setupIframeInjection } from "./iframe-injection"
import { setupLLMGenerateTextMessageHandlers } from "./llm-generate-text"
import { initMockData } from "./mock-data"
import { proxyFetch } from "./proxy-fetch"
import { setUpWebPageTranslationQueue } from "./translation-queues"
import { translationMessage } from "./translation-signal"

export default defineBackground({
  type: "module",
  main: () => {
    logger.info("Hello background!", { id: browser.runtime.id })

    browser.runtime.onInstalled.addListener(async () => {
      await ensureInitializedConfig()
    })

    onMessage("openPage", async (message) => {
      const { url, active } = message.data
      logger.info("openPage", { url, active })
      await browser.tabs.create({ url, active: active ?? true })
    })

    onMessage("openOptionsPage", async (message) => {
      logger.info("openOptionsPage", message.data)
      await openOptionsPage(message.data)
    })

    browser.runtime.onConnect.addListener((port) => {
      dispatchBackgroundStreamPort(port)
    })

    onMessage("clearAllTranslationRelatedCache", async () => {
      await cleanupAllTranslationCache()
      await cleanupAllSummaryCache()
    })

    translationMessage()

    // Register context menu listeners synchronously (listeners must be registered
    // before Chrome completes initialization). Skipped on platforms without the
    // contextMenus API — e.g. Safari on iOS — so the worker doesn't throw.
    if (isContextMenusAvailable()) {
      registerContextMenuListeners()
      // Initialize context menu items asynchronously
      void initializeContextMenu()
    }

    void setUpWebPageTranslationQueue()
    void setUpDatabaseCleanup()
    setUpConfigBackup()

    proxyFetch()
    setupLLMGenerateTextMessageHandlers()
    void initMockData()

    // Setup on-demand iframe injection after page translation is enabled.
    setupIframeInjection()
  },
})
