import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const isEn = !i18n.language?.startsWith("pt");

  const toggle = () => {
    i18n.changeLanguage(isEn ? "pt-BR" : "en");
  };

  return (
    <button
      onClick={toggle}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-md",
        "border border-border hover:bg-muted transition-colors"
      )}
      title={isEn ? "Mudar para Português" : "Switch to English"}
    >
      <span className={cn(!isEn && "text-primary")}>PT</span>
      <span className="text-muted-foreground">/</span>
      <span className={cn(isEn && "text-primary")}>EN</span>
    </button>
  );
}
