import { useTranslation } from "react-i18next";
import { PartnerSdkTools } from "@/components/partner";
import { PartnerPage } from "@/components/partner/PartnerPage";
import { Badge } from "@/components/ui/badge";

export default function PartnerSdkPage() {
  const { t } = useTranslation();
  return (
    <PartnerPage
      width="focused"
      section={t("portal.docs.section")}
      title={t("portal.sdk.title")}
      titleBadge={
        <Badge
          variant="secondary"
          className="bg-amber-100 text-amber-800 border border-amber-300/60 dark:bg-amber-950 dark:text-amber-300"
        >
          {t("portal.common.beta")}
        </Badge>
      }
      subtitle={t("portal.sdk.subtitle")}
    >
      <PartnerSdkTools />
    </PartnerPage>
  );
}
