import { useTranslation, Trans } from "react-i18next";
import { PartnerKit } from "@/components/partner";
import { PartnerPage } from "@/components/partner/PartnerPage";

export default function PartnerKitPage() {
  const { t } = useTranslation();
  return (
    <PartnerPage
      section={t("portal.docs.section")}
      title={t("portal.kit.title")}
      subtitle={
        <Trans
          i18nKey="portal.kit.intro"
          components={{ code: <code className="text-xs bg-muted px-1 py-0.5 rounded" /> }}
        />
      }
    >
      <PartnerKit hideHeader />
    </PartnerPage>
  );
}
