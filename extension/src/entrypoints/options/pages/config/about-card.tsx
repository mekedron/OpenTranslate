import { i18n } from "#imports"
import { ConfigCard } from "../../components/config-card"

export function AboutCard() {
  return (
    <ConfigCard
      id="about"
      title={i18n.t("options.config.about.title")}
      description={i18n.t("options.config.about.description")}
    >
      <p className="max-w-xl text-sm text-muted-foreground">
        {i18n.t("options.config.about.mission")}
      </p>
    </ConfigCard>
  )
}
