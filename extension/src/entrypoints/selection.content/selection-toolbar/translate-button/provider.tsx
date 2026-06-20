import type { Hotkey } from "@tanstack/hotkeys"
import type { ReactNode } from "react"
import type { SelectionSession } from "../atoms"
import type { SelectionToolbarInlineError } from "../inline-error"
import type { ThinkingSnapshot } from "@/types/background-stream"
import { HotkeyManager } from "@tanstack/hotkeys"
import { useAtomValue, useSetAtom } from "jotai"
import { createContext, use, useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { SelectionPopover } from "@/components/ui/selection-popover"
import { isLLMProviderConfig, isTranslateProviderConfig } from "@/types/config/provider"
import { configFieldsAtomMap, writeConfigAtom } from "@/utils/atoms/config"
import { filterEnabledProvidersConfig } from "@/utils/config/helpers"
import { buildFeatureProviderPatch } from "@/utils/constants/feature-providers"
import { translateWithLlm, translateWithStandardProvider } from "@/utils/host/translate/selection-translate"
import { prepareTranslationText } from "@/utils/host/translate/text-preparation"
import { onMessage } from "@/utils/message"
import { isPageTranslationShortcutEmpty, isValidConfiguredPageTranslationShortcut } from "@/utils/page-translation-shortcut"
import { shadowWrapper } from "../.."
import { SelectionToolbarErrorAlert } from "../../components/selection-toolbar-error-alert"
import { SelectionToolbarFooterContent } from "../../components/selection-toolbar-footer-content"
import { SelectionToolbarTitleContent } from "../../components/selection-toolbar-title-content"
import {
  isSelectionToolbarVisibleAtom,
  selectionSessionAtom,
  selectionToolbarTranslateRequestAtom,
} from "../atoms"
import {
  createSelectionToolbarPrecheckError,
  createSelectionToolbarRuntimeError,
  isAbortError,
} from "../inline-error"
import { useSelectionOpenRequestResolver } from "../use-selection-open-request"
import { TargetLanguageSelector } from "./target-language-selector"
import { TranslationContent } from "./translation-content"

interface SelectionTranslatePendingOpenRequest {
  anchor?: { x: number, y: number }
  session: SelectionSession
}

interface SelectionTranslationContextValue {
  prepareToolbarOpen: () => void
}

const SelectionTranslationContext = createContext<SelectionTranslationContextValue | null>(null)

function useSelectionTranslationContext() {
  const context = use(SelectionTranslationContext)
  if (!context) {
    throw new Error("Selection translation popover must be used within SelectionTranslationProvider.")
  }

  return context
}

export function useSelectionTranslationPopover() {
  return useSelectionTranslationContext()
}

export function SelectionTranslationProvider({
  children,
}: {
  children: ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [anchor, setAnchor] = useState<{ x: number, y: number } | null>(null)
  const [popoverSessionKey, setPopoverSessionKey] = useState(0)
  const [translatedText, setTranslatedText] = useState<string | undefined>(undefined)
  const [thinking, setThinking] = useState<ThinkingSnapshot | null>(null)
  const [error, setError] = useState<SelectionToolbarInlineError | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [rerunNonce, setRerunNonce] = useState(0)
  const [activeSession, setActiveSession] = useState<SelectionSession | null>(null)
  const selectionSession = useAtomValue(selectionSessionAtom)
  const translateRequest = useAtomValue(selectionToolbarTranslateRequestAtom)
  const providersConfig = useAtomValue(configFieldsAtomMap.providersConfig)
  const selectionToolbar = useAtomValue(configFieldsAtomMap.selectionToolbar)
  const setIsSelectionToolbarVisible = useSetAtom(isSelectionToolbarVisibleAtom)
  const setConfig = useSetAtom(writeConfigAtom)
  const abortControllerRef = useRef<AbortController | null>(null)
  const pendingOpenRequestRef = useRef<SelectionTranslatePendingOpenRequest | null>(null)
  const reopenFrameRef = useRef<number | null>(null)
  const lastTranslationRunKeyRef = useRef<string | null>(null)
  const runIdRef = useRef(0)
  const {
    resolveContextMenuOpenRequest,
    resolveShortcutOpenRequest,
  } = useSelectionOpenRequestResolver(selectionSession)
  const selectionText = activeSession?.selectionSnapshot.text ?? null
  const paragraphsText = activeSession?.contextSnapshot.text ?? selectionText
  const titleText = document.title || null
  const translateProviders = useMemo(
    () => filterEnabledProvidersConfig(providersConfig).filter(isTranslateProviderConfig),
    [providersConfig],
  )
  const translateRequestKey = useMemo(
    () => JSON.stringify(translateRequest),
    [translateRequest],
  )

  const resetPopoverSession = useCallback((options?: { clearAnchor?: boolean }) => {
    setActiveSession(null)
    if (options?.clearAnchor) {
      setAnchor(null)
    }
  }, [])

  const resetTranslationState = useCallback(() => {
    setIsTranslating(false)
    setTranslatedText(undefined)
    setThinking(null)
    setError(null)
  }, [])

  const cancelCurrentTranslation = useCallback((runId?: number) => {
    if (runId !== undefined && runIdRef.current !== runId) {
      return
    }

    runIdRef.current += 1
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
  }, [])

  const commitOpenRequest = useCallback((request: SelectionTranslatePendingOpenRequest) => {
    pendingOpenRequestRef.current = request
    if (request.anchor) {
      setAnchor(request.anchor)
    }
  }, [])

  const handleProviderChange = useCallback((providerId: string) => {
    void setConfig(buildFeatureProviderPatch({ "selectionToolbar.translate": providerId }))
  }, [setConfig])

  const handleRegenerate = useCallback(() => {
    cancelCurrentTranslation()
    setRerunNonce(prev => prev + 1)
  }, [cancelCurrentTranslation])

  const runTranslation = useCallback(async (runId: number) => {
    const preparedText = prepareTranslationText(selectionText)

    if (preparedText === "") {
      if (runIdRef.current === runId) {
        resetTranslationState()
      }
      return
    }

    setIsTranslating(true)
    setTranslatedText(undefined)
    setThinking(null)
    setError(null)

    const providerConfig = translateRequest.providerConfig
    if (!providerConfig || !isTranslateProviderConfig(providerConfig)) {
      if (runIdRef.current === runId) {
        setIsTranslating(false)
        setError(createSelectionToolbarPrecheckError("translate", "providerUnavailable"))
      }
      return
    }

    if (!providerConfig.enabled) {
      if (runIdRef.current === runId) {
        setIsTranslating(false)
        setError(createSelectionToolbarPrecheckError("translate", "providerDisabled"))
      }
      return
    }

    try {
      let nextTranslatedText = ""
      if (isLLMProviderConfig(providerConfig)) {
        setThinking({
          status: "thinking",
          text: "",
        })

        const nextSnapshot = await translateWithLlm({
          preparedText,
          providerConfig,
          translateRequest,
          onChunk: (data) => {
            if (runIdRef.current === runId) {
              setTranslatedText(data.output)
              setThinking(data.thinking)
            }
          },
          registerAbortController: (abortController) => {
            abortControllerRef.current = abortController
          },
        })

        nextTranslatedText = nextSnapshot.output
        if (runIdRef.current === runId) {
          setThinking(nextSnapshot.thinking)
        }
      }
      else {
        setThinking(null)
        nextTranslatedText = await translateWithStandardProvider({
          text: preparedText,
          providerConfig,
          translateRequest,
        })
      }

      if (runIdRef.current === runId) {
        setTranslatedText(nextTranslatedText)
      }
    }
    catch (error) {
      if (!isAbortError(error) && runIdRef.current === runId) {
        setThinking(prev => prev?.text ? { ...prev, status: "complete" } : null)
        setError(createSelectionToolbarRuntimeError("translate", error))
      }
    }
    finally {
      if (runIdRef.current === runId) {
        abortControllerRef.current = null
        setIsTranslating(false)
      }
    }
  }, [resetTranslationState, selectionText, translateRequest])

  const startTranslation = useEffectEvent((runId: number) => {
    void runTranslation(runId)
  })

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const nextRunKey = JSON.stringify({
      popoverSessionKey,
      rerunNonce,
      sessionId: activeSession?.id ?? null,
      translateRequestKey,
    })
    if (lastTranslationRunKeyRef.current === nextRunKey) {
      return
    }
    lastTranslationRunKeyRef.current = nextRunKey

    const runId = runIdRef.current + 1
    runIdRef.current = runId

    startTranslation(runId)

    return () => {
      cancelCurrentTranslation(runId)
    }
  }, [activeSession?.id, cancelCurrentTranslation, isOpen, popoverSessionKey, rerunNonce, translateRequestKey])

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    cancelCurrentTranslation()
    resetTranslationState()

    if (nextOpen) {
      const pendingRequest = pendingOpenRequestRef.current
      const nextSession = pendingRequest?.session ?? selectionSession

      setActiveSession(nextSession)
      setPopoverSessionKey(prev => prev + 1)
      if (pendingRequest?.anchor) {
        setAnchor(pendingRequest.anchor)
      }
      setIsSelectionToolbarVisible(false)
      pendingOpenRequestRef.current = null
    }
    else {
      resetPopoverSession({
        clearAnchor: pendingOpenRequestRef.current === null,
      })
      lastTranslationRunKeyRef.current = null
    }

    setIsOpen(nextOpen)
  }, [cancelCurrentTranslation, resetPopoverSession, resetTranslationState, selectionSession, setIsSelectionToolbarVisible])

  const prepareToolbarOpen = useCallback(() => {
    if (!selectionSession) {
      return
    }

    commitOpenRequest({
      session: selectionSession,
    })
  }, [commitOpenRequest, selectionSession])

  const resolveContextMenuRequest = useCallback((): SelectionTranslatePendingOpenRequest | null => {
    const request = resolveContextMenuOpenRequest()
    if (!request) {
      return null
    }

    return {
      anchor: request.anchor,
      session: request.session,
    }
  }, [resolveContextMenuOpenRequest])

  const resolveShortcutRequest = useCallback((): SelectionTranslatePendingOpenRequest | null => {
    const request = resolveShortcutOpenRequest()
    if (!request) {
      return null
    }

    return {
      anchor: request.anchor,
      session: request.session,
    }
  }, [resolveShortcutOpenRequest])

  const openSelectionTranslationRequest = useCallback((
    request: SelectionTranslatePendingOpenRequest | null,
    options?: { showMissingSelectionToast?: boolean },
  ) => {
    if (!request) {
      if (options?.showMissingSelectionToast) {
        const nextError = createSelectionToolbarPrecheckError("translate", "missingSelection")
        toast.error(nextError.description)
      }
      return
    }

    if (reopenFrameRef.current !== null) {
      cancelAnimationFrame(reopenFrameRef.current)
      reopenFrameRef.current = null
    }

    if (isOpen) {
      handleOpenChange(false)
      reopenFrameRef.current = requestAnimationFrame(() => {
        reopenFrameRef.current = null
        commitOpenRequest(request)
        handleOpenChange(true)
      })
      return
    }

    commitOpenRequest(request)
    handleOpenChange(true)
  }, [commitOpenRequest, handleOpenChange, isOpen])

  const openFromContextMenu = useCallback(() => {
    openSelectionTranslationRequest(resolveContextMenuRequest(), {
      showMissingSelectionToast: true,
    })
  }, [openSelectionTranslationRequest, resolveContextMenuRequest])

  const openFromShortcut = useCallback(() => {
    openSelectionTranslationRequest(resolveShortcutRequest())
  }, [openSelectionTranslationRequest, resolveShortcutRequest])

  useEffect(() => {
    const shortcut = selectionToolbar.features.translate.shortcut
    if (isPageTranslationShortcutEmpty(shortcut) || !isValidConfiguredPageTranslationShortcut(shortcut)) {
      return
    }

    const registration = HotkeyManager.getInstance().register(
      shortcut as Hotkey,
      () => {
        openFromShortcut()
      },
      {
        ignoreInputs: true,
        preventDefault: true,
        stopPropagation: true,
      },
    )

    return () => {
      registration.unregister()
    }
  }, [openFromShortcut, selectionToolbar.features.translate.shortcut])

  useEffect(() => {
    return onMessage("openSelectionTranslationFromContextMenu", () => {
      openFromContextMenu()
    })
  }, [openFromContextMenu])

  useEffect(() => {
    return () => {
      if (reopenFrameRef.current !== null) {
        cancelAnimationFrame(reopenFrameRef.current)
      }
    }
  }, [])

  const contextValue = useMemo<SelectionTranslationContextValue>(() => ({
    prepareToolbarOpen,
  }), [prepareToolbarOpen])

  return (
    <SelectionTranslationContext value={contextValue}>
      <SelectionPopover.Root
        open={isOpen}
        onOpenChange={handleOpenChange}
        anchor={anchor}
        onAnchorChange={setAnchor}
      >
        {children}
        <SelectionPopover.Content
          key={popoverSessionKey}
          container={shadowWrapper ?? document.body}
          finalFocus={false}
        >
          <SelectionPopover.Header className="border-b">
            <SelectionToolbarTitleContent
              title="Translation"
              icon="ri:translate"
            />
            <div className="flex items-center gap-1">
              <TargetLanguageSelector />
              <SelectionPopover.Pin />
              <SelectionPopover.Close />
            </div>
          </SelectionPopover.Header>

          <SelectionPopover.Body>
            <TranslationContent
              selectionContent={selectionText}
              translatedText={translatedText}
              isTranslating={isTranslating}
              thinking={thinking}
            />
            <SelectionToolbarErrorAlert error={error} className="-mt-3" />
          </SelectionPopover.Body>
          <SelectionToolbarFooterContent
            paragraphsText={paragraphsText}
            providers={translateProviders}
            titleText={titleText}
            value={translateRequest.providerConfig?.id ?? ""}
            onProviderChange={handleProviderChange}
            onRegenerate={handleRegenerate}
          />
        </SelectionPopover.Content>
      </SelectionPopover.Root>
    </SelectionTranslationContext>
  )
}
