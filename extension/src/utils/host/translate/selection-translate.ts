import type { SelectionToolbarTranslateRequestSlice } from "@/entrypoints/selection.content/selection-toolbar/atoms"
import type { BackgroundTextStreamSnapshot } from "@/types/background-stream"
import type { LLMProviderConfig, ProviderConfig } from "@/types/config/provider"
import { LANG_CODE_TO_EN_NAME } from "@read-frog/definitions"
import { streamBackgroundText } from "@/utils/content-script/background-stream-client"
import { getTranslatePromptFromConfig } from "@/utils/prompts/translate"
import { resolveModelId } from "@/utils/providers/model-id"
import { getProviderOptionsWithOverride } from "@/utils/providers/options"
import { translateTextCore } from "./translate-text"
import { getOrCreateWebPageContext } from "./webpage-context"
import { getOrGenerateWebPageSummary } from "./webpage-summary"

/**
 * Build the webpage prompt context for selection translation.
 *
 * Only meaningful in a content script (has page DOM). Callers without a page DOM
 * (e.g. the extension popup) should not request it; this returns `undefined` when
 * there is no resolvable webpage context.
 */
export async function getSelectionWebPagePromptContext(
  providerConfig: ProviderConfig,
  enableAIContentAware: boolean,
) {
  const webPageContext = await getOrCreateWebPageContext()
  if (!webPageContext) {
    return undefined
  }

  const webSummary = await getOrGenerateWebPageSummary(webPageContext, providerConfig, enableAIContentAware)
  return {
    webTitle: webPageContext.webTitle,
    webDescription: webPageContext.webDescription,
    webContent: webPageContext.webContent,
    webSummary: webSummary ?? undefined,
  }
}

/**
 * Translate selected text with an LLM provider by streaming from the background.
 *
 * Works both from a content script and the popup (the background stream port is
 * available in any extension context). When `includeWebPageContext` is false
 * (popup — no page DOM), no webpage context is fetched or sent.
 */
export async function translateWithLlm({
  preparedText,
  providerConfig,
  translateRequest,
  onChunk,
  registerAbortController,
  includeWebPageContext = true,
}: {
  preparedText: string
  providerConfig: LLMProviderConfig
  translateRequest: SelectionToolbarTranslateRequestSlice
  onChunk: (data: BackgroundTextStreamSnapshot) => void
  registerAbortController: (abortController: AbortController) => void
  includeWebPageContext?: boolean
}) {
  const targetLangName = LANG_CODE_TO_EN_NAME[translateRequest.language.targetCode]
  const {
    id: providerId,
    provider,
    providerOptions: userProviderOptions,
    temperature,
  } = providerConfig
  const modelName = resolveModelId(providerConfig.model)
  const providerOptions = getProviderOptionsWithOverride(modelName ?? "", provider, userProviderOptions)
  const abortController = new AbortController()
  registerAbortController(abortController)

  const throwIfAborted = () => {
    if (abortController.signal.aborted) {
      throw new DOMException("aborted", "AbortError")
    }
  }

  const webPageContext = includeWebPageContext
    ? await getSelectionWebPagePromptContext(providerConfig, translateRequest.enableAIContentAware)
    : undefined
  throwIfAborted()
  const { systemPrompt, prompt } = getTranslatePromptFromConfig(
    { customPromptsConfig: translateRequest.customPromptsConfig },
    targetLangName,
    preparedText,
    webPageContext
      ? {
          context: {
            webTitle: webPageContext.webTitle,
            webDescription: webPageContext.webDescription,
            webContent: webPageContext.webContent,
            webSummary: webPageContext.webSummary,
          },
        }
      : undefined,
  )

  const translatedText = await streamBackgroundText(
    {
      providerId,
      system: systemPrompt,
      prompt,
      providerOptions,
      temperature,
    },
    {
      signal: abortController.signal,
      onChunk,
    },
  )

  return translatedText
}

/**
 * Translate selected text with a standard (non-LLM) translate provider.
 *
 * When `includeWebPageContext` is false (popup — no page DOM), no webpage context
 * is fetched or sent.
 */
export async function translateWithStandardProvider({
  text,
  providerConfig,
  translateRequest,
  includeWebPageContext = true,
}: {
  text: string
  providerConfig: ProviderConfig
  translateRequest: SelectionToolbarTranslateRequestSlice
  includeWebPageContext?: boolean
}) {
  const webPageContext = includeWebPageContext
    ? await getSelectionWebPagePromptContext(providerConfig, translateRequest.enableAIContentAware)
    : undefined
  const translatedText = await translateTextCore({
    text,
    langConfig: translateRequest.language,
    providerConfig,
    enableAIContentAware: translateRequest.enableAIContentAware,
    extraHashTags: ["selectionTranslation"],
    webPageContext,
  })

  return translatedText
}
