import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, AlertTriangle, ExternalLink, ChevronDown } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { anchorStateOf, type AnchorState } from "@/components/proof";
import { verifyPublicItem, type PublicVerifyResponse } from "@/lib/defarm-api";

// Página pública /v/:dfid (#8, Nível 0). Direção "selo minimalista": veredito + 1 ação;
// todo o detalhe atrás de um único "Como isto é provado?". Sem login. Anti-AI #55: cor + texto.

function fmtDate(s?: string | null): string {
  if (!s) return "";
  return s.replace("T", " ").slice(0, 16) + (s.length > 10 ? " UTC" : "");
}

// Marca decorativa por value chain (contorno, transparente) — dá alma ao selo sem poluir.
// BEEF = silhueta de bovino. Fácil de estender (soja, leite…) por value_chain.
function ChainMark({ chain }: { chain?: string }) {
  if ((chain || "").toUpperCase() !== "BEEF") return null;
  return (
    <svg
      viewBox="0 0 200 140"
      className="pointer-events-none absolute -bottom-6 -right-5 h-44 w-44 select-none"
      style={{ color: "hsl(var(--primary))", opacity: 0.07 }}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {/* corpo + cabeça + pernas (silhueta lateral, pastando) */}
      <path d="M24,52 C28,40 44,36 62,38 C74,39 86,39 96,35 C101,26 104,16 113,18 C120,19 121,28 124,35 C133,33 143,36 146,45 C148,52 144,58 137,58 C132,58 127,56 123,53 C118,62 106,64 95,63 L95,104 L86,104 L86,63 C70,64 52,63 44,60 L44,104 L35,104 L35,57 C29,55 25,53 24,52 Z" />
      {/* rabo */}
      <path d="M24,52 C15,56 12,72 17,86" />
      {/* orelha/chifre */}
      <path d="M113,18 C110,11 115,8 119,13" />
    </svg>
  );
}

// Linha de prova em linguagem simples (dentro do disclosure). Estado = cor + palavra.
function ProofLine({
  label,
  status,
  color,
  children,
}: {
  label: string;
  status?: string;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-[14px] font-semibold">{label}</span>
        {status && (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium" style={{ color }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
            {status}
          </span>
        )}
      </div>
      <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

function TechRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">{label}</div>
      <div className="mt-0.5 break-all font-mono text-[12px] leading-relaxed text-foreground/80">{value}</div>
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
      .then((r) => !cancelled && setRes(r))
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [dfid]);

  const anchor = res?.anchor ?? null;
  const anchorState: AnchorState = anchorStateOf(anchor?.status);
  const events = res?.events ?? [];
  const signed = events.filter((e) => e.signature_verified === true);
  const sigFailed = events.some((e) => e.signature_verified === false);
  const hasIntegrityMaterial = !!anchor?.snapshot_hash || events.some((e) => !!e.content_hash);
  const hasRoots = !!(anchor?.anchor_content_root || anchor?.events_root || anchor?.commitments_root);
  const eventsMaybeTruncated = events.length >= 200; // veredito sobre a amostra (H5)

  const primary = "hsl(var(--primary))";
  const primaryDeep = "hsl(var(--primary-deep))";
  const amber = "hsl(38 92% 38%)";
  const destructive = "hsl(var(--destructive))";
  const muted = "hsl(var(--muted-foreground))";

  // Veredito honesto, derivado dos dados (ver notas nos 4 estados).
  const verdict: "attention" | "verified" | "anchored" | "pending" = sigFailed
    ? "attention"
    : anchorState === "confirmed" && signed.length > 0
      ? "verified"
      : anchorState === "confirmed"
        ? "anchored"
        : "pending";
  const vAccent = verdict === "attention" ? destructive : verdict === "pending" ? amber : primary;
  const vInk = verdict === "attention" ? destructive : verdict === "pending" ? amber : primaryDeep;
  const vBg =
    verdict === "attention"
      ? "hsl(var(--destructive) / 0.12)"
      : verdict === "pending"
        ? "hsl(38 92% 50% / 0.14)"
        : "hsl(var(--primary) / 0.13)";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-20">
        <div className="section-container max-w-xl">
          <div className="text-center text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {t("v.eyebrow")}
          </div>

          {loading ? (
            <div className="mt-16 flex items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> {t("v.loading")}
            </div>
          ) : error || !res ? (
            <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <AlertTriangle className="mx-auto mb-3 h-7 w-7 text-muted-foreground" />
              <p className="text-[15px] font-semibold">{t("v.notfound_t")}</p>
              <p className="mx-auto mt-1 max-w-sm text-[13.5px] text-muted-foreground">{t("v.notfound_d")}</p>
              <p className="mt-3 break-all font-mono text-[12px] text-muted-foreground">{dfid}</p>
            </div>
          ) : (
            <>
              {/* SELO — veredito + 1 ação. O resto fica escondido. */}
              <section className="relative mt-6 overflow-hidden rounded-[20px] border border-border bg-card px-7 py-10 text-center sm:px-10">
                <ChainMark chain={res.identity?.value_chain} />
                <div className="relative z-10">
                <span
                  className="mx-auto flex h-11 w-11 items-center justify-center rounded-full"
                  style={{ background: vBg }}
                  aria-hidden="true"
                >
                  <span className="h-3 w-3 rounded-[4px]" style={{ background: vAccent }} />
                </span>
                <h1
                  className="mt-5 text-balance font-display text-[25px] font-semibold tracking-tight sm:text-[29px]"
                  style={{ color: vInk }}
                >
                  {t(`v.verdict_${verdict}_t`)}
                </h1>
                <p className="mx-auto mt-2.5 max-w-[40ch] text-[15px] leading-relaxed text-muted-foreground">
                  {t(`v.verdict_${verdict}_h`)}
                </p>

                <div className="mx-auto mt-6 max-w-[24rem] border-t border-dashed border-border pt-5">
                  <p className="break-all font-mono text-[13px] font-medium tracking-tight">{res.dfid}</p>
                  {(res.identifiers?.length ?? 0) > 0 && (
                    <p className="mt-1.5 break-all font-mono text-[11px] text-muted-foreground">
                      {res.identifiers!.slice(0, 3).map((id) => `${id.identifier_type} ${id.value}`).join("  ·  ")}
                    </p>
                  )}
                  {anchor && (
                    <p className="mt-1 font-mono text-[11.5px] text-muted-foreground">
                      {fmtDate(anchor.anchored_at)} · {anchor.network}
                    </p>
                  )}
                </div>

                {anchor?.explorer_url && (
                  <a
                    href={anchor.explorer_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[14.5px] font-semibold text-primary-foreground transition-[filter] hover:brightness-[1.06]"
                    style={{ background: "hsl(var(--primary))" }}
                  >
                    {t("v.open_explorer")} <ExternalLink className="h-[17px] w-[17px]" />
                  </a>
                )}
                </div>
              </section>

              {/* UM link discreto abre todo o detalhe */}
              <details className="group mt-6">
                <summary className="flex cursor-pointer list-none items-center justify-center gap-1.5 py-1 text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
                  {t("v.how_t")}
                  <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                </summary>

                <div className="mt-4 space-y-5 rounded-[20px] border border-border bg-card p-6 sm:p-7">
                  <ProofLine
                    label={t("v.when_k")}
                    status={anchor ? (anchorState === "confirmed" ? t("v.st_confirmed") : t("v.st_pending")) : t("v.st_none")}
                    color={anchor && anchorState === "confirmed" ? primaryDeep : muted}
                  >
                    {t("v.when_d")}
                  </ProofLine>

                  <ProofLine
                    label={t("v.integrity_k")}
                    status={hasIntegrityMaterial ? t("v.st_recomputable") : t("v.st_nodata")}
                    color={muted}
                  >
                    {t("v.integrity_d")}
                  </ProofLine>

                  <ProofLine
                    label={t("v.who_k")}
                    status={sigFailed ? t("v.st_attention") : signed.length > 0 ? t("v.st_signed") : t("v.st_unsigned")}
                    color={sigFailed ? destructive : signed.length > 0 ? primaryDeep : muted}
                  >
                    {t("v.who_d")}
                  </ProofLine>

                  {/* Técnico: aninhado, pra sumir de quem não quer */}
                  {res.verification && (
                    <details className="group/tech border-t border-border/60 pt-4">
                      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                        {t("v.tech_t")}
                        <ChevronDown className="h-3.5 w-3.5 transition-transform group-open/tech:rotate-180" />
                      </summary>
                      <div className="mt-3 space-y-3">
                        <p className="text-[12px] leading-relaxed text-muted-foreground">{t("v.tech_d")}</p>
                        {/* O CHECKLIST do auditor (o que fazer) — primeiro. */}
                        <ol className="space-y-1.5">
                          {res.verification.steps.map((s, i) => (
                            <li key={i} className="flex gap-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
                              <span className="font-mono text-[11px] font-semibold text-primary">{i + 1}.</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ol>
                        {/* As FÓRMULAS byte-exatas — um nível mais fundo, só pra quem vai reproduzir. */}
                        <details className="group/f">
                          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                            {t("v.tech_formulas_t")}
                            <ChevronDown className="h-3 w-3 transition-transform group-open/f:rotate-180" />
                          </summary>
                          <div className="mt-3 space-y-3 rounded-xl bg-muted/40 p-3.5">
                            <TechRow label={t("v.tech_sig_canon")} value={res.verification.signature_canonicalization} />
                            <TechRow label={t("v.tech_content_canon")} value={res.verification.content_hash_canonicalization} />
                            {anchor && (
                              <TechRow
                                label={t("v.tech_binding")}
                                value={anchor.onchain_content_binding ?? t("v.tech_binding_none")}
                              />
                            )}
                            {hasRoots && anchor?.anchor_content_root && (
                              <TechRow label={t("v.tech_root")} value={anchor.anchor_content_root} />
                            )}
                            {hasRoots && anchor?.events_root && (
                              <TechRow label={t("v.tech_events_root")} value={anchor.events_root} />
                            )}
                            {hasRoots && anchor?.commitments_root && (
                              <TechRow label={t("v.tech_commitments_root")} value={anchor.commitments_root} />
                            )}
                          </div>
                        </details>
                      </div>
                    </details>
                  )}

                  <div className="border-t border-border/60 pt-4">
                    <p className="text-[12.5px] leading-relaxed text-muted-foreground">{t("v.honesty_short")}</p>
                    {eventsMaybeTruncated && (
                      <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{t("v.events_sample")}</p>
                    )}
                  </div>
                </div>
              </details>

              <p className="mt-8 text-center font-mono text-[11px] text-muted-foreground">defarm.net/v/{res.dfid}</p>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
