import { useTranslation } from "react-i18next";
import { PartnerEmbed } from "@/components/partner";

export default function PartnerEmbedPage() {
  const { t } = useTranslation();
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-1">{t("portal.embed.page.section")}</p>
        <h1 className="text-foreground">{t("portal.embed.page.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("portal.embed.page.subtitle")}
        </p>
      </div>
      <PartnerEmbed />
    </div>
  );
}
