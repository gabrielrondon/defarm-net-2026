import { Tag, MapPin, Wheat, Calendar, Link2, ExternalLink, Hash, Database } from "lucide-react";
import { Item, IdentifierResponse, AdapterBlockchainAnchor, AdapterStorageRef, ItemVersionInfo } from "@/lib/defarm-api";
import { formatTime } from "./constants";

interface ItemIdentifiersProps {
  item: Item;
  identifiers?: IdentifierResponse[];
  canonicalIdentifier?: IdentifierResponse | null;
  blockchainAnchors?: AdapterBlockchainAnchor[];
  storageRefs?: AdapterStorageRef[];
  versions?: ItemVersionInfo[];
}

function StellarLink({ anchor }: { anchor: AdapterBlockchainAnchor }) {
  const txHash = anchor.transaction_hash || "";
  if (!txHash) return null;
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

export function ItemIdentifiers({ item, identifiers = [], canonicalIdentifier, blockchainAnchors = [], storageRefs = [], versions = [] }: ItemIdentifiersProps) {
  const metadata = item?.metadata || {};
  const metadataEntries = Object.entries(metadata);
  const itemId = item?.id ?? "";
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
            <h2 className="text-lg font-semibold text-foreground">Informações</h2>
            <p className="text-sm text-muted-foreground">Dados do item</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Wheat className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase">
                Cadeia de Valor
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
                País
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
                Ano / Safra
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
              <h2 className="text-lg font-semibold text-foreground">Identificadores</h2>
              <p className="text-sm text-muted-foreground">{identifiers.length} registrado(s)</p>
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
                        canônico
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
              <h2 className="text-lg font-semibold text-foreground">Tokenização</h2>
              <p className="text-sm text-muted-foreground">Anchors blockchain & IPFS</p>
            </div>
          </div>

          {blockchainAnchors.length > 0 && (
            <div className="space-y-2 mb-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Stellar ({blockchainAnchors.length})
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
                      Asset: <span className="font-mono text-foreground">{anchor.asset_code}</span>
                    </p>
                  )}
                  {anchor.memo && (
                    <p className="text-xs text-muted-foreground truncate">
                      Memo: <span className="font-mono text-foreground">{anchor.memo}</span>
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
                Histórico de CIDs ({storageRefs.length + versions.length})
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
                            atual
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
                            atual
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
        <h3 className="text-sm font-semibold text-foreground mb-4">Metadados</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Criado em</span>
            <span className="text-foreground">
              {formatTime(item?.registered_at || item?.created_at)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Última atualização</span>
            <span className="text-foreground">
              {formatTime(item?.last_updated_at || item?.updated_at)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">ID</span>
            <span className="text-foreground font-mono text-xs">
              {itemId.length > 15
                ? `${itemId.slice(0, 15)}...`
                : itemId || "-"}
            </span>
          </div>
          {item?.merged_into && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Merged into</span>
              <span className="text-foreground font-mono text-xs">{item.merged_into}</span>
            </div>
          )}
          {item?.split_from && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Split from</span>
              <span className="text-foreground font-mono text-xs">{item.split_from}</span>
            </div>
          )}
        </div>
      </div>

      {/* Custom Metadata */}
      {metadataEntries.length > 0 && (
        <div className="bg-background border border-border rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Dados Adicionais
          </h3>
          <div className="space-y-2">
            {metadataEntries.map(([key, value]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{key}</span>
                <span className="text-foreground">
                  {typeof value === "object" ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
