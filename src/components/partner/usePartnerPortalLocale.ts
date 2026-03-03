import { useEffect, useState } from "react";

export type PartnerPortalLocale = "pt-BR" | "en";

const STORAGE_KEY = "partner_portal_locale";

export function usePartnerPortalLocale() {
  const [locale, setLocale] = useState<PartnerPortalLocale>(() => {
    if (typeof window === "undefined") return "pt-BR";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "en" ? "en" : "pt-BR";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  return { locale, setLocale };
}

