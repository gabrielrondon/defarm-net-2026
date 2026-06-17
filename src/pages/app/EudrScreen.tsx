import { useEffect, useState } from "react";
import { FileText, Search, Lock, ArrowRight, ShieldCheck, Loader2, AlertTriangle, History } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AnchorStatus, PolygonMap, anchorStateOf } from "@/components/proof";
import { PropertyMap } from "@/components/onboarding/PropertyMap";
import { getCarGeoJSON, type CarGeoJSON } from "@/lib/check-api/car";
import { emitEudr, listEudrEmissions, getEudrEmission, getPartnerUsage, type EudrStatement, type EudrEmissionSummary } from "@/lib/api/products";
import { EudrVerifyShare } from "@/components/EudrVerifyShare";

// Tela "Declaração de Due Diligence (EUDR)" — VITRINE GATED. Por decisão de
// produto (e §6.4 do paper EUDR), defarm.net/eudr é demonstração: mostra o
// trilho de evidências como exemplo e, em QUALQUER ação, abre um popup que
// redireciona pro contato. A geração real (assinada + ancorada) roda na DeFarm
// Check (API / check.defarm.net). Honestidade: o trilho exibido é demonstração,
// rotulado como tal; o estado da âncora respeita anchor_status.
const DEMO_DFID = "DFID-BEEF-BR-2026-001119-b8a57a";
const DEMO: EudrStatement = {
  dfid: DEMO_DFID,
  identity: { value_chain: "BEEF", country: "BR", year: 2026, status: "active" },
  origin: [
    {
      car: "MS-5002704-DEMOEUDR8F3A2C1B9E7D",
      compliance: { status: "ok", score: 96 },
      polygon: null,
      polygon_source: "sicar",
      area_ha: 1247.5,
    },
  ],
  operator: { identifier_type: "cnpj", identifier: "00.000.000/0001-00", role: "operator" },
  due_diligence: [
    {
      identifier_type: "CAR",
      identifier: "MS-5002704-DEMOEUDR8F3A2C1B9E7D",
      verdict: "COMPLIANT",
      score: 96,
      queried_at: "2026-06-15T14:02:00Z",
      error: null,
      checks: [
        { source: "SICAR", category: "Cadastro Ambiental", status: "PASS", severity: "LOW", message: "Polígono georreferenciado válido", data_source: "SICAR", url: null, last_update: "2026-05" },
        { source: "PRODES / DETER", category: "Desmatamento", status: "PASS", severity: "LOW", message: "Sem alerta de desmate pós 31/12/2020", data_source: "INPE", url: null, last_update: "2026-05" },
        { source: "IBAMA Embargos", category: "Embargo ambiental", status: "PASS", severity: "LOW", message: "Sem ocorrência de embargo", data_source: "IBAMA", url: null, last_update: "2026-06" },
        { source: "FUNAI + ICMBio", category: "Sobreposição TI / UC", status: "PASS", severity: "LOW", message: "Sem sobreposição com terra indígena ou unidade de conservação", data_source: "FUNAI/ICMBio", url: null, last_update: "2026-04" },
      ],
    },
    {
      identifier_type: "CNPJ",
      identifier: "00.000.000/0001-00",
      verdict: "COMPLIANT",
      score: 100,
      queried_at: "2026-06-15T14:02:00Z",
      error: null,
      checks: [
        { source: "Lista Suja MTE", category: "Trabalho análogo a escravo", status: "PASS", severity: "LOW", message: "Operador sem ocorrência na Lista Suja", data_source: "MTE", url: null, last_update: "2026-04" },
      ],
    },
  ],
  due_diligence_available: true,
  due_diligence_note: "",
  immutability: {
    latest_cid: "Qmc2Tf9aZ8r4Lh1WkPqN3oVbXyJ7sD6eU5tH0mGc",
    anchor_tx: "abc7f1e9d4c2b8a6f0e3d1c9b7a5f2e8d6c4b2a0",
    anchor_status: "confirmed",
    chain: "stellar",
  },
  eudr_ready: true,
  generated_at: "2026-06-15T14:02:00Z",
  note: "",
};

function statusTone(s: string): { color: string; bg: string } {
  const u = (s || "").toUpperCase();
  if (["PASS", "COMPLIANT", "OK"].includes(u)) return { color: "hsl(var(--primary-deep))", bg: "hsl(var(--primary) / 0.12)" };
  if (["FAIL", "NON_COMPLIANT"].includes(u)) return { color: "hsl(var(--destructive))", bg: "hsl(var(--destructive) / 0.1)" };
  if (["WARNING", "PARTIAL"].includes(u)) return { color: "hsl(38 92% 38%)", bg: "hsl(38 92% 50% / 0.13)" };
  return { color: "hsl(var(--muted-foreground))", bg: "hsl(var(--muted) / 0.7)" };
}

// Defesa no front: o backend já mascara o CNPJ/CPF do operador, mas se algum dia
// vier cru, mascara aqui também (não vaza identificador sensível). Idempotente.
function ddIdDisplay(type: string, id: string): string {
  const sensitive = type === "CNPJ" || type === "CPF";
  if (!sensitive || id.includes("•")) return id;
  const t = id.trim();
  return t.length <= 5 ? t : `•••• ${t.slice(-5)}`;
}

function KV({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <span className="shrink-0 text-[13px] text-muted-foreground">{k}</span>
      <span className={"break-all text-right text-[14px] font-medium " + (mono ? "font-mono text-[13px]" : "")}>{v}</span>
    </div>
  );
}

export default function EudrScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [gateOpen, setGateOpen] = useState(false);
  const [gateReason, setGateReason] = useState<"demo" | "credits">("demo");
  // Anônimo: demonstração (DEMO) + qualquer ação abre o gate de contato.
  // Logado: emite a DDS real (POST /eudr/emit, consome créditos); ao emitir, o
  // statement real substitui o DEMO. Sem saldo → gate "precisa de créditos".
  const { toast } = useToast();
  const [stmt, setStmt] = useState<EudrStatement>(DEMO);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"demo" | "emitted" | "consulted">("demo");
  const [emitInfo, setEmitInfo] = useState<{ charged: number; balance: number | null } | null>(null);
  const [consultAt, setConsultAt] = useState<string | null>(null);
  const [emissions, setEmissions] = useState<EudrEmissionSummary[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [mapGeo, setMapGeo] = useState<CarGeoJSON | null>(null);

  const loadEmissions = () => {
    if (!isAuthenticated) return;
    listEudrEmissions().then(setEmissions).catch(() => {});
    getPartnerUsage().then((u) => setBalance(u.balance_remaining)).catch(() => {});
  };
  useEffect(loadEmissions, [isAuthenticated]);

  // Mapa REAL do polígono (satélite + CAR via /car/:car/geojson), como em /i/:dfid.
  // Busca pro CAR de origem do statement; se não resolver, cai no placeholder.
  const originCar = stmt.origin[0]?.car;
  useEffect(() => {
    setMapGeo(null);
    // Só busca o mapa real de uma DDS REAL (emitida/consultada). No demo/estado
    // vazio o CAR é fake/inexistente → evita 404 e chamada inútil à Check a cada load.
    if (!originCar || (view !== "emitted" && view !== "consulted")) return;
    let cancelled = false;
    getCarGeoJSON(originCar, { skipAuth: true })
      .then((g) => { if (!cancelled) setMapGeo(g); })
      .catch(() => { /* CAR sem geometria → placeholder */ });
    return () => { cancelled = true; };
  }, [originCar, view]);

  const openGate = (reason: "demo" | "credits" = "demo") => {
    setGateReason(reason);
    setGateOpen(true);
  };
  const emit = async () => {
    const v = input.trim();
    if (!v) return;
    setLoading(true);
    try {
      const r = await emitEudr(v);
      if (r.emitted && r.statement) {
        setStmt(r.statement);
        setEmitInfo({ charged: r.charged_credits, balance: r.balance_remaining });
        setConsultAt(null);
        setView("emitted");
        loadEmissions();
      } else {
        // sem saldo / não provisionado → funil de créditos (#52: só este caso)
        openGate("credits");
      }
    } catch {
      // erro de servidor/rede ≠ falta de crédito (#52)
      toast({ title: t("eudr.emit_error"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  // Consultar uma DDS já emitida (grátis) — fase 2.
  const consult = async (id: string) => {
    setLoading(true);
    try {
      const d = await getEudrEmission(id);
      setStmt(d.statement);
      setEmitInfo(null);
      setConsultAt(d.emitted_at);
      setView("consulted");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      toast({ title: t("eudr.consult_error"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  const hasReal = view === "emitted" || view === "consulted";
  const loggedEmpty = isAuthenticated && !hasReal; // logado, nada emitido/consultado → estado vazio
  const showDemo = !isAuthenticated; // anônimo = vitrine demo (fixture + selo + gate de contato)
  const incomplete = hasReal && !stmt.eudr_ready; // #51: emitida mas sem origem/operador resolvidos

  const o = stmt.origin[0];
  const anchor = anchorStateOf(stmt.immutability.anchor_status);
  const complianceOk = o?.compliance?.status === "ok";
  const ring = o?.polygon?.coordinates?.[0] as [number, number][] | undefined;
  const generatedAt = (stmt.generated_at || "").replace("T", " ").slice(0, 16) + "Z";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="section-container max-w-5xl">
          <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-primary">
                <span className="h-px w-6 bg-primary/50" />
                {t("eudr.eyebrow")}
              </div>
              <h1 className="mt-3 text-[32px] font-bold tracking-tight sm:text-[40px]">{t("eudr.title")}</h1>
              <p className="mt-2 max-w-2xl text-[16px] text-muted-foreground" style={{ textWrap: "pretty" }}>{t("eudr.sub")}</p>
            </div>
            <div className="flex flex-col items-end gap-3">
              {showDemo && (
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.1em]" style={{ background: "hsl(var(--muted) / 0.7)", color: "hsl(var(--muted-foreground))" }}>
                  {t("eudr.demo_tag")}
                </span>
              )}
              {(showDemo || hasReal) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => (showDemo ? openGate("demo") : toast({ title: t("eudr.export_soon") }))}
                >
                  <FileText className="mr-1.5 h-[15px] w-[15px]" />
                  {t("eudr.export")}
                </Button>
              )}
            </div>
          </header>

          {/* Saldo de créditos (logado) */}
          {isAuthenticated && (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[12.5px]">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 font-mono text-muted-foreground">
                {t("eudr.balance_label")}: <span className="font-semibold text-foreground">{balance != null ? balance : "…"}</span>
              </span>
              <span className="text-muted-foreground">{t("eudr.cost_hint")}</span>
            </div>
          )}

          {/* DFID lookup — logado emite (consome crédito); anônimo cai no gate */}
          <div className="mb-3 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
              {isAuthenticated ? (
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !loading && emit()}
                  placeholder="DFID-BEEF-BR-2026-…"
                  className="h-11 pl-11 font-mono text-[13px]"
                />
              ) : (
                <Input
                  readOnly
                  onFocus={() => openGate("demo")}
                  onClick={() => openGate("demo")}
                  value=""
                  placeholder="DFID-BEEF-BR-2026-…"
                  className="h-11 cursor-pointer pl-11 font-mono text-[13px]"
                />
              )}
            </div>
            {isAuthenticated ? (
              <Button onClick={emit} disabled={loading || !input.trim()}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("eudr.emit_cta")}
              </Button>
            ) : (
              <Button onClick={() => openGate("demo")}>{t("eudr.load")}</Button>
            )}
          </div>
          {hasReal && (
            <div
              className={"mb-5 rounded-xl border px-4 py-3 text-[13px] " + (incomplete ? "border-amber-300" : "border-primary/30")}
              style={{ background: incomplete ? "hsl(38 92% 50% / 0.08)" : "hsl(var(--primary) / 0.07)" }}
            >
              <span className="font-medium">
                {view === "emitted" && emitInfo
                  ? `${t("eudr.emit_ok", { credits: emitInfo.charged })}${emitInfo.balance != null ? ` · ${t("eudr.emit_balance", { balance: emitInfo.balance })}` : ""}`
                  : view === "consulted" && consultAt
                  ? t("eudr.consult_ok", { at: consultAt.replace("T", " ").slice(0, 16) })
                  : ""}
              </span>
              {incomplete && (
                <span className="ml-1 inline-flex items-center gap-1 text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5" /> {t("eudr.emit_incomplete")}
                </span>
              )}
            </div>
          )}

          {/* QR + link de partilha da verificação pública (DDS real) */}
          {hasReal && (
            <div className="mb-5">
              <EudrVerifyShare dfid={stmt.dfid} />
            </div>
          )}

          {/* Minhas DDS — emissões anteriores (consulta grátis, fase 2) */}
          {isAuthenticated && emissions.length > 0 && (
            <div className="mb-5 rounded-2xl border border-border bg-card p-5">
              <h3 className="mb-3 flex items-center gap-2 text-[14px] font-semibold">
                <History className="h-4 w-4 text-primary" />
                {t("eudr.my_dds")}
              </h3>
              <div className="divide-y divide-border">
                {emissions.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => consult(e.id)}
                    disabled={loading}
                    className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-1 py-2.5 text-left transition-colors hover:bg-muted/40"
                  >
                    <span className="break-all font-mono text-[12.5px] font-medium">{e.dfid}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{e.emitted_at.replace("T", " ").slice(0, 16)}</span>
                    {!e.eudr_ready && (
                      <span className="inline-flex items-center gap-1 font-mono text-[10.5px] text-amber-700">
                        <AlertTriangle className="h-3 w-3" />
                        {t("eudr.incomplete_tag")}
                      </span>
                    )}
                    <span className="ml-auto font-mono text-[11px] text-muted-foreground">{e.charged_credits > 0 ? `−${e.charged_credits}` : "—"}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {loggedEmpty ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-primary/60" />
              <p className="text-[15px] font-semibold">{t("eudr.empty_t")}</p>
              <p className="mx-auto mt-1 max-w-md text-[13.5px] text-muted-foreground">{t("eudr.empty_d")}</p>
            </div>
          ) : (
          <>
          {/* DFID strip */}
          <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-border bg-card p-5">
            <div className="break-all font-mono text-[15px] font-medium tracking-tight sm:text-[17px]">{stmt.dfid}</div>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline">{stmt.identity.value_chain}</Badge>
              <Badge variant="outline">{stmt.identity.country}</Badge>
              <Badge variant="outline">{stmt.identity.year}</Badge>
            </div>
          </div>

          {/* Trilho de due diligence — o coração da DDS */}
          <section className="mb-5 rounded-2xl border border-border bg-card p-6">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-[18px] font-semibold">
                <ShieldCheck className="h-[18px] w-[18px] text-primary" />
                {t("eudr.dd_t")}
              </h3>
              <span className="font-mono text-[11px] text-muted-foreground">{t("eudr.dd_sources")}</span>
            </div>
            <p className="mb-4 max-w-2xl text-[13px] text-muted-foreground">{t("eudr.dd_desc")}</p>

            <div className="space-y-5">
              {stmt.due_diligence.map((dd) => (
                <div key={dd.identifier_type + dd.identifier}>
                  <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{dd.identifier_type}</span>
                    <span className="break-all font-mono text-[12.5px] font-medium">{ddIdDisplay(dd.identifier_type, dd.identifier)}</span>
                    {dd.verdict && (
                      <span className="ml-auto inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold" style={statusTone(dd.verdict)}>
                        {dd.verdict}{dd.score != null ? ` · ${dd.score}` : ""}
                      </span>
                    )}
                  </div>
                  <div className="overflow-hidden rounded-xl border border-border">
                    <div className="grid grid-cols-1 divide-y divide-border bg-border" style={{ gap: 1 }}>
                      {dd.checks.map((c, i) => {
                        const tone = statusTone(c.status);
                        return (
                          <div key={i} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 bg-card px-4 py-3">
                            <div className="min-w-[140px] flex-1">
                              <div className="text-[14px] font-medium">{c.source}</div>
                              {c.category && <div className="text-[12px] text-muted-foreground">{c.category}</div>}
                            </div>
                            {c.message && <div className="flex-[2] text-[12.5px] text-muted-foreground">{c.message}</div>}
                            <div className="flex items-center gap-3">
                              {(c.data_source || c.last_update) && (
                                <span className="font-mono text-[10.5px] text-muted-foreground">
                                  {c.data_source}{c.last_update ? ` · ${c.last_update}` : ""}
                                </span>
                              )}
                              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold" style={tone}>
                                {c.status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
            {/* Origin + map */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[18px] font-semibold">{t("eudr.origin_t")}</h3>
                {o?.compliance && (
                  <span className="text-[13px] font-semibold" style={{ color: complianceOk ? "hsl(var(--primary-deep))" : "hsl(var(--destructive))" }}>
                    {complianceOk ? t("eudr.compliance_ok") : o.compliance.status}{o.compliance.score != null ? ` · ${o.compliance.score}%` : ""}
                  </span>
                )}
              </div>
              {mapGeo ? (
                <PropertyMap geojson={mapGeo} className="h-[220px] w-full overflow-hidden rounded-xl" />
              ) : (
                <PolygonMap ok={complianceOk} height={220} ring={ring} />
              )}
              <div className="mt-3 flex items-center gap-2 text-muted-foreground">
                <span className="font-mono text-[11px]">{t("eudr.map_hint")}</span>
                {o?.area_ha != null && <span className="ml-auto font-mono text-[11px]">{o.area_ha} ha</span>}
              </div>
              {o && (
                <div className="mt-3 border-t border-dashed border-border pt-1">
                  <KV k={t("eudr.origin_car")} v={o.car} mono />
                  {o.polygon_source && <KV k={t("eudr.origin_source")} v={o.polygon_source.toUpperCase()} />}
                  {o.area_ha != null && <KV k={t("eudr.origin_area")} v={`${o.area_ha} ha`} mono />}
                </div>
              )}
            </div>

            {/* Imutabilidade — 1 card compacto (cadeia/país/ano já estão no topo) */}
            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="mb-4 text-[18px] font-semibold">{t("eudr.imut_t")}</h3>
                <div className="mb-4"><AnchorStatus status={anchor} /></div>
                <div className="border-t border-dashed border-border pt-1">
                  {stmt.immutability.latest_cid && <KV k={t("eudr.imut_cid")} v={stmt.immutability.latest_cid.slice(0, 14) + "…"} mono />}
                  <KV k={t("eudr.imut_tx")} v={anchor === "confirmed" && stmt.immutability.anchor_tx ? stmt.immutability.anchor_tx.slice(0, 12) + "…" : "—"} mono />
                  {stmt.immutability.chain && <KV k={t("eudr.imut_chain")} v={stmt.immutability.chain} />}
                </div>
              </div>
            </div>
          </div>

          {/* CTA gated — só na vitrine anônima (gerar a DDS completa = contato) */}
          {showDemo && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-primary/30" style={{ background: "hsl(var(--primary) / 0.06)" }}>
              <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <Lock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <div className="text-[16px] font-semibold">{t("eudr.gate_card_t")}</div>
                    <p className="mt-1 max-w-xl text-[13.5px] text-muted-foreground">{t("eudr.gate_card_desc")}</p>
                  </div>
                </div>
                <Button size="lg" className="shrink-0" onClick={() => openGate("demo")}>
                  {t("eudr.gate_card_cta")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex-1 rounded-xl p-3.5" style={{ background: "hsl(var(--muted) / 0.6)" }}>
              <p className="text-[12.5px] leading-snug text-muted-foreground">{t("eudr.honesty")}</p>
            </div>
            <div className="shrink-0 font-mono text-[11px] text-muted-foreground sm:text-right">
              <div>{t("eudr.generated")}: {generatedAt}</div>
              {showDemo && <div className="mt-0.5">{t("eudr.demo_tag")}</div>}
            </div>
          </div>
          </>
          )}
        </div>
      </main>
      <Footer />

      {/* Popup de gate → contato */}
      <Dialog open={gateOpen} onOpenChange={setGateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {gateReason === "credits" ? t("eudr.credits_title") : t("eudr.gate_title")}
            </DialogTitle>
            <DialogDescription className="pt-1 text-[14px] leading-relaxed">
              {gateReason === "credits" ? t("eudr.credits_desc") : t("eudr.gate_desc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setGateOpen(false)}>{t("eudr.gate_close")}</Button>
            <Button onClick={() => navigate("/contato")}>
              {t("eudr.gate_cta")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
