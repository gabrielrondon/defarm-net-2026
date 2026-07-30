import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { PartnerConnectionPipe, PartnerOverview } from "@/components/partner";
import { PartnerUsageCard } from "@/components/partner/PartnerUsageCard";
import { Languages } from "lucide-react";
import { usePartnerPortalLocale } from "@/components/partner/usePartnerPortalLocale";

/**
 * Portal do Parceiro = dashboard (Visão Geral). Onda A: dissolvemos as abas
 * (Kit/Roteamento/Operações/Embed) — cada capacidade virou item do menu lateral,
 * agrupado em Operar/Catálogo/Integração/Config. Aqui mora só o "como estou indo":
 * Seu recebimento + uso/saldo + onboarding.
 */
export default function PartnerPortal() {
  const { t } = useTranslation();
  const { locale, setLocale } = usePartnerPortalLocale();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <p className="section-label mb-1">{t("portal.portal.section")}</p>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-foreground">{t("portal.portal.title")}</h1>
          <div className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/30 p-1">
            <Languages className="h-3.5 w-3.5 text-muted-foreground ml-1" />
            <Button
              size="sm"
              variant={locale === "pt-BR" ? "default" : "ghost"}
              className="h-6 px-2 text-[11px]"
              onClick={() => setLocale("pt-BR")}
            >
              PT
            </Button>
            <Button
              size="sm"
              variant={locale === "en" ? "default" : "ghost"}
              className="h-6 px-2 text-[11px]"
              onClick={() => setLocale("en")}
            >
              EN
            </Button>
            <Button
              size="sm"
              variant={locale === "es" ? "default" : "ghost"}
              className="h-6 px-2 text-[11px]"
              onClick={() => setLocale("es")}
            >
              ES
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-lg">
          {t("portal.portal.subtitle")}
        </p>
      </div>

      {/* Cano de conexão (fase 1 do redesign): "meus dados já valem em algum
          circuito de destino?" — o estado mais importante do portal, no topo. */}
      <PartnerConnectionPipe />

      <PartnerUsageCard />

      <div className="mt-8">
        <PartnerOverview />
      </div>
    </div>
  );
}
