import { useState } from "react";
import { Search, ArrowRight, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BandChip, bandOf, type Band } from "@/components/proof";
import { getScore } from "@/lib/api/products";

// Tela Score de crédito (Entrega B). Consome GET /api/score?dfid=|cpf=|ccir=
// (registryRequest, JWT). Pública: pra quem não está logado / DFID conhecido,
// cai no fixture-demo (showcase). Fixtures = exemplos reais do BRIEF §6.
type Factors = { items_count: number; attestations: number; seals: number; movements: number; avg_trust: number };
type ScoreData = { query_type: string; query_value: string; factors: Factors; score: number; band: Band; note: string };

const SCORE_FIXTURES: Record<string, ScoreData> = {
  "DFID-BEEF-BR-2026-001106-b0e4d7": { query_type: "dfid", query_value: "DFID-BEEF-BR-2026-001106-b0e4d7", factors: { items_count: 1, attestations: 2, seals: 1, movements: 0, avg_trust: 78 }, score: 61, band: "B", note: "Score sobre dados públicos. Modelo v1." },
  "DFID-BEEF-BR-2026-001119-b8a57a": { query_type: "dfid", query_value: "DFID-BEEF-BR-2026-001119-b8a57a", factors: { items_count: 1, attestations: 4, seals: 2, movements: 3, avg_trust: 88 }, score: 82, band: "A", note: "Score sobre dados públicos. Modelo v1." },
};

function normBand(band: string, score: number): Band {
  return band === "A" || band === "B" || band === "C" ? band : bandOf(score);
}

function ScoreGauge({ score }: { score: number }) {
  const r = 78, c = 2 * Math.PI * r, pct = Math.max(0, Math.min(100, score)) / 100;
  const band = bandOf(score);
  const col = band === "A" ? "hsl(var(--primary))" : band === "B" ? "hsl(var(--foreground))" : band === "C" ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))";
  return (
    <div className="relative grid place-items-center" style={{ width: 196, height: 196 }}>
      <svg width="196" height="196" viewBox="0 0 196 196" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="98" cy="98" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="12" />
        <circle cx="98" cy="98" r={r} fill="none" stroke={col} strokeWidth="12" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: "stroke-dashoffset .9s cubic-bezier(.2,.7,.2,1)" }} />
      </svg>
      <div className="metric-value absolute inset-0 grid place-items-center text-[64px] leading-none" style={{ color: col }}>{score}</div>
    </div>
  );
}

function FactorRow({ label, value, max, suffix, isPct }: { label: string; value: number; max?: number; suffix?: string; isPct?: boolean }) {
  const pct = isPct ? value : Math.min(100, (value / (max || 1)) * 100);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[14px] text-foreground">{label}</span>
        <span className="metric-value text-[16px]">{value}{suffix || ""}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: pct + "%", background: value === 0 ? "hsl(var(--border))" : "hsl(var(--primary))", transition: "width .8s cubic-bezier(.2,.7,.2,1)" }} />
      </div>
    </div>
  );
}

type State = "empty" | "loading" | "result" | "error";

export default function ScoreScreen() {
  const { t } = useTranslation();
  const TABS = ["dfid", "cpf", "ccir"] as const;
  const [tab, setTab] = useState<(typeof TABS)[number]>("dfid");
  const [val, setVal] = useState("DFID-BEEF-BR-2026-001106-b0e4d7");
  const [state, setState] = useState<State>("result");
  const [data, setData] = useState<ScoreData | null>(SCORE_FIXTURES["DFID-BEEF-BR-2026-001106-b0e4d7"]);

  async function lookup(q?: string) {
    const key = (q ?? val).trim();
    if (!key) return;
    setState("loading");
    try {
      const r = await getScore({ [tab]: key });
      setData({ query_type: r.query_type, query_value: r.query_value, factors: r.factors, score: r.score, band: normBand(r.band, r.score), note: r.note });
      setState("result");
    } catch {
      // sem token (visitante público) ou erro: cai no fixture-demo se conhecido.
      const fx = SCORE_FIXTURES[key];
      if (fx) { setData(fx); setState("result"); } else setState("error");
    }
  }

  const bandLabel: Record<Band, string> = {
    A: t("score.band_a_label"), B: t("score.band_b_label"), C: t("score.band_c_label"), "—": t("score.band_none_label"),
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="section-container max-w-5xl">
          <header className="mb-8">
            <div className="flex items-center gap-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-primary">
              <span className="h-px w-6 bg-primary/50" />{t("score.eyebrow")}
            </div>
            <h1 className="mt-3 text-[32px] font-bold tracking-tight sm:text-[40px]">{t("score.title")}</h1>
            <p className="mt-2 max-w-2xl text-[16px] text-muted-foreground" style={{ textWrap: "pretty" }}>{t("score.sub")}</p>
          </header>

          <div className="mb-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="mb-4 inline-flex rounded-lg border border-border p-1">
              {TABS.map((k) => (
                <button key={k} onClick={() => setTab(k)} className={"h-8 rounded-md px-3.5 font-mono text-[13px] font-medium transition-colors " + (tab === k ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>
                  {t(`score.tab_${k}`)}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
                <Input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && lookup()} placeholder={t(`score.placeholder_${tab}`)} className="h-12 pl-11 font-mono text-[13px]" />
              </div>
              <Button size="lg" onClick={() => lookup()}>{t("score.consult")}<ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
              <span className="font-mono">{t("score.try")}</span>
              {Object.keys(SCORE_FIXTURES).map((ex) => (
                <button key={ex} onClick={() => { setTab("dfid"); setVal(ex); lookup(ex); }} className="rounded-md bg-muted px-2 py-1 font-mono text-[11px] transition-colors hover:text-foreground">
                  …{ex.slice(-13)}
                </button>
              ))}
            </div>
          </div>

          {state === "loading" && (
            <div className="rounded-2xl border border-border bg-card p-14 text-center">
              <span className="inline-flex items-center gap-3 text-muted-foreground">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted" style={{ borderTopColor: "hsl(var(--primary))" }} />
                <span className="font-mono text-[13px]">{t("score.loading")}</span>
              </span>
            </div>
          )}
          {state === "error" && (
            <div className="rounded-2xl border p-14 text-center" style={{ borderColor: "hsl(var(--destructive) / 0.3)", background: "hsl(var(--destructive) / 0.04)" }}>
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl" style={{ background: "hsl(var(--destructive) / 0.12)", color: "hsl(var(--destructive))" }}><Lock className="h-[22px] w-[22px]" /></div>
              <h3 className="mb-1 text-[17px] font-semibold">{t("score.error_t")}</h3>
              <p className="mx-auto max-w-sm text-[14px] text-muted-foreground">{t("score.error_d")}</p>
            </div>
          )}
          {state === "result" && data && (
            <div className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
              <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-8 text-center">
                <div className="mb-4 flex w-full items-center justify-between">
                  <span className="section-label">{t("score.band")}</span>
                  <Badge variant="secondary">{data.query_type.toUpperCase()}</Badge>
                </div>
                <ScoreGauge score={data.score} />
                <div className="mt-1 font-mono text-[12px] text-muted-foreground">{t("score.of")}</div>
                <div className="mt-5 flex w-full justify-center"><BandChip band={data.band} label={bandLabel[data.band]} big /></div>
                <div className="mt-6 w-full rounded-xl p-3 text-left" style={{ background: "hsl(var(--muted) / 0.6)" }}>
                  <div className="mb-1 font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">{t("score.query")}</div>
                  <div className="break-all font-mono text-[12px]">{data.query_value}</div>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-8">
                <h3 className="mb-6 text-[18px] font-semibold">{t("score.factors_t")}</h3>
                <div className="space-y-5">
                  <FactorRow label={t("score.f_items")} value={data.factors.items_count} max={Math.max(10, data.factors.items_count)} />
                  <FactorRow label={t("score.f_attestations")} value={data.factors.attestations} max={Math.max(6, data.factors.attestations)} />
                  <FactorRow label={t("score.f_seals")} value={data.factors.seals} max={Math.max(4, data.factors.seals)} />
                  <FactorRow label={t("score.f_movements")} value={data.factors.movements} max={Math.max(6, data.factors.movements)} />
                  <hr className="border-dashed border-border" />
                  <FactorRow label={t("score.f_trust")} value={data.factors.avg_trust} isPct suffix="%" />
                </div>
                <div className="mt-7 rounded-xl p-3.5" style={{ background: "hsl(var(--muted) / 0.6)" }}>
                  <p className="text-[12.5px] leading-snug text-muted-foreground">{data.note}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
