import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export type PartnerPortalLocale = "pt-BR" | "en" | "es";

// Key legada do sistema de locale ad-hoc do portal (pré-unificação, 2026-07-07).
const LEGACY_STORAGE_KEY = "partner_portal_locale";
// Key do i18next-browser-languagedetector — agora a ÚNICA fonte de verdade do idioma.
const I18NEXT_STORAGE_KEY = "i18nextLng";

// Migração one-shot: quem já tinha escolhido EN/PT no portal antigo não pode perder a
// escolha ao unificar. Se a key legada existe e o i18next ainda não tem preferência
// explícita salva, semeia no i18next; depois apaga a legada. (plano-i18n-portal §5)
function migrateLegacyLocale(changeLanguage: (lng: string) => void) {
  if (typeof window === "undefined") return;
  const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacy) return;
  const alreadyChosen = window.localStorage.getItem(I18NEXT_STORAGE_KEY);
  if (!alreadyChosen && (legacy === "en" || legacy === "pt-BR" || legacy === "es")) {
    changeLanguage(legacy);
  }
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
}

// Hook de locale do portal, agora unificado no react-i18next (fonte de verdade única).
// Mantém a API {locale, setLocale} pra não quebrar os consumidores existentes, mas por
// baixo lê/escreve o mesmo idioma da landing: trocar aqui troca lá e vice-versa (um
// toggle só). Consumidores hoje: PartnerPortal, PartnerLogs, PartnerRoutingIssues.
export function usePartnerPortalLocale() {
  const { i18n } = useTranslation();

  useEffect(() => {
    migrateLegacyLocale((lng) => {
      void i18n.changeLanguage(lng);
    });
  }, [i18n]);

  const locale: PartnerPortalLocale = i18n.language?.startsWith("en")
    ? "en"
    : i18n.language?.startsWith("es")
      ? "es"
      : "pt-BR";
  const setLocale = (next: PartnerPortalLocale) => {
    void i18n.changeLanguage(next);
  };

  return { locale, setLocale };
}
