import { useTranslation } from "react-i18next";
import { PartnerEmbed } from "@/components/partner";
import { PartnerPage } from "@/components/partner/PartnerPage";

export default function PartnerEmbedPage() {
  const { t } = useTranslation();
  return (
    <PartnerPage
      width="focused"
      section={t("portal.embed.page.section")}
      title={t("portal.embed.page.title")}
      subtitle={t("portal.embed.page.subtitle")}
    >
      <PartnerEmbed />
    </PartnerPage>
  );
}
