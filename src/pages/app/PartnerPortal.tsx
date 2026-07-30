import { useTranslation } from "react-i18next";
import { PartnerConnectionPipe } from "@/components/partner";
import { PartnerEssentials, PartnerUsageInline } from "@/components/partner/PartnerEssentials";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { PARTNER_CANVAS } from "@/components/partner/PartnerPage";
import {
  usePartnerPortalLocale,
  type PartnerPortalLocale,
} from "@/components/partner/usePartnerPortalLocale";

/**
 * Portal do Parceiro = a home de 4 botões (redesign parceiro): saudação +
 * linha de uso discreta, cano de conexão no topo, os 4 essenciais com o
 * checklist absorvido como estado de cada botão, e o rodapé "Avançado".
 * O canvas off-white (#F6F6F2, tom da marca) é escopado a esta página via
 * bleed das margens do <main> — os cards brancos flutuam sobre ele.
 */
const LOCALES: PartnerPortalLocale[] = ["pt-BR", "en", "es"];

export default function PartnerPortal() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { locale, setLocale } = usePartnerPortalLocale();

  // Saudação por hora do dia, com o nome do workspace (ex.: "Bom dia, Gerbov").
  const hour = new Date().getHours();
  const greetingKey = hour < 12 ? "goodMorning" : hour < 18 ? "goodAfternoon" : "goodEvening";
  const name = user?.workspace_name && user.workspace_name !== "Workspace" ? user.workspace_name : null;

  return (
    <div className={PARTNER_CANVAS}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="section-label mb-1">{t("portal.portal.section")}</p>
              <h1 className="text-foreground">
                {name ? t(`portal.home.${greetingKey}`, { name }) : t("portal.portal.title")}
              </h1>
            </div>
            <div className="flex flex-col items-end gap-1.5 pt-1">
              {/* Toggle de idioma sem moldura — três letras bastam */}
              <div className="flex items-center gap-2 text-[11px]" role="group" aria-label="Idioma">
                {LOCALES.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLocale(l)}
                    aria-pressed={locale === l}
                    className={cn(
                      "uppercase tracking-wide transition-colors",
                      locale === l
                        ? "font-bold text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {l === "pt-BR" ? "PT" : l.toUpperCase()}
                  </button>
                ))}
              </div>
              <PartnerUsageInline />
            </div>
          </div>
        </div>

        {/* Cano de conexão: "meus dados já valem em algum circuito de destino?" */}
        <PartnerConnectionPipe />

        {/* Os 4 essenciais + rodapé Avançado */}
        <PartnerEssentials />
      </div>
    </div>
  );
}
