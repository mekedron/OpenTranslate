import { useAtom, useAtomValue } from "jotai"
import { useMemo } from "react"
import { i18n } from "#imports"
import { HelpTooltip } from "@/components/help-tooltip"
import ProviderSelector from "@/components/llm-providers/provider-selector"
import { isTranslateProvider } from "@/types/config/provider"
import { configFieldsAtomMap } from "@/utils/atoms/config"
import { filterEnabledProvidersConfig } from "@/utils/config/helpers"

export default function TranslateProviderField() {
  const [translateConfig, setTranslateConfig] = useAtom(configFieldsAtomMap.translate)
  const providersConfig = useAtomValue(configFieldsAtomMap.providersConfig)

  const providers = useMemo(() => {
    return filterEnabledProvidersConfig(providersConfig)
      .filter(p => isTranslateProvider(p.provider))
  }, [providersConfig])

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[13px] font-medium flex items-center gap-1.5">
        {i18n.t("translateService.title")}
        <HelpTooltip>
          {i18n.t("translateService.description")}
        </HelpTooltip>
      </span>
      <ProviderSelector
        providers={providers}
        value={translateConfig.providerId}
        onChange={id => void setTranslateConfig({ providerId: id })}
        className="h-7! w-31 cursor-pointer pr-1.5 pl-2.5"
        // Right-anchor the menu so it grows leftward into the popup instead of
        // overflowing past the right edge and stretching the page. This only
        // takes effect because the menu sizes to its content (w-fit) — Base UI
        // otherwise positions at the narrow trigger width and the menu expands
        // rightward off-screen regardless of align.
        selectContentProps={{ align: "end" }}
      />
    </div>
  )
}
