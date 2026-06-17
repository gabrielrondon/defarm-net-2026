import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnchorStatus, anchorStateOf } from "@/components/proof";
import { PropertyMap } from "@/components/onboarding/PropertyMap";
import { getCarGeoJSON, type CarGeoJSON } from "@/lib/check-api/car";
import { verifyEudrPublic, type EudrStatement } from "@/lib/api/products";
import { EudrVerifyShare } from "@/components/EudrVerifyShare";

// Verificação PÚBLICA da DDS (EUDR) — o importador/auditor confere uma Declaração
// já emitida por DFID, SEM login e SEM ser quem emitiu. Mostra o snapshot datado
// (operador mascarado pelo backend), o trilho, o mapa real do CAR e a âncora.
function tone(s: string): { color: string; bg: string } {
  const u = (s || "").toUpperCase();
  if (["PASS", "COMPLIANT", "OK"].includes(u)) return { color: "hsl(var(--primary-deep))", bg: "hsl(var(--primary) / 0.12)" };
  if (["FAIL", "NON_COMPLIANT"].includes(u)) return { color: "hsl(var(--destructive))", bg: "hsl(var(--destructive) / 0.1)" };
  if (["WARNING", "PARTIAL"].includes(u)) return { color: "hsl(38 92% 38%)", bg: "hsl(38 92% 50% / 0.13)" };
  return { color: "hsl(var(--muted-foreground))", bg: "hsl(var(--muted) / 0.7)" };
}

export default function PublicEudrVerify() {
  const { t } = useTranslation();
  const { dfid = "" } = useParams<{ dfid: string }>();
  const [loading, setLoading] = useState(true);
  const [stmt, setStmt] = useState<EudrStatement | null>(null);
  const [emittedAt, setEmittedAt] = useState<string | null>(null);
  const [found, setFound] = useState(false);
  const [mapGeo, setMapGeo] = useState<CarGeoJSON | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    verifyEudrPublic(dfid)
      .then((r) => {
        if (cancelled) return;
        setFound(r.found);
        setStmt(r.statement);
        setEmittedAt(r.emitted_at);
      })
      .catch(() => { if (!cancelled) setFound(false); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [dfid]);

  const originCar = stmt?.origin?.[0]?.car;
  useEffect(() => {
    setMapGeo(null);
    if (!originCar) return;
    let cancelled = false;
    getCarGeoJSON(originCar, { skipAuth: true })
      .then((g) => { if (!cancelled) setMapGeo(g); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [originCar]);

  const anchor = stmt ? anchorStateOf(stmt.immutability.anchor_status) : "pending";
  const emittedFmt = emittedAt ? emittedAt.replace("T", " ").slice(0, 16) + "Z" : "";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="section-container max-w-4xl">
          <div className="flex items-center gap-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-primary">
            <span className="h-px w-6 bg-primary/50" />
            {t("eudr.eyebrow")}
          </div>
          <h1 className="mt-3 text-[30px] font-bold tracking-tight sm:text-[38px]">{t("eudr.title")}</h1>
          <p className="mt-2 max-w-2xl text-[15px] text-muted-foreground">{t("eudrv.sub")}</p>

          {loading ? (
            <div className="mt-10 flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> {t("eudrv.loading")}
            </div>
          ) : !found || !stmt ? (
            <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-[15px] font-semibold">{t("eudrv.notfound_t")}</p>
              <p className="mx-auto mt-1 max-w-md text-[13.5px] text-muted-foreground">{t("eudrv.notfound_d")}</p>
              <p className="mt-3 break-all font-mono text-[12px] text-muted-foreground">{dfid}</p>
            </div>
          ) : (
            <>
              {/* Cabeçalho da DDS verificada */}
              <div className="mt-6 rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="break-all font-mono text-[15px] font-medium tracking-tight sm:text-[17px]">{stmt.dfid}</span>
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={tone(stmt.eudr_ready ? "COMPLIANT" : "PARTIAL")}
                  >
                    {stmt.eudr_ready ? t("eudrv.ready") : t("eudrv.partial")}
                  </span>
                  <span className="ml-auto font-mono text-[11px] text-muted-foreground">{t("eudr.generated")}: {emittedFmt}</span>
                </div>
                <div className="mt-3 border-t border-dashed border-border pt-3">
                  <AnchorStatus status={anchor} compact />
                </div>
              </div>

              {/* QR + link de partilha (paridade com /i/:dfid) */}
              <div className="mt-5">
                <EudrVerifyShare dfid={stmt.dfid} />
              </div>

              {/* Trilho de due diligence (operador já mascarado) */}
              <section className="mt-5 rounded-2xl border border-border bg-card p-6">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-[18px] font-semibold">
                    <ShieldCheck className="h-[18px] w-[18px] text-primary" />
                    {t("eudr.dd_t")}
                  </h3>
                  <span className="font-mono text-[11px] text-muted-foreground">{t("eudr.dd_sources")}</span>
                </div>
                <p className="mb-4 max-w-2xl text-[13px] text-muted-foreground">{t("eudrv.dd_desc")}</p>
                <div className="space-y-5">
                  {(stmt.due_diligence || []).map((dd) => (
                    <div key={dd.identifier_type + dd.identifier}>
                      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{dd.identifier_type}</span>
                        <span className="break-all font-mono text-[12.5px] font-medium">{dd.identifier}</span>
                        {dd.verdict && (
                          <span className="ml-auto inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold" style={tone(dd.verdict)}>
                            {dd.verdict}{dd.score != null ? ` · ${dd.score}` : ""}
                          </span>
                        )}
                      </div>
                      <div className="overflow-hidden rounded-xl border border-border">
                        <div className="grid grid-cols-1 divide-y divide-border bg-border" style={{ gap: 1 }}>
                          {dd.checks.map((c, i) => (
                            <div key={i} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 bg-card px-4 py-3">
                              <div className="min-w-[140px] flex-1">
                                <div className="text-[14px] font-medium">{c.source}</div>
                                {c.category && <div className="text-[12px] text-muted-foreground">{c.category}</div>}
                              </div>
                              {c.message && <div className="flex-[2] text-[12.5px] text-muted-foreground">{c.message}</div>}
                              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold" style={tone(c.status)}>{c.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!stmt.due_diligence || stmt.due_diligence.length === 0) && (
                    <p className="text-[13px] text-muted-foreground">{t("eudrv.no_trail")}</p>
                  )}
                </div>
              </section>

              {/* Mapa real do CAR de origem */}
              {mapGeo && originCar && (
                <section className="mt-5 rounded-2xl border border-border bg-card p-6">
                  <h3 className="mb-4 text-[18px] font-semibold">{t("eudr.origin_t")}</h3>
                  <PropertyMap geojson={mapGeo} className="h-[260px] w-full overflow-hidden rounded-xl" />
                  <p className="mt-3 font-mono text-[11px] text-muted-foreground">{t("eudr.map_hint")} · {originCar}</p>
                </section>
              )}

              <p className="mt-5 rounded-xl p-3.5 text-[12.5px] leading-snug text-muted-foreground" style={{ background: "hsl(var(--muted) / 0.6)" }}>
                {t("eudrv.note")}
              </p>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
