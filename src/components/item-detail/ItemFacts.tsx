import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Copy, CheckCircle2, ExternalLink } from "lucide-react";
import { useQueries } from "@tanstack/react-query";
import { Item, IdentifierResponse, AdapterBlockchainAnchor, AdapterStorageRef, ItemVersionInfo } from "@/lib/defarm-api";
import { anchorStateOf } from "@/components/proof";
import { getPublicWorkspace } from "@/lib/api/workspaces";
import type { FieldProvenance } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { formatTime } from "./constants";

interface ItemFactsProps {
  item: Item;
  identifiers?: IdentifierResponse[];
  canonicalIdentifier?: IdentifierResponse | null;
  blockchainAnchors?: AdapterBlockchainAnchor[];
  storageRefs?: AdapterStorageRef[];
  versions?: ItemVersionInfo[];
  /** T3: per-field provenance of the composed metadata (only when fetched with `?include=provenance`). */
  provenance?: Record<string, FieldProvenance> | null;
}

/** Campos que já aparecem no topo da página (header + faixa de fatos). Repetir em
 *  "dados adicionais" é a redundância medida no #201: `value_chain`/`country`/`year`
 *  chegam duplicados dentro de `metadata` na ingestão. */
const TOP_LEVEL_KEYS = new Set(["value_chain", "country", "year", "dfid", "status", "artifact_type"]);

function shortMid(value: string, head = 10, tail = 6) {
  if (!value || value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

/** Um dado = um rótulo pequeno + um valor. Sem card, sem ícone, sem fundo. */
function Fact({ label, children, mono, className }: { label: string; children: React.ReactNode; mono?: boolean; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={cn("text-sm text-foreground", mono && "font-mono")}>{children}</dd>
    </div>
  );
}

export function ItemFacts({
  item,
  identifiers = [],
  canonicalIdentifier,
  blockchainAnchors = [],
  storageRefs = [],
  versions = [],
  provenance,
}: ItemFactsProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const metadata = item?.metadata || {};

  // Canônico: preferir o que o backend marcou como canonical_identifier. Quando mais de um
  // identificador vem com `is_canonical` (acontece: SISBOV + chip), o destaque é UM só e os
  // demais viram secundários — senão "canônico" deixa de significar alguma coisa.
  const canonical = canonicalIdentifier || identifiers.find((i) => i.is_canonical) || identifiers[0] || null;
  const others = identifiers.filter((i) => i.value !== canonical?.value);

  const confirmedAnchor = blockchainAnchors.find((a) => anchorStateOf(a.status) === "confirmed");
  const pendingAnchor = !confirmedAnchor && blockchainAnchors.some((a) => anchorStateOf(a.status) === "pending");
  const latestVersion = versions.find((v) => v.is_latest) || versions[0] || null;
  // alguns refs antigos trazem `content_id` no lugar de `cid`
  const legacyRef = storageRefs[0] as (AdapterStorageRef & { content_id?: string }) | undefined;
  const latestCid = latestVersion?.cid || legacyRef?.cid || legacyRef?.content_id || "";
  const latestCidUrl =
    latestVersion?.gateway_url ||
    storageRefs[0]?.gateway_url ||
    (latestCid ? `https://gateway.pinata.cloud/ipfs/${latestCid}` : "");

  const registeredAt = formatTime(item?.registered_at || item?.created_at);
  const updatedAtRaw = formatTime(item?.last_updated_at || item?.updated_at);
  // Só mostra "atualizado" quando de fato difere do registro — no dado real os dois
  // carimbos ficam a milissegundos um do outro e renderizavam a MESMA string duas vezes.
  const updatedAt = updatedAtRaw && updatedAtRaw !== registeredAt ? updatedAtRaw : null;

  // Dados adicionais sem eco: fora as chaves que já estão no topo e as que repetem
  // o valor de um identificador já exibido.
  const shownValues = new Set(identifiers.map((i) => String(i.value).toLowerCase()));
  const extraEntries = useMemo(
    () =>
      Object.entries(metadata).filter(([key, value]) => {
        if (TOP_LEVEL_KEYS.has(key.toLowerCase())) return false;
        const v = typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
        return !shownValues.has(v.toLowerCase());
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item?.id, identifiers.length, Object.keys(metadata).length],
  );

  // T3: resolve os workspaces de origem da proveniência (nunca expor UUID cru).
  const provenanceWorkspaceIds = provenance
    ? Array.from(new Set(Object.values(provenance).map((p) => p.source_workspace_id).filter((x): x is string => !!x)))
    : [];
  const workspaceQueries = useQueries({
    queries: provenanceWorkspaceIds.map((wsId) => ({
      queryKey: ["public-workspace", wsId],
      queryFn: () => getPublicWorkspace(wsId),
      staleTime: 5 * 60 * 1000,
    })),
  });
  const workspaceName = (wsId?: string): string | null => {
    if (!wsId) return null;
    const idx = provenanceWorkspaceIds.indexOf(wsId);
    return (idx >= 0 ? workspaceQueries[idx]?.data?.name : null) ?? null;
  };
  const legacyCount = provenance
    ? extraEntries.filter(([key]) => provenance[key]?.origin === "legacy").length
    : 0;
  /** Só rende linha de proveniência quando ela DIZ algo (quem asseverou). "legado" repetido
   *  em cada campo era ruído — vira uma nota única no rodapé do bloco. */
  const renderProvenance = (key: string) => {
    const p = provenance?.[key];
    if (!p || p.origin === "legacy") return null;
    const who = workspaceName(p.source_workspace_id) || t("portal.items.detail.identifiers.provOtherOrigin");
    const trust = p.trust_level ? ` · ${p.trust_level}` : "";
    const shared = p.via === "feed" ? ` · ${t("portal.items.detail.identifiers.provShared")}` : "";
    return (
      <span className="block text-[10px] text-muted-foreground">
        {t("portal.items.detail.identifiers.provBy", { who })}
        {trust}
        {shared}
      </span>
    );
  };

  const copyCanonical = () => {
    if (!canonical?.value) return;
    navigator.clipboard.writeText(String(canonical.value));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-background border border-border rounded-2xl">
      {/* Faixa principal: o que identifica e o que prova. Um dado, uma vez. */}
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 p-5">
        {canonical && (
          <div className="col-span-2">
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t("portal.items.detail.facts.canonicalOf", { type: canonical.identifier_type })}
            </dt>
            <dd className="flex items-center gap-2">
              <span className="text-base font-semibold font-mono text-foreground break-all">{canonical.value}</span>
              <button
                onClick={copyCanonical}
                aria-label={t("portal.items.detail.facts.copy")}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </dd>
          </div>
        )}

        <Fact label={t("portal.items.detail.identifiers.valueChain")}>{item?.value_chain || "—"}</Fact>
        <Fact label={t("portal.items.detail.facts.originYear")}>
          {[item?.country, item?.year].filter(Boolean).join(" · ") || "—"}
        </Fact>

        <Fact label={t("portal.items.detail.facts.anchor")} mono>
          {confirmedAnchor?.transaction_hash ? (
            <a
              href={confirmedAnchor.stellar_url || `https://stellar.expert/explorer/public/tx/${confirmedAnchor.transaction_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              {shortMid(confirmedAnchor.transaction_hash)}
            </a>
          ) : (
            <span className="font-sans text-muted-foreground">
              {pendingAnchor
                ? t("portal.items.detail.identifiers.stellarConfirming")
                : t("portal.items.detail.identifiers.notAnchored")}
            </span>
          )}
        </Fact>

        <Fact label={t("portal.items.detail.facts.content")} mono>
          {latestCid ? (
            <a
              href={latestCidUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              {shortMid(latestCid, 8, 6)}
              {latestVersion && <span className="font-sans text-muted-foreground">v{latestVersion.version}</span>}
            </a>
          ) : (
            <span className="font-sans text-muted-foreground">—</span>
          )}
        </Fact>

        {others.length > 0 && (
          <div className="col-span-2">
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t("portal.items.detail.facts.otherIdentifiers")}
            </dt>
            <dd className="flex flex-wrap gap-x-4 gap-y-1">
              {others.map((ident, i) => (
                <span key={i} className="text-sm text-foreground">
                  <span className="text-muted-foreground">{ident.identifier_type}: </span>
                  <span className="font-mono">{ident.value}</span>
                </span>
              ))}
            </dd>
          </div>
        )}
      </dl>

      {/* Secundário, fechado por padrão: nada aqui é necessário pra entender o item. */}
      <details className="group border-t border-border">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-sm text-muted-foreground hover:text-foreground">
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          {t("portal.items.detail.facts.technical")}
          {extraEntries.length > 0 && (
            <span className="text-xs">
              {t("portal.items.detail.facts.technicalCount", { count: extraEntries.length })}
            </span>
          )}
        </summary>

        <div className="space-y-5 px-5 pb-5">
          {extraEntries.length > 0 && (
            <div>
              <h3 className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                {t("portal.items.detail.identifiers.additionalData")}
              </h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                {extraEntries.map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-3 text-sm">
                    <dt className="text-muted-foreground">{key}</dt>
                    <dd className="text-right text-foreground break-all">
                      {typeof value === "object" ? JSON.stringify(value) : String(value)}
                      {renderProvenance(key)}
                    </dd>
                  </div>
                ))}
              </dl>
              {legacyCount > 0 && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {t("portal.items.detail.facts.legacyNote", { count: legacyCount })}
                </p>
              )}
            </div>
          )}

          {(versions.length > 1 || blockchainAnchors.length > 1 || storageRefs.length > 1) && (
            <div>
              <h3 className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                {t("portal.items.detail.facts.proofHistory")}
              </h3>
              <ul className="space-y-1 text-sm">
                {blockchainAnchors.map((anchor, i) => (
                  <li key={`a${i}`} className="flex items-baseline justify-between gap-3">
                    <span className="font-mono text-xs text-foreground break-all">
                      {anchor.transaction_hash ? shortMid(anchor.transaction_hash) : anchor.network}
                      <span className="ml-2 font-sans text-muted-foreground">{anchorStateOf(anchor.status)}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatTime(anchor.created_at)}</span>
                  </li>
                ))}
                {versions.map((v) => (
                  <li key={`v${v.version}`} className="flex items-baseline justify-between gap-3">
                    <span className="font-mono text-xs text-foreground break-all">
                      v{v.version} · {shortMid(v.cid, 8, 6)}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatTime(v.uploaded_at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t("portal.items.detail.identifiers.createdAt")}</dt>
              <dd className="text-foreground">{registeredAt}</dd>
            </div>
            {updatedAt && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("portal.items.detail.identifiers.lastUpdate")}</dt>
                <dd className="text-foreground">{updatedAt}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t("portal.items.detail.identifiers.idLabel")}</dt>
              <dd className="font-mono text-xs text-foreground break-all">{item?.id || "—"}</dd>
            </div>
            {item?.merged_into && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("portal.items.detail.identifiers.mergedInto")}</dt>
                <dd className="font-mono text-xs text-foreground break-all">{item.merged_into}</dd>
              </div>
            )}
            {item?.split_from && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("portal.items.detail.identifiers.splitFrom")}</dt>
                <dd className="font-mono text-xs text-foreground break-all">{item.split_from}</dd>
              </div>
            )}
          </dl>
        </div>
      </details>
    </div>
  );
}
