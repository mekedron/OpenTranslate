import { IconSearch } from "@tabler/icons-react"
import { useSetAtom } from "jotai"
import { useEffect } from "react"
import { useLocation } from "react-router"
import { i18n } from "#imports"
import openTranslateLogo from "@/assets/icons/opentranslate.png"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/base-ui/input-group"
import { Kbd } from "@/components/ui/base-ui/kbd"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/base-ui/sidebar"
import { GITHUB_REPO_URL } from "@/utils/constants/app"
import { getCommandPaletteShortcutHint } from "@/utils/os"
import { commandPaletteOpenAtom } from "../command-palette/atoms"
import { ProductNav } from "./product-nav"
import { SettingsNav } from "./settings-nav"
import { ToolsNav } from "./tools-nav"

export function AppSidebar() {
  const setCommandPaletteOpen = useSetAtom(commandPaletteOpenAtom)
  const commandPaletteShortcutHint = getCommandPaletteShortcutHint()
  const { isMobile, setOpenMobile } = useSidebar()
  const { pathname } = useLocation()

  // On mobile the sidebar is an overlay sheet; selecting a nav item navigates but
  // leaves the sheet covering the page. Close it whenever the route changes.
  useEffect(() => {
    if (isMobile)
      setOpenMobile(false)
  }, [pathname, isMobile, setOpenMobile])

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="group-data-[state=expanded]:px-5 group-data-[state=expanded]:pt-4 transition-all">
        <a href={GITHUB_REPO_URL} className="flex items-center gap-2">
          <img src={openTranslateLogo} alt="Logo" className="h-8 w-8 shrink-0" />
          <span className="text-md font-bold overflow-hidden truncate">{i18n.t("name")}</span>
        </a>
        <InputGroup
          onClick={() => setCommandPaletteOpen(true)}
          className="bg-background"
        >
          <InputGroupInput
            readOnly
            placeholder={i18n.t("options.commandPalette.placeholder")}
            className="cursor-pointer"
          />
          <InputGroupAddon>
            <IconSearch className="size-4 text-muted-foreground group-data-[state=collapsed]:-mx-px" />
          </InputGroupAddon>
          <InputGroupAddon
            align="inline-end"
            className="group-data-[state=collapsed]:hidden"
          >
            <Kbd>{commandPaletteShortcutHint}</Kbd>
          </InputGroupAddon>
        </InputGroup>
      </SidebarHeader>
      <SidebarContent className="group-data-[state=expanded]:px-2 transition-all">
        <SettingsNav />
        <ToolsNav />
        <ProductNav />
      </SidebarContent>
    </Sidebar>
  )
}
