import { Icon } from "@iconify/react"
import { i18n } from "#imports"
import openTranslateLogo from "@/assets/icons/opentranslate.png"
import { buttonVariants } from "@/components/ui/base-ui/button"
import { EXTENSION_VERSION, GITHUB_REPO_URL } from "@/utils/constants/app"
import { ConfigCard } from "../../components/config-card"
import { PageLayout } from "../../components/page-layout"

export function AboutPage() {
  return (
    <PageLayout title={i18n.t("options.about.title")}>
      <ConfigCard
        id="about"
        title={i18n.t("options.about.title")}
        description={i18n.t("options.about.description")}
      >
        <div className="flex max-w-xl flex-col gap-4">
          <div className="flex items-center gap-3">
            <img
              src={openTranslateLogo}
              alt={i18n.t("name")}
              className="h-10 w-10 shrink-0 rounded-md"
            />
            <div className="flex flex-col">
              <span className="font-semibold">{i18n.t("name")}</span>
              <span className="text-xs text-muted-foreground">{`v${EXTENSION_VERSION}`}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {i18n.t("options.about.tagline")}
          </p>
          <p className="text-xs text-muted-foreground">
            {i18n.t("options.about.openSource")}
          </p>
          <div>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline" })}
            >
              <Icon icon="tabler:brand-github" />
              {i18n.t("options.about.viewOnGithub")}
            </a>
          </div>
        </div>
      </ConfigCard>
    </PageLayout>
  )
}
