import type { Config } from "@/types/config/config"
import { describe, expect, it } from "vitest"
import { getTranslatePromptFromConfig } from "../translate"

describe("translate prompt tokens", () => {
  it("replaces new translate prompt tokens from config", () => {
    const config: Pick<Config["translate"], "customPromptsConfig"> = {
      customPromptsConfig: {
        promptId: "custom-prompt",
        patterns: [
          {
            id: "custom-prompt",
            name: "Custom",
            systemPrompt: "Target {{targetLanguage}} | Title {{webTitle}} | Description {{webDescription}} | Content {{webContent}} | Summary {{webSummary}}",
            prompt: "Translate {{input}} for {{targetLanguage}} with {{webTitle}} / {{webDescription}} / {{webContent}} / {{webSummary}}",
          },
        ],
      },
    }

    const result = getTranslatePromptFromConfig(config, "English", "Hola", {
      context: {
        webTitle: "Article Title",
        webDescription: "Article Description",
        webContent: "Article Content",
        webSummary: "Article Summary",
      },
    })

    expect(result.systemPrompt).toBe("Target English | Title Article Title | Description Article Description | Content Article Content | Summary Article Summary")
    expect(result.prompt).toBe("Translate Hola for English with Article Title / Article Description / Article Content / Article Summary")
  })

  it("does not replace legacy translate prompt tokens at runtime", () => {
    const config: Pick<Config["translate"], "customPromptsConfig"> = {
      customPromptsConfig: {
        promptId: "legacy-prompt",
        patterns: [
          {
            id: "legacy-prompt",
            name: "Legacy",
            systemPrompt: "Legacy {{targetLang}} {{title}} {{summary}}",
            prompt: "Translate {{input}} to {{targetLang}}",
          },
        ],
      },
    }

    const result = getTranslatePromptFromConfig(config, "English", "Hola", {
      context: {
        webTitle: "Article Title",
        webDescription: "Article Description",
        webSummary: "Article Summary",
      },
    })

    expect(result.systemPrompt).toBe("Legacy {{targetLang}} {{title}} {{summary}}")
    expect(result.prompt).toBe("Translate Hola to {{targetLang}}")
  })
})
