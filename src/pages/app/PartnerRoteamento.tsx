import { useTranslation } from "react-i18next";
import { PartnerRouting } from "@/components/partner";
import { PartnerRoutingIssues } from "@/components/partner/PartnerRoutingIssues";
import { PartnerPage } from "@/components/partner/PartnerPage";

export default function PartnerRoteamento() {
  const { t } = useTranslation();
  return (
    <PartnerPage
      width="focused"
      section={t("portal.routing.header.section")}
      title={t("portal.routing.header.title")}
      subtitle={t("portal.routing.header.desc")}
    >
      <PartnerRouting />
      <PartnerRoutingIssues />
    </PartnerPage>
  );
}
