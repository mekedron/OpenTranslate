import type { CustomActionExecutionContext } from "@/entrypoints/selection.content/selection-toolbar/custom-action-button/use-custom-action-execution"
import type { SelectionToolbarInlineError } from "@/entrypoints/selection.content/selection-toolbar/inline-error"
import type { BackgroundStructuredObjectStreamSnapshot, ThinkingSnapshot } from "@/types/background-stream"
import type { SelectionToolbarCustomAction } from "@/types/config/selection-toolbar"
import { Icon } from "@iconify/react"
import { LANG_CODE_TO_EN_NAME } from "@read-frog/definitions"
import { IconLanguage, IconLoader2 } from "@tabler/icons-react"
import { useAtomValue } from "jotai"
import { useEffect, useMemo, useRef, useState } from "react"
import { browser, i18n } from "#imports"
import { Thinking } from "@/components/thinking"
import { selectionToolbarTranslateRequestAtom } from "@/entrypoints/selection.content/selection-toolbar/atoms"
import { StructuredObjectRenderer } from "@/entrypoints/selection.content/selection-toolbar/custom-action-button/structured-object-renderer"
import { buildCustomActionExecutionRequest } from "@/entrypoints/selection.content/selection-toolbar/custom-action-button/use-custom-action-execution"
import {
  createSelectionToolbarPrecheckError,
  createSelectionToolbarRuntimeError,
  isAbortError,
} from "@/entrypoints/selection.content/selection-toolbar/inline-error"
import { isLLMProviderConfig, isTranslateProviderConfig } from "@/types/config/provider"
import { configFieldsAtomMap } from "@/utils/atoms/config"
import { IS_SAFARI } from "@/utils/browser-env"
import { getProviderConfigById } from "@/utils/config/helpers"
import { streamBackgroundStructuredObject } from "@/utils/content-script/background-stream-client"
import { translateWithLlm, translateWithStandardProvider } from "@/utils/host/translate/selection-translate"
import { prepareTranslationText } from "@/utils/host/translate/text-preparation"
import { sendMessage } from "@/utils/message"
import { cn } from "@/utils/styles/utils"

/**
 * iOS-only popup card: shows the page's current text selection, its translation,
 * and the enabled custom actions (e.g. Dictionary).
 *
 * On iOS the in-page selection toolbar can't be used (Safari's native selection
 * callout always renders on top of web content), so selection translation surfaces
 * here in the popup instead. macOS keeps the in-page toolbar and never renders this.
 */
function useIsIosSelectionSurface() {
  const [isCoarsePointer, setIsCoarsePointer] = useState(false)
  useEffect(() => {
    setIsCoarsePointer(window.matchMedia?.("(pointer: coarse)")?.matches ?? false)
  }, [])
  return IS_SAFARI && isCoarsePointer
}

const TRANSLATE_ACTION_ID = "__translate__"

type ActiveActionId = typeof TRANSLATE_ACTION_ID | string

interface ActionBarItem {
  id: ActiveActionId
  name: string
  icon: "translate" | string
}

function ActionBar({
  items,
  activeId,
  onSelect,
}: {
  items: ActionBarItem[]
  activeId: ActiveActionId
  onSelect: (id: ActiveActionId) => void
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => {
        const isActive = item.id === activeId
        return (
          <button
            key={item.id}
            type="button"
            aria-label={item.name}
            aria-pressed={isActive}
            onClick={() => onSelect(item.id)}
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium cursor-pointer",
              isActive
                ? "border-primary/60 bg-primary/10 text-foreground"
                : "border-border/60 bg-background/60 text-muted-foreground hover:bg-accent",
            )}
          >
            {item.icon === "translate"
              ? <IconLanguage className="size-3.5 shrink-0" strokeWidth={1.6} />
              : <Icon icon={item.icon} className="size-3.5 shrink-0" strokeWidth={0.8} />}
            <span className="truncate max-w-28">{item.name}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Renders the result of the built-in Translate action (text / streaming / error). */
function TranslateResult({ selectionText }: { selectionText: string }) {
  const translateRequest = useAtomValue(selectionToolbarTranslateRequestAtom)
  const [translatedText, setTranslatedText] = useState<string | undefined>(undefined)
  const [thinking, setThinking] = useState<ThinkingSnapshot | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const runIdRef = useRef(0)

  useEffect(() => {
    const preparedText = prepareTranslationText(selectionText)
    if (preparedText === "") {
      return
    }

    const providerConfig = translateRequest.providerConfig
    if (!providerConfig || !isTranslateProviderConfig(providerConfig) || !providerConfig.enabled) {
      setIsTranslating(false)
      setThinking(null)
      setError(i18n.t("noAPIKeyConfig.warning"))
      return
    }

    const runId = runIdRef.current + 1
    runIdRef.current = runId
    let abortController: AbortController | null = null

    setIsTranslating(true)
    setTranslatedText(undefined)
    setThinking(null)
    setError(null)

    void (async () => {
      try {
        if (isLLMProviderConfig(providerConfig)) {
          setThinking({ status: "thinking", text: "" })
          const snapshot = await translateWithLlm({
            preparedText,
            providerConfig,
            translateRequest,
            includeWebPageContext: false,
            onChunk: (data) => {
              if (runIdRef.current === runId) {
                setTranslatedText(data.output)
                setThinking(data.thinking)
              }
            },
            registerAbortController: (controller) => {
              abortController = controller
            },
          })
          if (runIdRef.current === runId) {
            setTranslatedText(snapshot.output)
            setThinking(snapshot.thinking)
          }
        }
        else {
          setThinking(null)
          const nextTranslatedText = await translateWithStandardProvider({
            text: preparedText,
            providerConfig,
            translateRequest,
            includeWebPageContext: false,
          })
          if (runIdRef.current === runId) {
            setTranslatedText(nextTranslatedText)
          }
        }
      }
      catch (err) {
        if (runIdRef.current === runId && (err as Error)?.name !== "AbortError") {
          setThinking(prev => prev?.text ? { ...prev, status: "complete" } : null)
          setError((err as Error)?.message ?? String(err))
        }
      }
      finally {
        if (runIdRef.current === runId) {
          setIsTranslating(false)
        }
      }
    })()

    return () => {
      runIdRef.current += 1
      abortController?.abort()
    }
  }, [selectionText, translateRequest])

  const showLoadingIndicator = isTranslating && !thinking && !translatedText

  return (
    <>
      {thinking && (
        <Thinking status={thinking.status} content={thinking.text} className="mb-2" />
      )}
      {error
        ? <p className="text-destructive text-sm">{error}</p>
        : (
            <p className="text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {showLoadingIndicator && <IconLoader2 className="inline size-4 animate-spin" strokeWidth={1.6} />}
              {translatedText}
            </p>
          )}
    </>
  )
}

/**
 * Renders the result of a custom action (e.g. Dictionary). Custom actions require an
 * LLM provider; if the action's configured provider isn't a usable LLM we surface the
 * same precheck message the in-page toolbar shows instead of crashing.
 */
function CustomActionResult({
  action,
  selectionText,
}: {
  action: SelectionToolbarCustomAction
  selectionText: string
}) {
  const providersConfig = useAtomValue(configFieldsAtomMap.providersConfig)
  const language = useAtomValue(configFieldsAtomMap.language)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [thinking, setThinking] = useState<ThinkingSnapshot | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<SelectionToolbarInlineError | null>(null)

  // Resolve the action's LLM provider the same way the toolbar does.
  const providerConfig = useMemo(
    () => getProviderConfigById(providersConfig, action.providerId) ?? null,
    [providersConfig, action.providerId],
  )

  const precheckError = useMemo<SelectionToolbarInlineError | null>(() => {
    if (!providerConfig || !isLLMProviderConfig(providerConfig)) {
      return createSelectionToolbarPrecheckError("customAction", "providerUnavailable")
    }
    if (!providerConfig.enabled) {
      return createSelectionToolbarPrecheckError("customAction", "providerDisabled")
    }
    return null
  }, [providerConfig])

  // The popup has no page DOM, so build prompt tokens from the selection only.
  const executionContext = useMemo<CustomActionExecutionContext | null>(() => {
    if (!providerConfig || !isLLMProviderConfig(providerConfig) || !providerConfig.enabled) {
      return null
    }
    return {
      action,
      providerConfig,
      promptTokens: {
        selection: selectionText,
        paragraphs: selectionText,
        targetLanguage: LANG_CODE_TO_EN_NAME[language.targetCode],
        webTitle: "",
        webContent: "",
      },
    }
  }, [action, providerConfig, selectionText, language.targetCode])

  const executionRequest = useMemo(
    () => executionContext
      ? buildCustomActionExecutionRequest({
          executionContext,
          popoverSessionKey: 0,
          rerunNonce: 0,
        })
      : null,
    [executionContext],
  )
  const executionRequestKey = executionRequest?.key ?? null

  useEffect(() => {
    if (!executionRequest) {
      return
    }

    let isCancelled = false
    const abortController = new AbortController()

    setIsRunning(true)
    setResult(null)
    setError(null)
    setThinking({ status: "thinking", text: "" })

    void (async () => {
      try {
        const finalResult = await streamBackgroundStructuredObject(
          executionRequest.payload,
          {
            signal: abortController.signal,
            onChunk: (partial: BackgroundStructuredObjectStreamSnapshot) => {
              if (isCancelled) {
                return
              }
              setResult(partial.output)
              setThinking(partial.thinking)
            },
          },
        )
        if (!isCancelled) {
          setResult(finalResult.output)
          setThinking(finalResult.thinking)
        }
      }
      catch (err) {
        if (isCancelled || isAbortError(err)) {
          return
        }
        setThinking(prev => prev?.text ? { ...prev, status: "complete" } : null)
        setError(createSelectionToolbarRuntimeError("customAction", err))
      }
      finally {
        if (!isCancelled) {
          setIsRunning(false)
        }
      }
    })()

    return () => {
      isCancelled = true
      abortController.abort()
    }
    // executionRequestKey is derived from executionRequest, so it captures every input that should retrigger a run.
    // eslint-disable-next-line react/exhaustive-deps
  }, [executionRequestKey])

  const displayedError = error ?? precheckError
  if (displayedError) {
    return (
      <div>
        <p className="text-destructive text-sm font-medium">{displayedError.title}</p>
        <p className="text-destructive/80 text-sm">{displayedError.description}</p>
      </div>
    )
  }

  return (
    <StructuredObjectRenderer
      outputSchema={action.outputSchema}
      value={result}
      isStreaming={isRunning}
      thinking={thinking}
    />
  )
}

function SelectionTranslateCard() {
  const selectionToolbarConfig = useAtomValue(configFieldsAtomMap.selectionToolbar)
  const [selectionText, setSelectionText] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<ActiveActionId>(TRANSLATE_ACTION_ID)

  // Fetch the active selection from the content script once on mount.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true })
      const tabId = tabs[0]?.id
      if (tabId === undefined) {
        return
      }
      try {
        const text = await sendMessage("getActiveSelectionText", undefined, tabId)
        if (!cancelled) {
          setSelectionText(text?.trim() ? text : null)
        }
      }
      catch {
        // No content script on the active tab (e.g. extension/settings pages) — render nothing.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const customActions = useMemo(
    () => selectionToolbarConfig.customActions?.filter(action => action.enabled !== false) ?? [],
    [selectionToolbarConfig.customActions],
  )

  const items = useMemo<ActionBarItem[]>(() => [
    { id: TRANSLATE_ACTION_ID, name: i18n.t("popup.translate"), icon: "translate" },
    ...customActions.map(action => ({ id: action.id, name: action.name, icon: action.icon })),
  ], [customActions])

  const activeAction = activeId === TRANSLATE_ACTION_ID
    ? null
    : customActions.find(action => action.id === activeId) ?? null

  if (!selectionText) {
    return null
  }

  return (
    <div className="border-border/60 bg-muted/40 flex flex-col gap-2 rounded-md border p-3">
      <ActionBar items={items} activeId={activeId} onSelect={setActiveId} />
      <p className="text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-zinc-600 dark:text-zinc-400 line-clamp-3">
        {selectionText}
      </p>
      <div className="border-border/60 border-t pt-2">
        {activeAction
          ? <CustomActionResult key={activeAction.id} action={activeAction} selectionText={selectionText} />
          : <TranslateResult selectionText={selectionText} />}
      </div>
    </div>
  )
}

export function SelectionTranslate() {
  const isIosSelectionSurface = useIsIosSelectionSurface()
  if (!isIosSelectionSurface) {
    return null
  }
  return <SelectionTranslateCard />
}
