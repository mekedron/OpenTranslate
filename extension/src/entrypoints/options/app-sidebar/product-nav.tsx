import { Icon } from "@iconify/react"
import { Link, useLocation } from "react-router"
import { i18n } from "#imports"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/base-ui/sidebar"
import { GITHUB_REPO_URL } from "@/utils/constants/app"

export function ProductNav() {
  const { pathname } = useLocation()
  const { isMobile, setOpenMobile } = useSidebar()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{i18n.t("options.sidebar.product")}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link to="/about" />} isActive={pathname === "/about"}>
              <Icon icon="tabler:info-circle" />
              <span>{i18n.t("options.about.title")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={(
                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  // External link opens a new tab without changing the route, so close
                  // the mobile sidebar sheet here (route-change close won't fire).
                  onClick={() => {
                    if (isMobile)
                      setOpenMobile(false)
                  }}
                />
              )}
            >
              <Icon icon="tabler:brand-github" />
              <span>{i18n.t("options.about.github")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
