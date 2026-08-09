import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, AlertTriangle, ExternalLink, ChevronDown } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnchorStatus, anchorStateOf, type AnchorState } from "@/components/proof";
import { verifyPublicItem, type PublicVerifyResponse } from "@/lib/defarm-api";

// Página de verificação PÚBLICA de um DFID (#8, Nível 0). Linguagem fácil no topo,
// prova reproduzível embaixo. Não substitui /i/:dfid (a ficha completa) — é o "confie
// no que você mesmo confere". Sem login. Decisão anti-AI (#55): estado = COR + texto.

function fmtDate(s?: string | null): string {
  if (!s) return "";
  return s.replace("T", " ").slice(0, 16) + (s.length > 10 ? " UTC" : "");
}

// Bloco expansível (progressive disclosure) — leigo fica no topo, auditor abre.
function Pillar({
  k,
  title,
  desc,
  status,
  statusColor,
  defaultOpen = true,
  children,
}: {
  k: string;
  title: string;
  desc: string;
  status: string;
  statusColor: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group mb-3 overflow-hidden rounded-2xl border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-start gap-4 p-5 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">{k}</div>
          <div className="mt-0.5 font-display text-[18px] font-semibold tracking-tight">{title}</div>
          <p className="mt-1 max-w-[54ch] text-[14px] text-muted-foreground">{desc}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-1">
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: statusColor }}>
            <span className="h-2 w-2 rounded-[2px]" style={{ background: statusColor }} />
            {status}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </div>
      </summary>
      <div className="border-t border-border/60 px-5 pb-5 pt-4">{children}</div>
    </details>
  );
}

function ProofRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 px-3.5 py-2.5">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">{label}</div>
      <div className="mt-1 break-all font-mono text-[12.5px] leading-relaxed">{value}</div>
    </div>
  );
}

export default function PublicVerify() {
  const { t } = useTranslation();
  const { dfid = "" } = useParams<{ dfid: string }>();
  const [loading, setLoading] = useState(true);
  const [res, setRes] = useState<PublicVerifyResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    verifyPublicItem(dfid)
      .then((r) => {
        if (!cancelled) setRes(r);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dfid]);

  const anchor = res?.anchor ?? null;
  const anchorState: AnchorState = anchorStateOf(anchor?.status);
  const events = res?.events ?? [];
  const signed = events.filter((e) => e.signature_verified === true);
  const sigFailed = events.some((e) => e.signature_verified === false);
  const hasAnchor = !!anchor;

  // Veredito honesto: verificado quando a âncora está confirmada e nenhuma assinatura falhou.
  const verified = anchorState === "confirmed" && !sigFailed;
  const primary = "hsl(var(--primary))";
  const primaryDeep = "hsl(var(--primary-deep))";
  const amber = "hsl(38 92% 38%)";
  const muted = "hsl(var(--muted-foreground))";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="section-container max-w-3xl">
          <div className="flex items-center gap-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-primary">
            <span className="h-px w-6 bg-primary/50" />
            {t("v.eyebrow")}
          </div>
          <h1 className="mt-3 text-balance text-[30px] font-bold tracking-tight sm:text-[38px]">{t("v.title")}</h1>
          <p className="mt-2 max-w-2xl text-[15px] text-muted-foreground">{t("v.sub")}</p>

          {loading ? (
            <div className="mt-10 flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> {t("v.loading")}
            </div>
          ) : error || !res ? (
            <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-[15px] font-semibold">{t("v.notfound_t")}</p>
              <p className="mx-auto mt-1 max-w-md text-[13.5px] text-muted-foreground">{t("v.notfound_d")}</p>
              <p className="mt-3 break-all font-mono text-[12px] text-muted-foreground">{dfid}</p>
            </div>
          ) : (
            <>
              {/* VEREDITO */}
              <section
                className="relative mt-6 overflow-hidden rounded-2xl border border-border bg-card p-6"
                style={{ boxShadow: "0 8px 40px -18px hsl(var(--primary) / 0.35)" }}
              >
                <span
                  className="absolute inset-y-0 left-0 w-[5px]"
                  style={{ background: verified ? primary : amber }}
                  aria-hidden="true"
                />
                <span
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold"
                  style={{
                    color: verified ? primaryDeep : amber,
                    background: verified ? "hsl(var(--primary) / 0.12)" : "hsl(38 92% 50% / 0.13)",
                  }}
                >
                  <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: verified ? primary : amber }} />
                  {verified ? t("v.verdict_ok_t") : t("v.verdict_partial_t")}
                </span>
                <h2 className="mt-4 text-balance font-display text-[22px] font-semibold leading-snug tracking-tight sm:text-[25px]">
                  {verified ? t("v.verdict_ok_h") : t("v.verdict_partial_h")}
                </h2>
                <p className="mt-2 max-w-[58ch] text-[14.5px] text-muted-foreground">
                  {verified ? t("v.verdict_ok_d") : t("v.verdict_partial_d")}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-dashed border-border pt-4">
                  <span className="break-all rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 font-mono text-[13.5px] font-semibold">
                    {res.dfid}
                  </span>
                  {anchor && (
                    <span className="font-mono text-[12px] text-muted-foreground">
                      {t("v.anchored_on")} {fmtDate(anchor.anchored_at)} · {t("v.network")} {anchor.network}
                    </span>
                  )}
                </div>
              </section>

              <div className="mt-9 mb-3 px-1 text-[12px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
                {t("v.section_proof")}
              </div>

              {/* PILAR 1 — QUANDO & ONDE */}
              <Pillar
                k={t("v.when_k")}
                title={t("v.when_t")}
                desc={t("v.when_d")}
                status={hasAnchor ? (anchorState === "confirmed" ? t("v.st_confirmed") : t("v.st_pending")) : t("v.st_none")}
                statusColor={anchorState === "confirmed" ? primary : muted}
              >
                {anchor ? (
                  <div className="space-y-3">
                    <p className="text-[14px] text-muted-foreground">{t("v.when_body")}</p>
                    <a
                      href={anchor.explorer_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-primary px-3.5 py-2 text-[14px] font-semibold text-primary transition-colors hover:bg-primary/10"
                    >
                      {t("v.open_explorer")} <ExternalLink className="h-4 w-4" />
                    </a>
                    <ProofRow label={t("v.tx")} value={anchor.transaction_hash} />
                    {anchor.metadata_cid && <ProofRow label={t("v.cid")} value={anchor.metadata_cid} />}
                  </div>
                ) : (
                  <p className="text-[14px] text-muted-foreground">{t("v.when_none")}</p>
                )}
              </Pillar>

              {/* PILAR 2 — ÍNTEGRO */}
              <Pillar
                k={t("v.integrity_k")}
                title={t("v.integrity_t")}
                desc={t("v.integrity_d")}
                status={t("v.st_ok")}
                statusColor={primary}
              >
                <p className="text-[14px] text-muted-foreground">{t("v.integrity_body")}</p>
                {res.verification?.content_hash_canonicalization && (
                  <div className="mt-3">
                    <ProofRow label={t("v.integrity_recipe")} value={res.verification.content_hash_canonicalization} />
                  </div>
                )}
                {anchor?.snapshot_hash && (
                  <div className="mt-2">
                    <ProofRow label={t("v.snapshot_hash")} value={anchor.snapshot_hash} />
                  </div>
                )}
              </Pillar>

              {/* PILAR 3 — QUEM */}
              <Pillar
                k={t("v.who_k")}
                title={t("v.who_t")}
                desc={t("v.who_d")}
                status={sigFailed ? t("v.st_attention") : signed.length > 0 ? t("v.st_signed") : t("v.st_none")}
                statusColor={sigFailed ? "hsl(var(--destructive))" : signed.length > 0 ? primary : muted}
              >
                <p className="text-[14px] text-muted-foreground">{t("v.who_body")}</p>
                {signed[0]?.signature_public_key_b64 && (
                  <div className="mt-3">
                    <ProofRow label={t("v.pubkey")} value={signed[0].signature_public_key_b64} />
                  </div>
                )}
                <div className="mt-3 rounded-xl border border-border bg-muted/40 px-3.5 py-3">
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                    {t("v.sig_level_k")}
                  </div>
                  <p className="mt-1 text-[13px] text-muted-foreground">{t("v.sig_level_d")}</p>
                </div>
              </Pillar>

              {/* PARA TÉCNICOS — a receita crua, escondida por padrão */}
              {res.verification && (
                <details className="group mt-3 overflow-hidden rounded-2xl border border-border bg-card">
                  <summary className="flex cursor-pointer list-none items-center justify-between p-5 [&::-webkit-details-marker]:hidden">
                    <span className="font-display text-[16px] font-semibold">{t("v.tech_t")}</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="space-y-4 border-t border-border/60 px-5 pb-5 pt-4">
                    <p className="text-[13px] text-muted-foreground">{t("v.tech_d")}</p>
                    <ol className="space-y-2">
                      {res.verification.steps.map((s, i) => (
                        <li key={i} className="flex gap-3 text-[13px] text-muted-foreground">
                          <span className="mt-0.5 font-mono text-[11px] font-semibold text-primary">{i + 1}.</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ol>
                    <div className="space-y-2">
                      <ProofRow label={t("v.tech_sig_canon")} value={res.verification.signature_canonicalization} />
                      <ProofRow label={t("v.tech_content_canon")} value={res.verification.content_hash_canonicalization} />
                      {anchor?.anchor_content_root && (
                        <ProofRow label={t("v.tech_root")} value={anchor.anchor_content_root} />
                      )}
                      {anchor?.events_root && <ProofRow label={t("v.tech_events_root")} value={anchor.events_root} />}
                      {anchor?.commitments_root && (
                        <ProofRow label={t("v.tech_commitments_root")} value={anchor.commitments_root} />
                      )}
                    </div>
                    {anchor && (
                      <p className="rounded-xl px-3.5 py-3 text-[12.5px] leading-snug text-muted-foreground" style={{ background: "hsl(var(--muted) / 0.6)" }}>
                        {t("v.tech_note")}
                      </p>
                    )}
                  </div>
                </details>
              )}

              {/* HONESTIDADE — o que prova, o que não prova */}
              <details className="group mt-3 overflow-hidden rounded-2xl border border-border">
                <summary className="flex cursor-pointer list-none items-center justify-between p-5 [&::-webkit-details-marker]:hidden">
                  <span className="font-display text-[16px] font-semibold">{t("v.honesty_t")}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="grid gap-6 border-t border-border/60 p-5 sm:grid-cols-2">
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: primaryDeep }}>
                      {t("v.proves_t")}
                    </h4>
                    <ul className="mt-2 list-disc space-y-1.5 pl-4 text-[13.5px] text-muted-foreground">
                      <li>{t("v.proves_1")}</li>
                      <li>{t("v.proves_2")}</li>
                      <li>{t("v.proves_3")}</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                      {t("v.notproves_t")}
                    </h4>
                    <ul className="mt-2 list-disc space-y-1.5 pl-4 text-[13.5px] text-muted-foreground">
                      <li>{t("v.notproves_1")}</li>
                      <li>{t("v.notproves_2")}</li>
                    </ul>
                  </div>
                </div>
              </details>

              <p className="mt-6 text-center font-mono text-[11.5px] leading-relaxed text-muted-foreground">
                {t("v.foot")}
                <br />
                defarm.net/v/{res.dfid}
              </p>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
