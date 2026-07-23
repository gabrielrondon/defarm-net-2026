import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { code: "pt-BR", label: "PT", title: "Mudar para Português" },
  { code: "en", label: "EN", title: "Switch to English" },
  { code: "es", label: "ES", title: "Cambiar a Español" },
] as const;

function normalizeLanguage(language?: string) {
  if (language?.startsWith("en")) return "en";
  if (language?.startsWith("es")) return "es";
  return "pt-BR";
}

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const current = normalizeLanguage(i18n.language);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 px-1 py-1 text-xs font-bold rounded-md",
        "border border-border hover:bg-muted transition-colors"
      )}
      aria-label="Selecionar idioma"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.code}
          type="button"
          onClick={() => void i18n.changeLanguage(option.code)}
          className={cn(
            "rounded px-1.5 py-0.5 transition-colors",
            current === option.code
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          title={option.title}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
