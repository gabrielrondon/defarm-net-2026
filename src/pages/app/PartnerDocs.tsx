import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ExternalLink, BookOpen, FileText, Code } from "lucide-react";
import { PartnerPage } from "@/components/partner/PartnerPage";

const DOCS_URL = "https://docs.defarm.net";

const resources = [
  { titleKey: "portal.docs.integration.title", descKey: "portal.docs.integration.desc", href: `${DOCS_URL}/integration`, icon: BookOpen },
  { titleKey: "portal.docs.apiRef.title", descKey: "portal.docs.apiRef.desc", href: `${DOCS_URL}/api`, icon: Code },
  { titleKey: "portal.docs.formats.title", descKey: "portal.docs.formats.desc", href: `${DOCS_URL}/formats`, icon: FileText },
];

export default function PartnerDocs() {
  const { t } = useTranslation();
  return (
    <PartnerPage
      width="focused"
      section={t("portal.docs.section")}
      title={t("portal.docs.title")}
      subtitle={t("portal.docs.subtitle")}
    >
      <div className="space-y-3">
        {resources.map((r) => (
          <a
            key={r.titleKey}
            href={r.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-4 rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-colors group"
          >
            <r.icon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                {t(r.titleKey)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{t(r.descKey)}</p>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" />
          </a>
        ))}
      </div>

      <div className="pt-2">
        <Button variant="outline" size="sm" asChild>
          <a href={DOCS_URL} target="_blank" rel="noopener noreferrer">
            {t("portal.docs.openFull")}
            <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
          </a>
        </Button>
      </div>
    </PartnerPage>
  );
}
