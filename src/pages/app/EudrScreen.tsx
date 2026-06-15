import { useEffect, useState } from "react";
import { FileText, Search } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AnchorStatus, PolygonMap, anchorStateOf } from "@/components/proof";
import { getEudrStatement, type EudrStatement } from "@/lib/api/products";

// Tela Due diligence EUDR (Entrega C). Consome GET /api/eudr/statement?dfid=
// (registryRequest, JWT). REGRA DE HONESTIDADE: o estado da âncora vem de
// immutability.anchor_status — AnchorStatus só diz "verificado on-chain" se
// confirmed. Pública: cai no fixture-demo se não autenticado / erro.
const DEMO_DFID = "DFID-BEEF-BR-2026-001119-b8a57a";
const DEMO: EudrStatement = {
  dfid: DEMO_DFID,
  identity: { value_chain: "BEEF", country: "BR", year: 2026, status: "active" },
  origin: [{ car: "MS-5002704-DEMOEUDR8F3A2C1B9E7D", compliance: { status: "ok", score: 95 }, polygon: null, polygon_source: "sicar", area_ha: 1247.5 }],
  immutability: { latest_cid: "Qmc2Tf9aZ8r4Lh1WkPqN3oVbXyJ7sD6eU5tH0mGc", anchor_tx: "abc7f1e9d4c2b8a6f0e3d1c9b7a5f2e8d6c4b2a0", anchor_status: "confirmed", chain: "stellar" },
  eudr_ready: true,
  generated_at: "2026-06-15T14:02:00Z",
  note: "",
};

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
  const [params, setParams] = useSearchParams();
  const initial = params.get("dfid") || DEMO_DFID;
  const [input, setInput] = useState(initial);
  const [stmt, setStmt] = useState<EudrStatement>(DEMO);
  const [loading, setLoading] = useState(false);

  async function load(dfid: string) {
    const v = dfid.trim();
    if (!v) return;
    setLoading(true);
    try {
      const r = await getEudrStatement(v);
      setStmt(r);
    } catch {
      // sem token / erro: mostra o demo (showcase) marcando o dfid pedido.
      setStmt({ ...DEMO, dfid: v });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(initial); /* eslint-disable-next-line */ }, []);

  const o = stmt.origin[0];
  const anchor = anchorStateOf(stmt.immutability.anchor_status);
  const complianceOk = o?.compliance?.status === "ok";
  const ring = (o?.polygon?.coordinates?.[0] as [number, number][] | undefined);
  const generatedAt = (stmt.generated_at || "").replace("T", " ").slice(0, 16) + "Z";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="section-container max-w-5xl">
          <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-primary">
                <span className="h-px w-6 bg-primary/50" />{t("eudr.eyebrow")}
              </div>
              <h1 className="mt-3 text-[32px] font-bold tracking-tight sm:text-[40px]">{t("eudr.title")}</h1>
              <p className="mt-2 max-w-2xl text-[16px] text-muted-foreground" style={{ textWrap: "pretty" }}>{t("eudr.sub")}</p>
            </div>
            <div className="flex flex-col items-end gap-3">
              {stmt.eudr_ready ? (
                <span className="inline-flex items-center rounded-full px-3.5 py-2 text-[13px] font-semibold" style={{ background: "hsl(var(--primary) / 0.12)", color: "hsl(var(--primary-deep))" }}>{t("eudr.ready")}</span>
              ) : (
                <Badge variant="secondary">{t("eudr.notready")}</Badge>
              )}
              <Button variant="outline" size="sm" onClick={() => window.print()}><FileText className="mr-1.5 h-[15px] w-[15px]" />{t("eudr.export")}</Button>
            </div>
          </header>

          {/* DFID lookup */}
          <div className="mb-5 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
              <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (setParams({ dfid: input.trim() }), load(input))} placeholder="DFID-BEEF-BR-2026-…" className="h-11 pl-11 font-mono text-[13px]" />
            </div>
            <Button onClick={() => { setParams({ dfid: input.trim() }); load(input); }} disabled={loading}>{loading ? t("score.loading") : t("eudr.load")}</Button>
          </div>

          {/* DFID strip */}
          <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-border bg-card p-5">
            <div className="break-all font-mono text-[15px] font-medium tracking-tight sm:text-[17px]">{stmt.dfid}</div>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline">{stmt.identity.value_chain}</Badge>
              <Badge variant="outline">{stmt.identity.country}</Badge>
              <Badge variant="outline">{stmt.identity.year}</Badge>
            </div>
          </div>

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
              <PolygonMap ok={complianceOk} height={220} ring={ring} />
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

            {/* Identity + immutability */}
            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="mb-2 text-[18px] font-semibold">{t("eudr.id_t")}</h3>
                <div>
                  <KV k={t("eudr.id_chain")} v={stmt.identity.value_chain} />
                  <KV k={t("eudr.id_country")} v={stmt.identity.country} />
                  <KV k={t("eudr.id_year")} v={stmt.identity.year} mono />
                  <KV k={t("eudr.id_status")} v={<span className="inline-flex items-center gap-1.5" style={{ color: "hsl(var(--primary-deep))" }}><span className="h-1.5 w-1.5 rounded-full bg-primary" />{t("eudr.id_active")}</span>} />
                </div>
              </div>

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

          <div className="mt-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex-1 rounded-xl p-3.5" style={{ background: "hsl(var(--muted) / 0.6)" }}>
              <p className="text-[12.5px] leading-snug text-muted-foreground">{t("eudr.honesty")}</p>
            </div>
            <div className="shrink-0 font-mono text-[11px] text-muted-foreground sm:text-right">
              <div>{t("eudr.generated")}: {generatedAt}</div>
              <div className="mt-0.5">{t("eudr.embed")}</div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
