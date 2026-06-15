import { useTranslation } from "react-i18next";

// "Três primitivas, uma superfície".
// Originalidade: SEM ícone-lucide-em-chip-verde (tell de AI). A marca de cada
// primitiva é o NÚMERO grande em mono (fantasma, foreground/13%) — leitura de
// "razão/ledger". Grid com hairlines (gap-px sobre bg-border).
const ITEMS = [
  { n: "01", t: "home.prim.1t", d: "home.prim.1d" },
  { n: "02", t: "home.prim.2t", d: "home.prim.2d" },
  { n: "03", t: "home.prim.3t", d: "home.prim.3d" },
] as const;

export function PrimitivesSection() {
  const { t } = useTranslation();

  return (
    <section className="bg-muted/50 py-20 sm:py-24">
      <div className="section-container">
        <div className="mb-12 max-w-2xl">
          <div className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <span className="text-primary">§ 01</span>
            <span className="h-px w-6 bg-border" />
            {t("home.prim.eyebrow")}
          </div>
          <h2 className="mt-3 text-[30px] font-bold tracking-tight sm:text-[38px]" style={{ textWrap: "balance" }}>
            {t("home.prim.headline")}
          </h2>
          <p className="mt-3 text-[16px] text-muted-foreground" style={{ textWrap: "pretty" }}>
            {t("home.prim.desc")}
          </p>
        </div>

        <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
          {ITEMS.map(({ n, t: tt, d }) => (
            <div key={n} className="flex flex-col bg-card p-7">
              <div className="mb-7 flex items-baseline justify-between">
                <span className="font-mono font-medium leading-none tracking-tight text-foreground/[0.13] text-[46px]">
                  {n}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-primary">{t("home.prim.tag")}</span>
              </div>
              <h3 className="mb-2 text-[19px] font-semibold">{t(tt)}</h3>
              <p className="text-[14.5px] leading-relaxed text-muted-foreground">{t(d)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
