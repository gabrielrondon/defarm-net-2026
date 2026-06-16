import { ArrowRight, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ProofSpecimen } from "./ProofSpecimen";

// Hero da home (redesign "Ledger" v2). Layout 2-col: tese à esquerda + o
// ESPÉCIME DE PROVA rotativo à direita (os cards que trocam a cada ~4.2s,
// multi-cadeia). Ênfase tipográfica (palavra em text-primary flat) + trilho de
// cadeias (agro ≠ só boi: bovinos ativa; soja/café/algodão na mesma superfície).

function ValueChains() {
  const { t } = useTranslation();
  const chains = [
    { key: "beef", live: true },
    { key: "soy" },
    { key: "coffee" },
    { key: "cotton" },
  ];
  return (
    <div className="mt-9">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {t("home.hero.chains_label")}
      </span>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {chains.map((c) => (
          <span
            key={c.key}
            className={
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[12px] " +
              (c.live ? "border-primary/40 bg-primary/[0.06] text-foreground" : "border-border text-muted-foreground")
            }
          >
            {c.live && <span className="h-1.5 w-1.5 rounded-[2px] bg-primary" />}
            {t(`home.hero.chain_${c.key}`)}
            {c.live && <span className="lowercase text-primary">{t("home.hero.chains_live")}</span>}
          </span>
        ))}
        <span className="px-1 font-mono text-[12px] text-muted-foreground/70">{t("home.hero.chains_more")}</span>
      </div>
    </div>
  );
}

export function SurfaceHero() {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* motivo de grade (satélite/ledger), sutil, só no desktop */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 lg:block"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)/0.04) 1px,transparent 1px),linear-gradient(90deg,hsl(var(--foreground)/0.04) 1px,transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "linear-gradient(90deg,transparent,black 55%)",
          WebkitMaskImage: "linear-gradient(90deg,transparent,black 55%)",
        }}
      />
      <div className="section-container relative pt-20 pb-16 sm:pt-28 sm:pb-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-primary">
              <span className="h-px w-6 bg-primary/50" />
              {t("home.hero.eyebrow")}
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

            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-muted-foreground" style={{ textWrap: "pretty" }}>
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

            <ValueChains />

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
