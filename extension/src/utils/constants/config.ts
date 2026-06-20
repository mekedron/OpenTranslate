import type { Config } from "@/types/config/config"
import type { FloatingButtonSide } from "@/types/config/floating-button"
import type { SelectionToolbarCustomAction } from "@/types/config/selection-toolbar"
import type { PageTranslateRange } from "@/types/config/translate"
import { CUSTOM_ACTION_TEMPLATES } from "./custom-action-templates"
import { DEFAULT_TRANSLATE_PROMPTS_CONFIG } from "./prompt"
import { DEFAULT_PROVIDER_CONFIG_LIST } from "./providers"
import { DEFAULT_SELECTION_OVERLAY_OPACITY } from "./selection"
import { DEFAULT_SIDE_CONTENT_WIDTH } from "./side"
import { DEFAULT_AUTO_TRANSLATE_SHORTCUT_KEY, DEFAULT_BATCH_CONFIG, DEFAULT_MIN_CHARACTERS_PER_NODE, DEFAULT_MIN_WORDS_PER_NODE, DEFAULT_PRELOAD_MARGIN, DEFAULT_PRELOAD_THRESHOLD, DEFAULT_REQUEST_CAPACITY, DEFAULT_REQUEST_RATE, DEFAULT_SELECTION_TRANSLATION_SHORTCUT_KEY } from "./translate"
import { TRANSLATION_NODE_STYLE_ON_INSTALLED } from "./translation-node-style"

export const CONFIG_STORAGE_KEY = "config"

export const THEME_STORAGE_KEY = "theme"
export const DEFAULT_DETECTED_CODE = "eng" as const
export const CONFIG_SCHEMA_VERSION = 80

export const DEFAULT_FLOATING_BUTTON_POSITION = 0.66
export const DEFAULT_FLOATING_BUTTON_SIDE: FloatingButtonSide = "right"

function createDefaultDictionaryAction(): SelectionToolbarCustomAction | null {
  const template = CUSTOM_ACTION_TEMPLATES.find(t => t.id === "dictionary")
  if (!template)
    return null

  const action = template.createAction("openai-default")
  return {
    ...action,
    id: "default-dictionary",
    outputSchema: action.outputSchema.map(field => ({
      ...field,
      id: field.id.startsWith("dictionary-")
        ? `default-${field.id}`
        : `default-dictionary-${field.id}`,
    })),
  }
}

const defaultDictionaryAction = createDefaultDictionaryAction()

export const DEFAULT_CONFIG: Config = {
  language: {
    sourceCode: "auto",
    targetCode: "eng",
    level: "intermediate",
  },
  providersConfig: DEFAULT_PROVIDER_CONFIG_LIST,
  translate: {
    providerId: "microsoft-translate-default",
    mode: "bilingual",
    node: {
      enabled: false,
      hotkey: "control",
    },
    page: {
      range: "all",
      autoTranslatePatterns: ["news.ycombinator.com"],
      neverAutoTranslatePatterns: [],
      autoTranslateLanguages: [],
      shortcut: DEFAULT_AUTO_TRANSLATE_SHORTCUT_KEY,
      preload: {
        margin: DEFAULT_PRELOAD_MARGIN,
        threshold: DEFAULT_PRELOAD_THRESHOLD,
      },
      minCharactersPerNode: DEFAULT_MIN_CHARACTERS_PER_NODE,
      minWordsPerNode: DEFAULT_MIN_WORDS_PER_NODE,
      enableTargetLanguageSkip: true,
      skipLanguages: [],
    },
    enableAIContentAware: false,
    customPromptsConfig: DEFAULT_TRANSLATE_PROMPTS_CONFIG,
    requestQueueConfig: {
      capacity: DEFAULT_REQUEST_CAPACITY,
      rate: DEFAULT_REQUEST_RATE,
    },
    batchQueueConfig: {
      maxCharactersPerBatch: DEFAULT_BATCH_CONFIG.maxCharactersPerBatch,
      maxItemsPerBatch: DEFAULT_BATCH_CONFIG.maxItemsPerBatch,
    },
    translationNodeStyle: {
      preset: TRANSLATION_NODE_STYLE_ON_INSTALLED,
      isCustom: false,
      customCSS: null,
    },
  },
  languageDetection: {
    mode: "basic",
  },
  floatingButton: {
    enabled: true,
    position: DEFAULT_FLOATING_BUTTON_POSITION,
    side: DEFAULT_FLOATING_BUTTON_SIDE,
    disabledFloatingButtonPatterns: [],
    clickAction: "translate",
    locked: false,
  },
  selectionToolbar: {
    enabled: true,
    disabledSelectionToolbarPatterns: [],
    opacity: DEFAULT_SELECTION_OVERLAY_OPACITY,
    features: {
      translate: {
        enabled: true,
        providerId: "microsoft-translate-default",
        shortcut: DEFAULT_SELECTION_TRANSLATION_SHORTCUT_KEY,
      },
    },
    customActions: defaultDictionaryAction ? [defaultDictionaryAction] : [],
  },
  sideContent: {
    width: DEFAULT_SIDE_CONTENT_WIDTH,
  },
  betaExperience: {
    enabled: false,
  },
  contextMenu: {
    enabled: true,
  },
  inputTranslation: {
    enabled: true,
    providerId: "microsoft-translate-default",
    fromLang: "targetCode",
    toLang: "sourceCode",
    enableCycle: false,
    timeThreshold: 300,
  },
  siteControl: {
    mode: "blacklist",
    blacklistPatterns: [],
    whitelistPatterns: [],
  },
}

export const PAGE_TRANSLATE_RANGE_ITEMS: Record<
  PageTranslateRange,
  { label: string }
> = {
  main: { label: "Main" },
  all: { label: "All" },
}
