import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getNetworkStats } from "@/lib/api/products";

// "Como a prova se sustenta" — modelo de confiança pra quem precisa confiar
// (banco/auditor). 4 passos como timeline + 2 métricas VIVAS da rede.
// As métricas vêm do GET /api/stats (números reais, honestos); enquanto carrega
// ou se falhar, caem no fallback i18n (trust.m1_v/m2_v = números atuais reais).
const STEPS = ["s1", "s2", "s3", "s4"] as const;

export function TrustModel() {
  const { t, i18n } = useTranslation();
  const { data: stats } = useQuery({
    queryKey: ["network-stats"],
    queryFn: getNetworkStats,
    staleTime: 300_000,
    retry: 1,
  });

  const fmt = (n: number) => new Intl.NumberFormat(i18n.language || "pt-BR").format(n);
  const metrics = [
    { v: stats ? fmt(stats.dfids) : t("trust.m1_v"), l: t("trust.m1_l") },
    { v: stats ? fmt(stats.events) : t("trust.m2_v"), l: t("trust.m2_l") },
  ];

  return (
    <section className="py-20 sm:py-24">
      <div className="section-container grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <span className="text-primary">§ 02</span>
            <span className="h-px w-6 bg-border" />
            {t("trust.eyebrow")}
          </div>
          <h2 className="mt-3 text-[30px] font-bold tracking-tight sm:text-[38px]" style={{ textWrap: "balance" }}>
            {t("trust.headline")}
          </h2>
          <p className="mt-3 text-[16px] text-muted-foreground" style={{ textWrap: "pretty" }}>{t("trust.desc")}</p>

          <div className="mt-9 grid grid-cols-2 gap-4">
            {metrics.map((m) => (
              <div key={m.l} className="rounded-2xl border border-border bg-card p-5">
                <div className="metric-value text-[40px] leading-none text-primary">{m.v}</div>
                <div className="mt-2 text-[13px] text-muted-foreground">{m.l}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
            {t("trust.metrics_note")}
          </p>
        </div>

        <ol className="relative">
          <span className="absolute bottom-3 left-[15px] top-3 w-px bg-border" />
          {STEPS.map((s, i) => (
            <li key={s} className="relative flex gap-5 pb-7 last:pb-0">
              <span className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-background font-mono text-[12px] font-semibold text-primary">
                {i + 1}
              </span>
              <div className="pt-1">
                <h3 className="text-[17px] font-semibold">{t(`trust.${s}_t`)}</h3>
                <p className="mt-1 text-[14.5px] leading-relaxed text-muted-foreground">{t(`trust.${s}_d`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
