import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, AlertTriangle, ExternalLink, ChevronDown } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { anchorStateOf, type AnchorState } from "@/components/proof";
import { verifyPublicItem, getPublicItem, type PublicVerifyResponse, type PublicItem } from "@/lib/defarm-api";

// Identificadores sensíveis do animal — o backend JÁ os entrega MASCARADOS ("•••• 1234")
// pra visitante anônimo (privacidade). O /v só exibe o que vier mascarado.
const SENSITIVE_IDS = ["sisbov", "chip", "rfid", "brinco", "ear_tag"] as const;

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
      viewBox="0 0 240 150"
      className="pointer-events-none absolute -bottom-3 -right-2 h-44 w-60 select-none sm:h-52 sm:w-72"
      style={{ color: "hsl(var(--primary))", opacity: 0.1 }}
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {/* silhueta de bovino em contorno (corpo + 4 pernas + cabeça com chifres/orelha + rabo) */}
      <path d="M30,84 C31,74 34,68 40,62 C46,56 52,54 60,55 C64,50 68,49 72,53 C78,50 84,52 88,58 C96,52 108,50 122,51 C144,52 162,53 176,58 C182,60 186,64 187,70 L187,80 L179,80 L179,124 L171,124 L171,82 C166,83 162,83 158,82 L158,124 L150,124 L150,80 C138,82 120,83 106,82 L106,124 L98,124 L98,80 C93,80 89,79 86,77 L86,124 L78,124 L78,74 C70,72 64,70 60,66 C54,72 46,78 40,82 C36,84 33,85 30,84 Z" />
      <path d="M62,56 C60,49 65,46 68,50" />
      <path d="M52,58 C50,51 55,48 57,52" />
      <path d="M67,57 C75,57 81,63 79,71" />
      <path d="M187,70 C194,74 197,92 194,108 C193,112 189,112 188,108" />
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
  const [item, setItem] = useState<PublicItem | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setItem(null);
    verifyPublicItem(dfid)
      .then((r) => !cancelled && setRes(r))
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));
    // Metadata pública (best-effort) só pra exibir o identificador canônico mascarado.
    getPublicItem(dfid)
      .then((it) => !cancelled && setItem(it))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [dfid]);

  // Identificador(es) canônico(s) do animal, já mascarados pelo backend (ex.: "SISBOV •••• 99002").
  const meta = (item?.metadata ?? {}) as Record<string, unknown>;
  const canonicalIds = SENSITIVE_IDS.map((k) => ({ k, v: typeof meta[k] === "string" ? (meta[k] as string) : null })).filter(
    (x): x is { k: (typeof SENSITIVE_IDS)[number]; v: string } => !!x.v,
  );

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
                  {canonicalIds.length > 0 && (
                    <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                      {canonicalIds.map((x) => `${x.k.toUpperCase()} ${x.v}`).join("   ·   ")}
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
