import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { PartnerConnectionPipe } from "@/components/partner";
import { PartnerEssentials, PartnerUsageInline } from "@/components/partner/PartnerEssentials";
import { Languages } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePartnerPortalLocale } from "@/components/partner/usePartnerPortalLocale";

/**
 * Portal do Parceiro = a home de 4 botões (fase 1 do redesign, fiel ao mock
 * "Home do Parceiro" do design system): saudação + linha de uso discreta,
 * cano de conexão no topo, os 4 essenciais (Minha chave / Enviar dados /
 * O que aconteceu / Minha vitrine) com o checklist absorvido como estado
 * de cada botão, e o rodapé "Avançado". O dashboard antigo (Saldo & status,
 * métricas, checklist) foi destilado nesses elementos.
 */
export default function PartnerPortal() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { locale, setLocale } = usePartnerPortalLocale();

  // Saudação por hora do dia, com o nome do workspace (mock: "Bom dia, Gerbov").
  const hour = new Date().getHours();
  const greetingKey = hour < 12 ? "goodMorning" : hour < 18 ? "goodAfternoon" : "goodEvening";
  const name = user?.workspace_name && user.workspace_name !== "Workspace" ? user.workspace_name : null;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <p className="section-label mb-1">{t("portal.portal.section")}</p>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-foreground">
            {name ? t(`portal.home.${greetingKey}`, { name }) : t("portal.portal.title")}
          </h1>
          <div className="flex flex-col items-end gap-1.5">
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
            <PartnerUsageInline />
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-lg">
          {t("portal.portal.subtitle")}
        </p>
      </div>

      {/* Cano de conexão: "meus dados já valem em algum circuito de destino?" */}
      <PartnerConnectionPipe />

      {/* Os 4 essenciais + rodapé Avançado */}
      <PartnerEssentials />
    </div>
  );
}
