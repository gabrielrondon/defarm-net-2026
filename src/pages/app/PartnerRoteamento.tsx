import { useTranslation } from "react-i18next";
import { PartnerRouting } from "@/components/partner";
import { PartnerRoutingIssues } from "@/components/partner/PartnerRoutingIssues";

export default function PartnerRoteamento() {
  const { t } = useTranslation();
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-1">{t("portal.routing.header.section")}</p>
        <h1 className="text-foreground">{t("portal.routing.header.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("portal.routing.header.desc")}
        </p>
      </div>
      <PartnerRouting />
      <PartnerRoutingIssues />
    </div>
  );
}
