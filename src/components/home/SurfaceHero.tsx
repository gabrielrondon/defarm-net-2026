import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Layers } from "lucide-react";
import { useTranslation } from "react-i18next";

// Hero da home: a tese de superfície do agro (#40). DeFarm = a camada onde
// qualquer item agrícola ganha identidade e prova pública; a cadeia bovina é a
// vertical-líder, com portas dedicadas (seção logo abaixo).
export function SurfaceHero() {
  const { t } = useTranslation();

  return (
    <section className="pt-32 pb-16">
      <div className="section-container">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-1.5 text-sm font-medium text-primary mb-6">
            <Layers className="h-4 w-4" />
            {t("home.hero.eyebrow")}
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold text-foreground tracking-tight mb-6">
            {t("home.hero.headline")}{" "}
            <span className="text-primary">{t("home.hero.highlight")}</span>.
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            {t("home.hero.description")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <a href="#personas">
                {t("home.hero.ctaPrimary")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#verificar">
                <ShieldCheck className="mr-2 h-4 w-4" />
                {t("home.hero.ctaSecondary")}
              </a>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-6">
            {t("home.hero.note")}
          </p>
        </div>
      </div>
    </section>
  );
}
