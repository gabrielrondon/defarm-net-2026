import { Tag, MapPin, Wheat, Calendar, Link2, ExternalLink, Hash, Database } from "lucide-react";
import { Item, IdentifierResponse, AdapterBlockchainAnchor, AdapterStorageRef } from "@/lib/defarm-api";
import { formatTime } from "./constants";

interface ItemIdentifiersProps {
  item: Item;
  identifiers?: IdentifierResponse[];
  canonicalIdentifier?: IdentifierResponse | null;
  blockchainAnchors?: AdapterBlockchainAnchor[];
  storageRefs?: AdapterStorageRef[];
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
  const cid = storageRef.cid || "";
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

export function ItemIdentifiers({ item, identifiers = [], canonicalIdentifier, blockchainAnchors = [], storageRefs = [] }: ItemIdentifiersProps) {
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

      {/* Canonical Identifier */}
      {canonicalIdentifier && (
        <div className="bg-background border border-border rounded-2xl p-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border mb-4">
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
              <Hash className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Identificador Canônico</h2>
              <p className="text-sm text-muted-foreground">Identificador primário</p>
            </div>
          </div>
          <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
            <div className="text-xs font-medium text-muted-foreground uppercase mb-1">
              {canonicalIdentifier.identifier_type}
            </div>
            <p className="text-sm font-bold text-foreground font-mono">
              {canonicalIdentifier.value}
            </p>
          </div>
        </div>
      )}

      {/* All Identifiers */}
      {identifiers.length > 0 && (
        <div className="bg-background border border-border rounded-2xl p-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border mb-4">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <Link2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Identificadores</h2>
              <p className="text-sm text-muted-foreground">{identifiers.length} registrado(s)</p>
            </div>
          </div>
          <div className="space-y-2">
            {identifiers.map((ident, i) => (
              <div key={i} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  {ident.is_canonical && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  )}
                  {ident.identifier_type}
                </span>
                <span className="text-foreground font-mono text-xs">
                  {ident.value.length > 20 ? `${ident.value.slice(0, 20)}...` : ident.value}
                </span>
              </div>
            ))}
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

          {storageRefs.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                IPFS ({storageRefs.length})
              </h4>
              {storageRefs.map((ref, i) => (
                <div key={i} className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{ref.pin_status || "pinned"}</span>
                    <span className="text-[10px] text-muted-foreground">{formatTime(ref.created_at)}</span>
                  </div>
                  <IpfsLink storageRef={ref} />
                  {ref.size_bytes && (
                    <p className="text-xs text-muted-foreground">
                      Tamanho: {(ref.size_bytes / 1024).toFixed(1)} KB
                    </p>
                  )}
                </div>
              ))}
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
