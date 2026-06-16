import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { getNetworkStats } from "@/lib/api/products";

// Lote D — /sobre (institucional) no estilo "Ledger".
// Reconta a tese: superfície de prova → 3 primitivas → janelas regulatórias.
// Reusa as chaves home.prim.* já existentes no repo. i18n: about.* (pages.i18n.json).
// Stats: substituem a faixa verde berrante por grid de hairlines com números display.

function SectionLabel({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
      <span className="text-primary">{n}</span>
      <span className="h-px w-6 bg-border" />
      {children}
    </div>
  );
}

const GRID_MOTIF: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(hsl(var(--foreground)/0.04) 1px,transparent 1px),linear-gradient(90deg,hsl(var(--foreground)/0.04) 1px,transparent 1px)",
  backgroundSize: "28px 28px",
};

export default function Sobre() {
  const { t, i18n } = useTranslation();
  // Mesmas métricas VIVAS da home (TrustModel): GET /api/stats. Só 2 (DFIDs +
  // Eventos). Fallback nas chaves trust.m1_v/m2_v enquanto carrega/se falhar.
  const { data: netStats } = useQuery({
    queryKey: ["network-stats"],
    queryFn: getNetworkStats,
    staleTime: 300_000,
    retry: 1,
  });
  const fmt = (n: number) => new Intl.NumberFormat(i18n.language || "pt-BR").format(n);
  const stats: [string, string][] = [
    [netStats ? fmt(netStats.dfids) : t("trust.m1_v"), "trust.m1_l"],
    [netStats ? fmt(netStats.events) : t("trust.m2_v"), "trust.m2_l"],
  ];
  const prims = [
    ["01", "home.prim.1t", "home.prim.1d"],
    ["02", "home.prim.2t", "home.prim.2d"],
    ["03", "home.prim.3t", "home.prim.3d"],
  ];
  const wins = [
    ["EUDR", "about.win1_d"],
    ["China & Halal", "about.win2_d"],
    [t("about.win3_name"), "about.win3_d"],
  ];
  const vals = [
    ["01", "about.v1_t", "about.v1_d"],
    ["02", "about.v2_t", "about.v2_d"],
    ["03", "about.v3_t", "about.v3_d"],
    ["04", "about.v4_t", "about.v4_d"],
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* header */}
        <section className="relative overflow-hidden border-b border-border">
          <div
            className="pointer-events-none absolute inset-0 hidden lg:block"
            style={{ ...GRID_MOTIF, maskImage: "radial-gradient(circle at 50% 0%, black, transparent 65%)", WebkitMaskImage: "radial-gradient(circle at 50% 0%, black, transparent 65%)" }}
          />
          <div className="section-container relative py-16 text-center sm:py-24">
            <div className="inline-flex items-center gap-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-primary">
              <span className="h-px w-5 bg-primary/40" />
              {t("about.eyebrow")}
              <span className="h-px w-5 bg-primary/40" />
            </div>
            <h1 className="mx-auto mt-4 max-w-3xl text-[36px] font-bold leading-[1.02] tracking-[-0.03em] sm:text-[52px]" style={{ textWrap: "balance" }}>
              {t("about.title_a")}
              <span className="text-primary">{t("about.title_em")}</span>
              {t("about.title_b")}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[17px] text-muted-foreground" style={{ textWrap: "pretty" }}>
              {t("about.sub")}
            </p>
          </div>
        </section>

        {/* tese */}
        <section className="py-16 sm:py-20">
          <div className="section-container max-w-3xl space-y-5 text-[17px] leading-relaxed text-foreground/85">
            <p>{t("about.p1")}</p>
            <p>{t("about.p2")}</p>
          </div>
        </section>

        {/* stats — métricas vivas da rede (mesmas da home) */}
        <section className="pb-4">
          <div className="section-container">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {stats.map(([v, l]) => (
                <div key={l} className="rounded-2xl border border-border bg-card p-7">
                  <div className="metric-value text-[44px] leading-none text-primary">{v}</div>
                  <div className="mt-2 text-[13px] text-muted-foreground">{t(l)}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
              {t("trust.metrics_note")}
            </p>
          </div>
        </section>

        {/* primitivas */}
        <section className="py-16 sm:py-20">
          <div className="section-container">
            <div className="mb-10 max-w-2xl">
              <SectionLabel n="§ 01">{t("home.prim.eyebrow")}</SectionLabel>
              <h2 className="mt-3 text-[28px] font-bold tracking-tight sm:text-[36px]" style={{ textWrap: "balance" }}>
                {t("home.prim.headline")}
              </h2>
            </div>
            <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
              {prims.map(([n, tt, d]) => (
                <div key={n} className="bg-card p-7">
                  <div className="font-display text-[34px] font-bold leading-none text-foreground/15">{n}</div>
                  <h3 className="mt-5 text-[18px] font-semibold">{t(tt)}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{t(d)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* janelas regulatórias */}
        <section className="bg-muted/50 py-16 sm:py-20">
          <div className="section-container">
            <div className="mb-10 max-w-2xl">
              <SectionLabel n="§ 02">{t("about.win_eyebrow")}</SectionLabel>
              <h2 className="mt-3 text-[28px] font-bold tracking-tight sm:text-[36px]" style={{ textWrap: "balance" }}>
                {t("about.win_title")}
              </h2>
              <p className="mt-3 text-[16px] text-muted-foreground" style={{ textWrap: "pretty" }}>
                {t("about.win_sub")}
              </p>
            </div>
            <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
              {wins.map(([name, d]) => (
                <div key={name} className="bg-card p-7">
                  <div className="font-mono text-[13px] font-semibold tracking-[0.06em] text-primary">{name}</div>
                  <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">{t(d)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* valores */}
        <section className="py-16 sm:py-20">
          <div className="section-container">
            <div className="mb-10 max-w-2xl">
              <SectionLabel n="§ 03">{t("about.values_eyebrow")}</SectionLabel>
              <h2 className="mt-3 text-[28px] font-bold tracking-tight sm:text-[36px]" style={{ textWrap: "balance" }}>
                {t("about.values_title")}
              </h2>
            </div>
            <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
              {vals.map(([n, tt, d]) => (
                <div key={n} className="bg-card p-6">
                  <div className="font-mono text-[11px] text-muted-foreground">{n}</div>
                  <h3 className="mt-3 text-[16px] font-semibold">{t(tt)}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{t(d)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* cta */}
        <section className="pb-20 sm:pb-28">
          <div className="section-container">
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-10 text-center sm:p-14">
              <div
                className="pointer-events-none absolute inset-0"
                style={{ ...GRID_MOTIF, maskImage: "radial-gradient(circle at 50% 0%, black, transparent 70%)", WebkitMaskImage: "radial-gradient(circle at 50% 0%, black, transparent 70%)" }}
              />
              <div className="relative mx-auto max-w-2xl">
                <h2 className="text-[28px] font-bold tracking-tight sm:text-[38px]" style={{ textWrap: "balance" }}>
                  {t("about.cta_title")}
                </h2>
                <p className="mt-3 text-[16px] text-muted-foreground" style={{ textWrap: "pretty" }}>
                  {t("about.cta_sub")}
                </p>
                <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                  <Button asChild size="lg">
                    <Link to="/cadastro">
                      {t("about.cta_primary")} <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="lg">
                    <Link to="/contato">{t("about.cta_secondary")}</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
