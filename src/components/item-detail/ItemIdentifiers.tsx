import { Tag, MapPin, Wheat, Calendar, Link2, ExternalLink, Hash, Database } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Item, IdentifierResponse, AdapterBlockchainAnchor, AdapterStorageRef, ItemVersionInfo } from "@/lib/defarm-api";
import { anchorStateOf } from "@/components/proof";
import { formatTime } from "./constants";
import { useQueries } from "@tanstack/react-query";
import { getPublicWorkspace } from "@/lib/api/workspaces";
import type { FieldProvenance } from "@/lib/api/types";

interface ItemIdentifiersProps {
  item: Item;
  identifiers?: IdentifierResponse[];
  canonicalIdentifier?: IdentifierResponse | null;
  blockchainAnchors?: AdapterBlockchainAnchor[];
  storageRefs?: AdapterStorageRef[];
  versions?: ItemVersionInfo[];
  /** T3: per-field provenance of the composed metadata (only present when the item
   *  was fetched with `?include=provenance`). */
  provenance?: Record<string, FieldProvenance> | null;
}

function StellarLink({ anchor }: { anchor: AdapterBlockchainAnchor }) {
  const { t } = useTranslation();
  const txHash = anchor.transaction_hash || "";
  // #151 Fase C: só anchor CONFIRMADO on-chain expõe o hash/explorer como prova.
  // pending = ainda em confirmação; failed/qualquer não-confirmado = não ancorado.
  const state = anchorStateOf(anchor.status);
  if (state !== "confirmed" || !txHash) {
    return (
      <span className="text-xs text-muted-foreground">
        {state === "pending" ? t("portal.items.detail.identifiers.stellarConfirming") : t("portal.items.detail.identifiers.notAnchored")}
      </span>
    );
  }
  const explorerUrl = anchor.stellar_url ||
    `https://stellar.expert/explorer/public/tx/${txHash}`;
  return (
    <a
      href={explorerUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 text-xs text-primary hover:underline font-mono truncate"
    >
      <ExternalLink className="h-3 w-3 flex-shrink-0" />
      {txHash.slice(0, 12)}...{txHash.slice(-6)}
    </a>
  );
}

function IpfsLink({ storageRef }: { storageRef: AdapterStorageRef }) {
  const cid = storageRef.cid || (storageRef as any).content_id || "";
  if (!cid) return null;
  const gatewayUrl = storageRef.gateway_url || 
    `https://gateway.pinata.cloud/ipfs/${cid}`;
  return (
    <a
      href={gatewayUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 text-xs text-primary hover:underline font-mono truncate"
    >
      <ExternalLink className="h-3 w-3 flex-shrink-0" />
      {cid.slice(0, 16)}...
    </a>
  );
}

export function ItemIdentifiers({ item, identifiers = [], canonicalIdentifier, blockchainAnchors = [], storageRefs = [], versions = [], provenance }: ItemIdentifiersProps) {
  const { t } = useTranslation();
  const metadata = item?.metadata || {};
  const metadataEntries = Object.entries(metadata);
  const itemId = item?.id ?? "";

  // T3: resolve the distinct source workspaces of the metadata provenance to names
  // (never surface a raw UUID — Hetzner). Legacy-origin fields carry no workspace.
  const provenanceWorkspaceIds = provenance
    ? Array.from(
        new Set(
          Object.values(provenance)
            .map((p) => p.source_workspace_id)
            .filter((x): x is string => !!x),
        ),
      )
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

  // A muted one-liner under each metadata value: who asserted it (resolved name),
  // its trust tier, and whether it reached us via a consented feed vs our own data.
  const renderProvenance = (key: string) => {
    const p = provenance?.[key];
    if (!p) return null;
    if (p.origin === "legacy") {
      return <span className="text-[10px] text-muted-foreground">{t("portal.items.detail.identifiers.provLegacy")}</span>;
    }
    // `||` (not `??`) so an empty resolved name ("") also falls back.
    const who = workspaceName(p.source_workspace_id) || t("portal.items.detail.identifiers.provOtherOrigin");
    const trust = p.trust_level ? ` · ${p.trust_level}` : "";
    const shared = p.via === "feed" ? ` · ${t("portal.items.detail.identifiers.provShared")}` : "";
    return (
      <span className="text-[10px] text-muted-foreground">
        {t("portal.items.detail.identifiers.provBy", { who })}
        {trust}
        {shared}
      </span>
    );
  };
  const hasAnchors = blockchainAnchors.length > 0 || storageRefs.length > 0;

  return (
    <div className="lg:col-span-1 space-y-6">
      {/* Item Info */}
      <div className="bg-background border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Tag className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t("portal.items.detail.identifiers.infoTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("portal.items.detail.identifiers.infoDesc")}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Wheat className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase">
                {t("portal.items.detail.identifiers.valueChain")}
              </span>
            </div>
            <p className="text-sm font-medium text-foreground">
              {item?.value_chain || "-"}
            </p>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase">
                {t("portal.items.detail.identifiers.country")}
              </span>
            </div>
            <p className="text-sm font-medium text-foreground">
              {item?.country || "-"}
            </p>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase">
                {t("portal.items.detail.identifiers.yearSeason")}
              </span>
            </div>
            <p className="text-sm font-medium text-foreground">
              {item?.year || "-"}
            </p>
          </div>
        </div>
      </div>

      {/* Identifiers (unified: canonical highlighted + others) */}
      {identifiers.length > 0 && (
        <div className="bg-background border border-border rounded-2xl p-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border mb-4">
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
              <Hash className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t("portal.items.detail.identifiers.title")}</h2>
              <p className="text-sm text-muted-foreground">{t("portal.items.detail.identifiers.registered", { count: identifiers.length })}</p>
            </div>
          </div>
          <div className="space-y-2">
            {identifiers.map((ident, i) => {
              const isCan = ident.is_canonical || (canonicalIdentifier && ident.value === canonicalIdentifier.value);
              return (
                <div
                  key={i}
                  className={`p-3 rounded-lg ${
                    isCan
                      ? "bg-amber-500/5 border border-amber-500/20"
                      : "bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {isCan && <span className="text-amber-500 text-xs">★</span>}
                    <span className="text-xs font-medium text-muted-foreground uppercase">
                      {ident.identifier_type}
                    </span>
                    {isCan && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-medium">
                        {t("portal.items.detail.identifiers.canonical")}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-foreground font-mono">{ident.value}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Blockchain Anchors (Tokenization) */}
      {hasAnchors && (
        <div className="bg-background border border-border rounded-2xl p-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border mb-4">
            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
              <Database className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t("portal.items.detail.identifiers.tokenization")}</h2>
              <p className="text-sm text-muted-foreground">{t("portal.items.detail.identifiers.anchorsSubtitle")}</p>
            </div>
          </div>

          {blockchainAnchors.length > 0 && (
            <div className="space-y-2 mb-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("portal.items.detail.identifiers.stellarCount", { count: blockchainAnchors.length })}
              </h4>
              {blockchainAnchors.map((anchor, i) => (
                <div key={i} className="p-3 bg-purple-500/5 border border-purple-500/10 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{anchor.network}</span>
                    <span className="text-[10px] text-muted-foreground">{formatTime(anchor.created_at)}</span>
                  </div>
                  <StellarLink anchor={anchor} />
                  {anchor.asset_code && (
                    <p className="text-xs text-muted-foreground">
                      {t("portal.items.detail.identifiers.asset")} <span className="font-mono text-foreground">{anchor.asset_code}</span>
                    </p>
                  )}
                  {anchor.memo && (
                    <p className="text-xs text-muted-foreground truncate">
                      {t("portal.items.detail.identifiers.memo")} <span className="font-mono text-foreground">{anchor.memo}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Unified IPFS / CID History */}
          {(storageRefs.length > 0 || versions.length > 0) && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("portal.items.detail.identifiers.cidHistory", { count: storageRefs.length + versions.length })}
              </h4>
              {/* Show versions first (they have version numbers), then storageRefs as fallback */}
              {versions.length > 0 ? (
                versions.map((version) => (
                  <div
                    key={version.version}
                    className={`p-3 rounded-lg space-y-1 ${
                      version.is_latest
                        ? "bg-primary/5 border border-primary/20"
                        : "bg-muted/30 border border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        v{version.version}
                        {version.is_latest && (
                          <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                            {t("portal.items.detail.identifiers.current")}
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{formatTime(version.uploaded_at)}</span>
                    </div>
                    <a
                      href={version.gateway_url || `https://gateway.pinata.cloud/ipfs/${version.cid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline font-mono truncate"
                    >
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      {version.cid}
                    </a>
                    <p className="text-xs text-muted-foreground">
                      {version.storage_type} · {version.is_pinned ? "pinned" : "not pinned"}
                    </p>
                  </div>
                ))
              ) : (
                storageRefs.map((ref, i) => (
                  <div key={i} className={`p-3 rounded-lg space-y-1 ${
                    i === 0
                      ? "bg-primary/5 border border-primary/20"
                      : "bg-muted/30 border border-border"
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {ref.pin_status || "pinned"}
                        {i === 0 && (
                          <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                            {t("portal.items.detail.identifiers.current")}
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{formatTime(ref.created_at)}</span>
                    </div>
                    <IpfsLink storageRef={ref} />
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Metadata */}
      <div className="bg-background border border-border rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">{t("portal.items.detail.identifiers.metadata")}</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("portal.items.detail.identifiers.createdAt")}</span>
            <span className="text-foreground">
              {formatTime(item?.registered_at || item?.created_at)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("portal.items.detail.identifiers.lastUpdate")}</span>
            <span className="text-foreground">
              {formatTime(item?.last_updated_at || item?.updated_at)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("portal.items.detail.identifiers.idLabel")}</span>
            <span className="text-foreground font-mono text-xs">
              {itemId.length > 15
                ? `${itemId.slice(0, 15)}...`
                : itemId || "-"}
            </span>
          </div>
          {item?.merged_into && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("portal.items.detail.identifiers.mergedInto")}</span>
              <span className="text-foreground font-mono text-xs">{item.merged_into}</span>
            </div>
          )}
          {item?.split_from && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("portal.items.detail.identifiers.splitFrom")}</span>
              <span className="text-foreground font-mono text-xs">{item.split_from}</span>
            </div>
          )}
        </div>
      </div>

      {/* Custom Metadata */}
      {metadataEntries.length > 0 && (
        <div className="bg-background border border-border rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            {t("portal.items.detail.identifiers.additionalData")}
          </h3>
          <div className="space-y-2">
            {metadataEntries.map(([key, value]) => (
              <div key={key} className="flex justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{key}</span>
                <span className="flex flex-col items-end text-right">
                  <span className="text-foreground">
                    {typeof value === "object" ? JSON.stringify(value) : String(value)}
                  </span>
                  {renderProvenance(key)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
