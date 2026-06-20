import type { APIProviderTypes } from "@/types/config/provider"
import ProviderIcon from "@/components/provider-icon"
import { useTheme } from "@/components/providers/theme-provider"
import { PROVIDER_ITEMS } from "@/utils/constants/providers"

export function ConfigHeader({ providerType }: { providerType: APIProviderTypes }) {
  const { theme } = useTheme()
  const { website, logo, name } = PROVIDER_ITEMS[providerType]

  const providerIcon = (
    <ProviderIcon
      logo={logo(theme)}
      name={name}
      size="base"
      className="group hover:cursor-pointer"
      textClassName="font-medium group-hover:text-link"
    />
  )

  return (
    <div className="flex items-start justify-between">
      {website
        ? (
            <a href={website} className="flex items-center gap-2" target="_blank" rel="noreferrer">
              {providerIcon}
            </a>
          )
        : providerIcon}
    </div>
  )
}
