import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, AlertTriangle, ExternalLink, ChevronDown, Info, Moon, Sun, Activity, Check, Minus, BadgeCheck, ShieldCheck } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NeloreMark } from "@/components/NeloreMark";
import { anchorStateOf, type AnchorState } from "@/components/proof";
import {
  verifyInclusionInBrowser,
  verifyEventContentHashInBrowser,
  verifyEventSignatureInBrowser,
} from "@/lib/verify-inclusion";
import {
  verifyPublicItem,
  getPublicItem,
  getPublicInclusionProofs,
  getPublicWorkspace,
  getPublicItemEventsLossless,
  type PublicVerifyResponse,
  type PublicItem,
  type PublicInclusionProof,
  type PublicWorkspace,
  type PublicItemEvent,
} from "@/lib/defarm-api";

// Identificadores sensíveis do animal — o backend JÁ os entrega MASCARADOS ("•••• 1234")
// pra visitante anônimo (privacidade). O /v só exibe o que vier mascarado.
const SENSITIVE_IDS = ["sisbov", "chip", "rfid", "brinco", "ear_tag"] as const;
// Rótulo exibido. SISBOV é tratado hoje como PNIB (mesmo número, framing atual).
const ID_LABELS: Record<string, string> = {
  sisbov: "PNIB",
  chip: "CHIP",
  rfid: "RFID",
  brinco: "BRINCO",
  ear_tag: "BRINCO",
};

function shortHash(v: string, head = 8, tail = 6): string {
  return v.length <= head + tail + 1 ? v : `${v.slice(0, head)}…${v.slice(-tail)}`;
}

// Agrupa os passos do auditor sob as 3 coisas do "em resumo". Os passos vêm do backend
// como texto PT com um rótulo no início; casa pelo prefixo. Sobras caem em "outros".
const STEP_GROUPS: { key: string; labelKey: string; match: RegExp }[] = [
  { key: "exists", labelKey: "v.g_exists", match: /^(Existência|Ligação transação)/i },
  { key: "intact", labelKey: "v.g_intact", match: /^(Material|Ligação CID|Integridade|Commitment)/i },
  { key: "who", labelKey: "v.g_who", match: /^Autoria/i },
];

// Página pública /v/:dfid (#8, Nível 0). Direção "selo minimalista": veredito + 1 ação;
// todo o detalhe atrás de um único "Como isto é provado?". Sem login. Anti-AI #55: cor + texto.

function fmtDate(s?: string | null): string {
  if (!s) return "";
  return s.replace("T", " ").slice(0, 16) + (s.length > 10 ? " UTC" : "");
}

// Marca decorativa por value chain (contorno, transparente) — dá alma ao selo sem poluir.
// BEEF = silhueta de bovino. Fácil de estender (soja, leite…) por value_chain.
// ---- Estética de documento (segurança tipo passaporte/cédula) ----

// Rosácea guilloché (hipotrocoide fechada) — o padrão de segurança. Path computado 1x.
function guillochePath(cx = 200, cy = 200, scale = 1, n = 1600): string {
  const Rf = 100,
    rr = 64,
    d = 90,
    turns = 16,
    k = (Rf - rr) / rr;
  let s = "";
  for (let i = 0; i <= n; i++) {
    const t = (2 * Math.PI * turns * i) / n;
    const x = cx + ((Rf - rr) * Math.cos(t) + d * Math.cos(k * t)) * scale;
    const y = cy + ((Rf - rr) * Math.sin(t) - d * Math.sin(k * t)) * scale;
    s += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
  }
  return s;
}
function Guilloche({ className, opacity = 0.11 }: { className?: string; opacity?: number }) {
  const d = useMemo(() => guillochePath(200, 200, 1.32), []);
  return (
    <svg viewBox="0 0 400 400" className={className} fill="none" aria-hidden="true" style={{ opacity }}>
      <defs>
        {/* Radial = efeito MEDALHA: verde-vivo no miolo, escuro na borda. */}
        <radialGradient id="v-guilloche" cx="50%" cy="50%" r="52%">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="60%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--primary-deep))" />
        </radialGradient>
      </defs>
      <path d={d} stroke="url(#v-guilloche)" strokeWidth={0.7} />
    </svg>
  );
}
// 4 cantos ornamentais (moldura de certificado).
function CornerTicks() {
  const base = "pointer-events-none absolute h-3.5 w-3.5 border-primary/30";
  return (
    <div aria-hidden="true">
      <span className={`${base} left-4 top-4 rounded-tl-[3px] border-l border-t`} />
      <span className={`${base} right-4 top-4 rounded-tr-[3px] border-r border-t`} />
      <span className={`${base} bottom-4 left-4 rounded-bl-[3px] border-b border-l`} />
      <span className={`${base} bottom-4 right-4 rounded-br-[3px] border-b border-r`} />
    </div>
  );
}
// Faixa de microtexto (lê como linha fina; texto no zoom) — toque de passaporte.
function SecurityStrip({ label }: { label: string }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-9 bottom-[15px] overflow-hidden whitespace-nowrap text-center text-[6px] font-medium uppercase leading-none tracking-[0.34em] text-primary/25"
    >
      {` ${label} · `.repeat(28)}
    </div>
  );
}
// Marca d'água do Nelore (BEEF) — vetor recolorível, sangrando discreta.
function ChainMark({ chain }: { chain?: string }) {
  if ((chain || "").toUpperCase() !== "BEEF") return null;
  return (
    <NeloreMark
      className="pointer-events-none absolute -bottom-9 -right-10 h-56 w-56 text-primary sm:h-64 sm:w-64"
      style={{ opacity: 0.06 }}
    />
  );
}

// QR "diamante" da DeFarm (paridade com AssetQRCode da /i/:dfid): losango verde da
// marca + QR verde ao centro. Escaneia pra reabrir/compartilhar esta verificação.
function brandedQrUrl(url: string, size = 480): string {
  return `https://quickchart.io/qr?text=${encodeURIComponent(url)}&size=${size}&margin=0&dark=27C268&light=ffffff`;
}
function BrandedQR({ url, size = 116 }: { url: string; size?: number }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="QR">
      <rect x="22" y="22" width="76" height="76" rx="18" fill="hsl(var(--primary))" transform="rotate(45 60 60)" />
      <rect x="32" y="32" width="56" height="56" rx="14" fill="white" stroke="white" strokeWidth="6" transform="rotate(45 60 60) translate(5 -5)" />
      <image x="34" y="34" width="52" height="52" href={brandedQrUrl(url, 480)} transform="rotate(45 60 60) translate(5 -5)" />
    </svg>
  );
}

// ⓘ ao lado da "chave de ligação": popup animado, explica em palavras fáceis (técnico + curioso).
function LinkKeyInfo() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
        aria-label={t("v.link_key")}
        className="inline-flex text-muted-foreground transition-colors hover:text-foreground"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-full z-30 mt-2 w-60 -translate-x-1/2 rounded-xl border border-border bg-popover p-3 text-center font-sans text-[11.5px] font-normal leading-relaxed text-popover-foreground shadow-xl animate-in fade-in zoom-in-95 duration-150"
        >
          {t("v.link_key_info")}
        </span>
      )}
    </span>
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

// "YYYY-MM-DD" → data curta localizada, sem hora (a folha carrega o dia da consolidação).
function fmtDay(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  if (!y) return d;
  return new Date(y, (m || 1) - 1, day || 1).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Timeline de PRESENÇA (N1). Só renderiza quando há prova (FinTag); animal tradicional
// (Gerbov) → nada. A EXISTÊNCIA de uma prova por dia = a asserção daquele dia; cada linha
// abre a prova de inclusão (root do dia + folha + hashes irmãos), verificável de fora. A
// âncora on-chain do dia vive no /verify do lote. Nunca mostra o roster do lote.
function PresenceTimeline({
  proofs,
  issuerName,
}: {
  proofs: PublicInclusionProof[];
  issuerName: string | null;
}) {
  const { t } = useTranslation();
  if (!proofs.length) return null;
  const primaryDeep = "hsl(var(--primary-deep))";
  const amber = "hsl(38 92% 38%)";
  const muted = "hsl(var(--muted-foreground))";
  const loteDfid = proofs[0]?.lote_dfid;
  // #106 — recomputa CADA prova aqui no navegador (não confia no `verified` do servidor).
  const clientChecks = proofs.map(verifyInclusionInBrowser);
  const selfCheckable = clientChecks.filter((x) => x !== null).length;
  const selfOk = clientChecks.filter((x) => x === true).length;
  // Ícone/cor do estado. Sem rótulo aqui — o leigo lê a FRASE, não a etiqueta.
  const statusMeta = (s: PublicInclusionProof["status"]) => {
    if (s === "mismatch") return { color: amber, Icon: AlertTriangle };
    if (s === "unavailable") return { color: muted, Icon: Minus };
    return { color: primaryDeep, Icon: Check };
  };
  // A "matemática em português": o que o lacre garante, por estado.
  const sealedLine = (s: PublicInclusionProof["status"]) =>
    s === "mismatch"
      ? t("v.presence_sealed_mismatch")
      : s === "unavailable"
        ? t("v.presence_sealed_unavailable")
        : t("v.presence_sealed_ok");
  const techLabel = (s: PublicInclusionProof["status"]) =>
    s === "mismatch" ? t("v.presence_fail") : s === "unavailable" ? t("v.presence_unavailable") : t("v.presence_ok");
  return (
    <details className="group/pres mx-auto mt-4 max-w-[24rem] text-left">
      <summary className="flex cursor-pointer list-none items-center justify-center gap-1.5 font-mono text-[11.5px] text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
        <Activity className="h-3.5 w-3.5" style={{ color: "hsl(var(--primary))" }} />
        {t("v.presence_t")} · {t("v.presence_sub", { n: proofs.length })}
        <ChevronDown className="h-3 w-3 opacity-50 transition-transform group-open/pres:rotate-180" />
      </summary>
      <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-300">
        <p className="mb-3 text-[11.5px] leading-relaxed text-muted-foreground">{t("v.presence_intro")}</p>
        {/* #106 — o navegador recalculou, não confiou no servidor. O selo do "verifique você mesmo". */}
        {selfCheckable > 0 && (
          <div
            className="mb-3 flex items-start gap-1.5 rounded-lg border px-3 py-2 text-[11.5px] leading-relaxed"
            style={{
              borderColor: selfOk === selfCheckable ? "hsl(var(--primary) / 0.35)" : amber,
              background: selfOk === selfCheckable ? "hsl(var(--primary) / 0.06)" : "transparent",
              color: selfOk === selfCheckable ? primaryDeep : amber,
            }}
          >
            {selfOk === selfCheckable ? (
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            )}
            <span>{t("v.presence_selfcheck", { ok: selfOk, total: selfCheckable })}</span>
          </div>
        )}
        {/* A2 #189 — o denominador acima é do servidor; se ele excluir dias, dizemos quantos. */}
        {proofs.length - selfCheckable > 0 && (
          <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
            {t("v.presence_selfcheck_skipped", { n: proofs.length - selfCheckable })}
          </p>
        )}
        <ol className="space-y-1.5">
          {proofs.map((p, idx) => {
            const st = statusMeta(p.status);
            const self = clientChecks[idx];
            return (
              <li key={`${p.lote_dfid}-${p.day}`}>
                <details className="group/day rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-2 text-[12.5px]">
                      <span className="font-medium text-foreground">{fmtDay(p.day)}</span>
                      <span className="inline-flex items-center gap-1 font-medium" style={{ color: st.color }}>
                        <st.Icon className="h-3.5 w-3.5" />
                        {t("v.presence_asserted")}
                      </span>
                    </span>
                    <ChevronDown className="h-3 w-3 opacity-50 transition-transform group-open/day:rotate-180" />
                  </summary>
                  <div className="mt-2 space-y-2 border-t border-border/50 pt-2">
                    {/* 1) A palavra de quem: registrado por [emissor]. */}
                    {issuerName && (
                      <p className="text-[12px] leading-relaxed text-foreground/85">
                        {t("v.presence_registered_by")} <span className="font-medium">{issuerName}</span> · {fmtDay(p.day)}.
                      </p>
                    )}
                    {/* 2) A matemática em português: lacrado, não dá pra alterar. */}
                    <p
                      className="text-[11.5px] leading-relaxed"
                      style={{ color: p.status === "mismatch" ? amber : "hsl(var(--muted-foreground))" }}
                    >
                      {sealedLine(p.status)}
                    </p>
                    {/* 3) A cripto = material de auditoria, um clique a mais. */}
                    <details className="group/tech">
                      <summary className="flex cursor-pointer list-none items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground/70 hover:text-foreground [&::-webkit-details-marker]:hidden">
                        {t("v.presence_tech")}
                        <ChevronDown className="h-3 w-3 opacity-50 transition-transform group-open/tech:rotate-180" />
                      </summary>
                      <dl className="mt-1.5 space-y-1 font-mono text-[10.5px] leading-relaxed text-muted-foreground">
                        <div className="break-all">
                          <span className="text-foreground/60">{t("v.presence_fingerprint")}: </span>
                          {shortHash(p.root_hash, 10, 8)}
                        </div>
                        <div className="break-all">
                          <span className="text-foreground/60">{t("v.presence_leaf_label")}: </span>
                          {shortHash(p.leaf_hash, 10, 8)}
                        </div>
                        <div>
                          <span className="text-foreground/60">{t("v.presence_inclusion")}: </span>
                          <span style={{ color: st.color }}>{techLabel(p.status)}</span> · {p.proof_path.length}{" "}
                          {t("v.presence_steps")}
                        </div>
                        {self !== null && (
                          <div>
                            <span className="text-foreground/60">{t("v.presence_selfcheck_day")}: </span>
                            <span style={{ color: self ? primaryDeep : amber }}>
                              {self ? t("v.presence_ok") : t("v.presence_fail")}
                            </span>
                          </div>
                        )}
                      </dl>
                    </details>
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
        {loteDfid && (
          <a
            href={`/v/${loteDfid}`}
            className="mt-2.5 inline-block font-mono text-[10.5px] hover:underline"
            style={{ color: primaryDeep }}
          >
            {t("v.presence_open_lote")} →
          </a>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{t("v.presence_honesty")}</p>
      </div>
    </details>
  );
}

// A1 — eventos de PROCESSO (encanamento): subida ao IPFS + ancoragem on-chain. NÃO são vida
// do animal; vão pra uma gaveta técnica separada. Sem isto, o "X/Y íntegros" somava uploads
// como se fossem a biografia do boi (Hetzner mediu 87% meta; 62% dos itens só têm encanamento).
const isMetaEvent = (type: string): boolean =>
  type.startsWith("blockchain_") ||
  type.startsWith("ipfs_") ||
  type.startsWith("anchor_") || // ex.: anchor_retry — não deixar encanamento futuro contar como vida (Hetzner: fail-open na direção errada)
  type === "cid_update";

// Lista compacta "tipo → íntegro/não bate" pra um grupo de eventos já recomputados.
function EventIntegrityList({
  events,
  checks,
}: {
  events: PublicItemEvent[];
  checks: (boolean | null)[];
}) {
  const { t } = useTranslation();
  const primaryDeep = "hsl(var(--primary-deep))";
  const amber = "hsl(38 92% 38%)";
  return (
    <ul className="space-y-1">
      {events.map((e, i) =>
        checks[i] === null ? null : (
          <li key={e.id} className="flex items-center justify-between gap-2 text-[11.5px]">
            <span className="font-mono text-[11px] text-foreground/80">{e.event_type}</span>
            <span
              className="inline-flex items-center gap-1 font-mono text-[10.5px]"
              style={{ color: checks[i] ? primaryDeep : amber }}
            >
              {checks[i] ? <Check className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
              {checks[i] ? t("v.events_intact") : t("v.events_fail")}
            </span>
          </li>
        ),
      )}
    </ul>
  );
}

// #106 parte 2 — "verifique os eventos você mesmo": o navegador recomputa o content_hash
// (integridade) de cada evento público, sem confiar no servidor. A frente conta só a
// BIOGRAFIA (eventos de vida/domínio); o encanamento vai pra uma gaveta técnica. Autoria por
// assinatura (Ed25519) vive nos eventos de vida.
function EventSelfCheck({ events }: { events: PublicItemEvent[] }) {
  const { t } = useTranslation();
  const primaryDeep = "hsl(var(--primary-deep))";
  const amber = "hsl(38 92% 38%)";

  const domain = events.filter((e) => !isMetaEvent(e.event_type));
  const meta = events.filter((e) => isMetaEvent(e.event_type));

  const domChecks = domain.map(verifyEventContentHashInBrowser);
  const domCheckable = domChecks.filter((x) => x !== null).length;
  const domOk = domChecks.filter((x) => x === true).length;
  const domAllOk = domOk === domCheckable;

  const metaChecks = meta.map(verifyEventContentHashInBrowser);
  const metaCheckable = metaChecks.filter((x) => x !== null).length;
  const metaOk = metaChecks.filter((x) => x === true).length;
  const metaAllOk = metaOk === metaCheckable;

  // Ed25519 (autoria) — a assinatura do contribuinte vive nos eventos de vida.
  const sigChecks = domain.map(verifyEventSignatureInBrowser);
  const signed = sigChecks.filter((x) => x !== null).length;
  const sigOk = sigChecks.filter((x) => x === true).length;
  const sigAllOk = sigOk === signed;

  if (!domCheckable && !metaCheckable) return null;

  return (
    <details className="group/ev mx-auto mt-2.5 max-w-[24rem] text-left">
      <summary className="flex cursor-pointer list-none items-center justify-center gap-1.5 font-mono text-[11.5px] text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
        <ShieldCheck className="h-3.5 w-3.5" style={{ color: "hsl(var(--primary))" }} />
        {t("v.events_t")} ·{" "}
        {domCheckable > 0 ? t("v.events_sub_domain", { n: domCheckable }) : t("v.events_sub_meta_only")}
        <ChevronDown className="h-3 w-3 opacity-50 transition-transform group-open/ev:rotate-180" />
      </summary>
      <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
        {domCheckable > 0 ? (
          <>
            <div
              className="flex items-start gap-1.5 rounded-lg border px-3 py-2 text-[11.5px] leading-relaxed"
              style={{
                borderColor: domAllOk ? "hsl(var(--primary) / 0.35)" : amber,
                background: domAllOk ? "hsl(var(--primary) / 0.06)" : "transparent",
                color: domAllOk ? primaryDeep : amber,
              }}
            >
              {domAllOk ? (
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              ) : (
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              )}
              <span>{t("v.events_selfcheck", { ok: domOk, total: domCheckable })}</span>
            </div>
            {/* A2 #189 — o denominador é do servidor; se ele excluir eventos, dizemos quantos. */}
            {domain.length - domCheckable > 0 && (
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {t("v.events_selfcheck_skipped", { n: domain.length - domCheckable })}
              </p>
            )}
            {signed > 0 && (
              <div
                className="flex items-start gap-1.5 rounded-lg border px-3 py-2 text-[11.5px] leading-relaxed"
                style={{
                  borderColor: sigAllOk ? "hsl(var(--primary) / 0.35)" : amber,
                  background: sigAllOk ? "hsl(var(--primary) / 0.06)" : "transparent",
                  color: sigAllOk ? primaryDeep : amber,
                }}
              >
                {sigAllOk ? (
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                )}
                <span>{t("v.events_sig_selfcheck", { ok: sigOk, total: signed })}</span>
              </div>
            )}
            {/* A3 (buraco A) — honestidade sobre a CIRCULARIDADE: o check prova que a
                assinatura bate com a chave pública informada, mas essa chave ainda é
                publicada pela própria DeFarm (sem âncora independente). Enquanto o C1 não
                ancorar as fingerprints, isto é consistência interna, não autoria à prova
                de terceiros. */}
            {signed > 0 && (
              <p className="text-[11px] leading-relaxed text-muted-foreground">{t("v.events_sig_caveat")}</p>
            )}
            <EventIntegrityList events={domain} checks={domChecks} />
          </>
        ) : (
          // 62% dos itens só têm encanamento — não fingir "0/0 íntegros" verde.
          <p className="text-[11px] leading-relaxed text-muted-foreground">{t("v.events_no_domain")}</p>
        )}

        {/* Encanamento: registros do PROCESSO de ancoragem, honestamente rotulados. */}
        {metaCheckable > 0 && (
          <details className="group/meta">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
              {t("v.events_meta_drawer", { n: metaCheckable })}
              <ChevronDown className="h-3 w-3 opacity-50 transition-transform group-open/meta:rotate-180" />
            </summary>
            <div className="mt-2 space-y-2">
              <p className="text-[11px] leading-relaxed text-muted-foreground">{t("v.events_meta_note")}</p>
              <div
                className="flex items-start gap-1.5 rounded-lg border px-3 py-2 text-[11.5px] leading-relaxed"
                style={{
                  borderColor: metaAllOk ? "hsl(var(--primary) / 0.35)" : amber,
                  background: metaAllOk ? "hsl(var(--primary) / 0.06)" : "transparent",
                  color: metaAllOk ? primaryDeep : amber,
                }}
              >
                {metaAllOk ? (
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                )}
                <span>{t("v.events_meta_selfcheck", { ok: metaOk, total: metaCheckable })}</span>
              </div>
              <EventIntegrityList events={meta} checks={metaChecks} />
            </div>
          </details>
        )}

        <p className="text-[11px] leading-relaxed text-muted-foreground">{t("v.events_honesty")}</p>
      </div>
    </details>
  );
}

// Card de EMISSOR + NÍVEL DE ASSINATURA (N1). "Quem assinou e com que força, sem mudar de
// forma": hoje N0 (Ed25519 do workspace); o mesmo lugar carregará ICP-Brasil/gov.br depois.
// Nome resolvido pelo auth-service; UUID nunca aparece cru.
function SignatureCard({
  issuer,
  issuerId,
  pubkey,
  verified,
}: {
  issuer: PublicWorkspace | null;
  issuerId: string | null;
  pubkey: string | null;
  verified: boolean;
}) {
  const { t } = useTranslation();
  if (!issuerId && !issuer) return null;
  const primaryDeep = "hsl(var(--primary-deep))";
  const muted = "hsl(var(--muted-foreground))";
  const name = issuer?.name ?? t("v.sig_issuer_generic");
  const label = (s: string) => (
    <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{s}</div>
  );
  return (
    <details className="group/sig mx-auto mt-2.5 max-w-[24rem] text-left">
      <summary className="flex cursor-pointer list-none items-center justify-center gap-1.5 font-mono text-[11.5px] text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
        <BadgeCheck className="h-3.5 w-3.5" style={{ color: verified ? primaryDeep : muted }} />
        <span>
          {verified ? `${t("v.sig_by")} ${name}` : `${t("v.sig_emissor")}: ${name}`}
        </span>
        {verified && <Check className="h-3 w-3" style={{ color: primaryDeep }} />}
        <ChevronDown className="h-3 w-3 opacity-50 transition-transform group-open/sig:rotate-180" />
      </summary>
      <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
        <div>
          {label(t("v.sig_emissor"))}
          <div className="mt-0.5 text-[13px] font-medium text-foreground">
            {name}
            {issuer && <span className="text-muted-foreground"> · {t("v.sig_ws_verified")}</span>}
          </div>
        </div>
        {pubkey && (
          <div>
            {label(t("v.sig_pubkey"))}
            <div className="mt-0.5 break-all font-mono text-[11px] text-foreground/80">{pubkey}</div>
          </div>
        )}
        <div>
          {label(t("v.sig_level_k"))}
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">{t("v.sig_level_d")}</p>
        </div>
      </div>
    </details>
  );
}

export default function PublicVerify() {
  const { t, i18n } = useTranslation();
  const { dfid = "" } = useParams<{ dfid: string }>();
  const [loading, setLoading] = useState(true);
  const [res, setRes] = useState<PublicVerifyResponse | null>(null);
  const [item, setItem] = useState<PublicItem | null>(null);
  const [inclusion, setInclusion] = useState<PublicInclusionProof[]>([]);
  const [pubEvents, setPubEvents] = useState<PublicItemEvent[]>([]);
  const [issuer, setIssuer] = useState<PublicWorkspace | null>(null);
  const [error, setError] = useState(false);
  // Dark mode ESCOPADO só a esta página (classe .dark no wrapper → tokens do index.css).
  // Futuramente vira global da DeFarm; por ora, só o certificado. Lembra a escolha.
  const [dark, setDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem("defarm-v-theme") === "dark";
    } catch {
      return false;
    }
  });
  const toggleDark = () => {
    setDark((d) => {
      const next = !d;
      try {
        localStorage.setItem("defarm-v-theme", next ? "dark" : "light");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setItem(null);
    setRes(null);
    // Passa o idioma atual → backend devolve o recipe (steps/fórmulas) traduzido.
    // Re-busca ao trocar de idioma (i18n.language nas deps).
    verifyPublicItem(dfid, i18n.language)
      .then((r) => !cancelled && setRes(r))
      .catch(() =>
        // Um DFID recém-criado pode existir publicamente antes da verificação on-chain
        // estar pronta. O /v continua apresentável, mas sem alegar "verificado".
        getPublicItem(dfid)
          .then((it) => {
            if (cancelled) return;
            setItem(it);
            setError(false);
          })
          .catch(() => !cancelled && setError(true))
      )
      .finally(() => !cancelled && setLoading(false));
    // Metadata pública (best-effort) só pra exibir o identificador canônico mascarado.
    getPublicItem(dfid)
      .then((it) => !cancelled && setItem(it))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [dfid, i18n.language]);

  // Prova de presença (N1, best-effort, independe do idioma). Vazio → sem seção de presença.
  useEffect(() => {
    let cancelled = false;
    setInclusion([]);
    getPublicInclusionProofs(dfid)
      .then((p) => !cancelled && setInclusion(p))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [dfid]);

  // Eventos públicos (com payload/metadata) pro "verifique você mesmo" (#106 parte 2).
  // Best-effort; vazio (ex.: animal de presença) → sem seção de eventos.
  useEffect(() => {
    let cancelled = false;
    setPubEvents([]);
    // lossless: preserva literais numéricos pro recompute do content_hash bater com o
    // serde_json do backend (390.0 não vira 390). Ver getPublicItemEventsLossless.
    getPublicItemEventsLossless(dfid)
      .then((ev) => !cancelled && setPubEvents(ev))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [dfid]);

  // Emissor (N1): resolve o nome do workspace (auth-service, best-effort). Animais de
  // PRESENÇA não têm evento público próprio (a presença é privada) → o emissor é o do LOTE
  // (que tem os lote_presence_root públicos). UUID nunca aparece cru.
  useEffect(() => {
    let cancelled = false;
    setIssuer(null);
    (async () => {
      let id =
        res?.events?.find((e) => e.signature_verified === true)?.issuer_workspace_id ??
        res?.issuers?.[0] ??
        res?.events?.find((e) => !!e.issuer_workspace_id)?.issuer_workspace_id ??
        null;
      if (!id && inclusion.length > 0) {
        try {
          const lote = await verifyPublicItem(inclusion[0].lote_dfid);
          id =
            lote?.issuers?.[0] ??
            lote?.events?.find((e) => !!e.issuer_workspace_id)?.issuer_workspace_id ??
            null;
        } catch {
          /* ignore */
        }
      }
      if (!id || cancelled) return;
      const w = await getPublicWorkspace(id).catch(() => null);
      if (!cancelled) setIssuer(w);
    })();
    return () => {
      cancelled = true;
    };
  }, [res, inclusion]);

  // Identificador(es) canônico(s) do animal, já mascarados pelo backend (ex.: "SISBOV •••• 99002").
  const meta = (item?.metadata ?? {}) as Record<string, unknown>;
  const canonicalIds = SENSITIVE_IDS.map((k) => {
    const v = typeof meta[k] === "string" ? (meta[k] as string) : null;
    const commit = (meta[`${k}_commitment`] as { value?: string } | undefined)?.value ?? null;
    return { k, v, commit };
  }).filter((x): x is { k: (typeof SENSITIVE_IDS)[number]; v: string; commit: string | null } => !!x.v);

  const displayDfid = res?.dfid ?? item?.dfid ?? dfid;
  const displayChain = res?.identity?.value_chain ?? item?.value_chain;
  const anchor = res?.anchor ?? null;
  const anchorState: AnchorState = anchorStateOf(anchor?.status);
  const events = res?.events ?? [];
  const signed = events.filter((e) => e.signature_verified === true);
  const sigFailed = events.some((e) => e.signature_verified === false);
  const hasIntegrityMaterial = !!anchor?.snapshot_hash || events.some((e) => !!e.content_hash);
  const hasRoots = !!(anchor?.anchor_content_root || anchor?.events_root || anchor?.commitments_root);
  const eventsMaybeTruncated = events.length >= 200; // veredito sobre a amostra (H5)

  // Emissor + chave pública pro card de assinatura (N1). issuerId só pra saber se há emissor.
  const issuerId =
    signed[0]?.issuer_workspace_id ??
    res?.issuers?.[0] ??
    events.find((e) => !!e.issuer_workspace_id)?.issuer_workspace_id ??
    null;
  const issuerPubkey = signed[0]?.signature_public_key_b64 ?? null;

  const primary = "hsl(var(--primary))";
  const primaryDeep = "hsl(var(--primary-deep))";
  const amber = "hsl(38 92% 38%)";
  const destructive = "hsl(var(--destructive))";
  const muted = "hsl(var(--muted-foreground))";

  // Veredito honesto, derivado dos dados (ver notas nos 4 estados).
  const verdict: "attention" | "verified" | "anchored" | "pending" = !res
    ? "pending"
    : sigFailed
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
    <div className={`min-h-screen bg-background text-foreground ${dark ? "dark" : ""}`}>
      <Header />
      <main className="relative pt-24 pb-20">
        {/* Fundo um pouco mais escuro (light) + vinheta ao redor → o cartão-documento ganha destaque. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(74% 54% at 50% 32%, rgba(0,0,0,0.06) 34%, rgba(0,0,0,0.19) 100%)",
          }}
        />
        {/* Toggle de tema — fixo no canto, discreto mas sempre visível. Só desta página por enquanto. */}
        <button
          type="button"
          onClick={toggleDark}
          aria-label={dark ? "Tema claro" : "Tema escuro"}
          className="fixed bottom-5 right-5 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md transition-colors hover:text-foreground"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <div className="section-container relative max-w-xl">
          <div className="text-center text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {t("v.eyebrow")}
          </div>

          {loading ? (
            <div className="mt-16 flex items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> {t("v.loading")}
            </div>
          ) : error || (!res && !item) ? (
            <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <AlertTriangle className="mx-auto mb-3 h-7 w-7 text-muted-foreground" />
              <p className="text-[15px] font-semibold">{t("v.notfound_t")}</p>
              <p className="mx-auto mt-1 max-w-sm text-[13.5px] text-muted-foreground">{t("v.notfound_d")}</p>
              <p className="mt-3 break-all font-mono text-[12px] text-muted-foreground">{dfid}</p>
            </div>
          ) : (
            <>
              {/* SELO — veredito + 1 ação. O resto fica escondido. */}
              <div className="relative mt-6">
              {/* Glow externo: halo esverdeado atrás do cartão pra dar destaque de "documento". */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-4 rounded-[32px] opacity-80 blur-2xl"
                style={{ background: "radial-gradient(closest-side, hsl(var(--primary) / 0.22), transparent 78%)" }}
              />
              <section className="relative overflow-hidden rounded-[20px] border border-border bg-card px-7 py-10 text-center shadow-[0_2px_4px_-2px_rgba(0,0,0,0.12),0_24px_64px_-28px_hsl(var(--primary)/0.4)] sm:px-10">
                {/* Camada de segurança (documento): guilloché central + Nelore, bem fracos. */}
                <Guilloche className="pointer-events-none absolute left-1/2 top-[46%] h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 sm:h-[440px] sm:w-[440px]" opacity={0.11} />
                <ChainMark chain={displayChain} />
                {/* Moldura dupla + cantos + microtexto = ar de certificado. */}
                <div className="pointer-events-none absolute inset-[10px] rounded-2xl border border-primary/15" aria-hidden="true" />
                <CornerTicks />
                <SecurityStrip label={`DeFarm · ${t("v.eyebrow")}`} />
                <div className="relative z-10">
                {/* QR diamante da DeFarm → reabre/compartilha esta verificação. */}
                <div className="mx-auto w-fit">
                  <BrandedQR url={`https://defarm.net/v/${displayDfid}`} size={116} />
                </div>
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
                    <p className="break-all font-mono text-[13px] font-medium tracking-tight">{displayDfid}</p>
                  {canonicalIds.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap justify-center gap-x-5 gap-y-1">
                      {canonicalIds.map((x) => (
                        <details key={x.k} className="group/id">
                          <summary
                            className="flex cursor-pointer list-none items-center gap-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden"
                            title={x.commit ? t("v.link_key") : undefined}
                          >
                            {ID_LABELS[x.k] ?? x.k.toUpperCase()} {x.v}
                            {x.commit && (
                              <ChevronDown className="h-3 w-3 opacity-50 transition-transform group-open/id:rotate-180" />
                            )}
                          </summary>
                          {x.commit && (
                            <div className="mt-1 flex items-center justify-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                              <span>
                                {t("v.link_key")}: {shortHash(x.commit)}
                              </span>
                              <LinkKeyInfo />
                            </div>
                          )}
                        </details>
                      ))}
                    </div>
                  )}
                  {anchor && (() => {
                    // Data de EXISTÊNCIA (a alegação forte) = first_anchored_at, não a âncora de
                    // conteúdo mais recente — que num item re-ancorado seria "hoje" (Hetzner #483 A2).
                    // Fallback pro anchored_at em respostas antigas sem o campo.
                    const first = res?.first_anchored_at ?? anchor.anchored_at;
                    // Refresh = a âncora servida (conteúdo atual, pra onde o botão do explorer aponta)
                    // é mais nova que a primeira. Mostrar as DUAS datas conta a história do C1d e
                    // resolve a confusão "data de junho + tx de hoje" (Hetzner #483 minor). As datas
                    // vêm em formatos diferentes (RFC3339 vs texto Postgres) — comparar por INSTANTE,
                    // não string; >1s evita ruído de precisão.
                    const refreshed =
                      !!res?.first_anchored_at &&
                      new Date(anchor.anchored_at).getTime() - new Date(first).getTime() > 1000;
                    return (
                      <p className="mt-1 font-mono text-[11.5px] text-muted-foreground">
                        {fmtDate(first)}
                        {refreshed
                          ? ` · ${t("v.content_updated")} ${fmtDate(anchor.anchored_at)}`
                          : ""}
                        {anchor.network && anchor.network !== "public" ? ` · ${anchor.network}` : ""}
                      </p>
                    );
                  })()}
                  {/* Presença (N1) — discreto, abaixo do DFID/PNIB. Só aparece se houver prova. */}
                  <PresenceTimeline proofs={inclusion} issuerName={issuer?.name ?? null} />
                  {/* Emissor + nível de assinatura (N1) — quem assinou e com que força. */}
                  <SignatureCard
                    issuer={issuer}
                    issuerId={issuerId}
                    pubkey={issuerPubkey}
                    verified={signed.length > 0}
                  />
                  {/* #106 parte 2 — verifique os eventos você mesmo (só p/ animal com eventos públicos). */}
                  <EventSelfCheck events={pubEvents} />
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
              </div>

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
                  {res?.verification && (
                    <details className="group/tech border-t border-border/60 pt-4">
                      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                        {t("v.tech_t")}
                        <ChevronDown className="h-3.5 w-3.5 transition-transform group-open/tech:rotate-180" />
                      </summary>
                      <div className="mt-3 space-y-3">
                        <p className="text-[12px] leading-relaxed text-muted-foreground">{t("v.tech_d")}</p>
                        {/* Passos agrupados sob as 3 coisas do "em resumo" (Existe / Íntegro / Quem). */}
                        {(() => {
                          const steps = res.verification!.steps;
                          const other: string[] = [];
                          const buckets = STEP_GROUPS.map((g) => ({ g, items: [] as string[] }));
                          steps.forEach((s) => {
                            const b = buckets.find((b) => b.g.match.test(s));
                            (b ? b.items : other).push(s);
                          });
                          const block = (key: string, label: string, items: string[]) =>
                            items.length ? (
                              <div key={key}>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-primary">{label}</div>
                                <ul className="mt-1.5 space-y-1.5">
                                  {items.map((s, i) => (
                                    <li key={i} className="flex gap-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
                                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary/60" aria-hidden="true" />
                                      <span>{s}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null;
                          return (
                            <div className="space-y-4">
                              {buckets.map(({ g, items }) => block(g.key, t(g.labelKey), items))}
                              {block("other", t("v.g_other"), other)}
                            </div>
                          );
                        })()}
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
                            {/* A2 (buraco D) — só mostra a content root quando ela está DE FATO
                                ancorada on-chain. Enquanto content_root_onchain=false ela é uma
                                promessa computada no DB, não prova; a linha de binding acima já
                                diz "none". Volta a aparecer quando o C1 a mover pros args do contrato. */}
                            {hasRoots && anchor?.anchor_content_root && anchor?.content_root_onchain && (
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

              <p className="mt-8 text-center font-mono text-[11px] text-muted-foreground">defarm.net/v/{displayDfid}</p>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
