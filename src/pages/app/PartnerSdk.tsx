import { useTranslation } from "react-i18next";
import { PartnerSdkTools } from "@/components/partner";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FlaskConical } from "lucide-react";

export default function PartnerSdkPage() {
  const { t } = useTranslation();
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("portal.sdk.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("portal.sdk.subtitle")}
        </p>
      </div>
      <Card className="p-4 border-amber-300/50 bg-amber-50/60 dark:bg-amber-950/20">
        <div className="flex items-start gap-3">
          <FlaskConical className="h-4 w-4 mt-0.5 text-amber-700 dark:text-amber-300" />
          <div className="space-y-1">
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 border border-amber-300/60">{t("portal.common.beta")}</Badge>
            <p className="text-sm text-foreground">
              {t("portal.common.betaNote")}
            </p>
          </div>
        </div>
      </Card>
      <PartnerSdkTools />
    </div>
  );
}
