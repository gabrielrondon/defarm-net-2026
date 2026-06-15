import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Layers } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProofSpecimen } from "./ProofSpecimen";

// Hero da home (redesign #40 — "Ledger"). Substitui o tique de "palavra em
// caixa verde" por ênfase tipográfica: a palavra-chave fica em text-primary,
// flat. Layout 2-col com o espécime de prova à direita (>= lg).
export function SurfaceHero() {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* motivo de grade (satélite/ledger), bem sutil, só no desktop */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 lg:block"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)/0.04) 1px,transparent 1px),linear-gradient(90deg,hsl(var(--foreground)/0.04) 1px,transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "linear-gradient(90deg,transparent,black 60%)",
          WebkitMaskImage: "linear-gradient(90deg,transparent,black 60%)",
        }}
      />
      <div className="section-container relative pt-20 pb-16 sm:pt-28 sm:pb-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5">
              <Layers className="h-4 w-4 text-primary" />
              <span className="text-[13px] font-medium text-primary">{t("home.hero.eyebrow")}</span>
            </div>

            <h1
              className="text-[40px] font-bold leading-[1.02] tracking-[-0.03em] sm:text-[58px] lg:text-[64px]"
              style={{ textWrap: "balance" }}
            >
              {t("home.hero.h_a")}
              <span className="text-primary">{t("home.hero.h_em")}</span>
              {t("home.hero.h_b")}
              <span className="text-primary">{t("home.hero.h_em2")}</span>
              {t("home.hero.h_c")}
            </h1>

            <p
              className="mt-6 max-w-xl text-[17px] leading-relaxed text-muted-foreground"
              style={{ textWrap: "pretty" }}
            >
              {t("home.hero.desc")}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
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

            <p className="mt-6 font-mono text-[12px] text-muted-foreground">{t("home.hero.note")}</p>
          </div>

          <div className="lg:pl-4">
            <ProofSpecimen />
          </div>
        </div>
      </div>
    </section>
  );
}
