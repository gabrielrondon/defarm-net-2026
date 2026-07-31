import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import es from "./locales/es.json";
import ptBR from "./locales/pt-BR.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      "pt-BR": { translation: ptBR },
    },
    fallbackLng: "pt-BR",
    supportedLngs: ["pt-BR", "en", "es"],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      // #18: público-alvo é o Brasil. Sem preferência salva -> PT-BR (fallbackLng),
      // não o idioma do navegador (que deixava as páginas públicas em inglês pra
      // quem tem o navegador em en-US). O toggle PT/EN/ES grava em localStorage e
      // persiste a escolha do visitante internacional.
      order: ["localStorage"],
      caches: ["localStorage"],
    },
  });

// QA F6: <html lang> deve refletir o idioma ativo (a11y + SEO). O i18next não
// faz isso sozinho.
if (typeof document !== "undefined") {
  document.documentElement.lang = i18n.language || "pt-BR";
  i18n.on("languageChanged", (lng) => {
    document.documentElement.lang = lng;
  });
}

export default i18n;
