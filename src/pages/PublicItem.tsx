import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  Package,
  ShieldCheck,
  ExternalLink,
  CalendarDays,
  Globe,
  Wheat,
  Fingerprint,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Activity,
  Database,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError, getPublicItem, getPublicItemEvents, resolvePublicItemByIdentifier } from "@/lib/defarm-api";
import {
  eventTypeColors,
  eventTypeLabels,
  eventTypeIcons,
  formatDateShort,
  formatTime,
  REAL_LIFE_EVENT_TYPES,
} from "@/components/item-detail/constants";
import logoIcon from "@/assets/logo-icon.png";
import { AssetQRCode } from "@/components/AssetQRCode";
import type { PublicItemEvent } from "@/lib/api/types";

/* ── helpers ─────────────────────────────────── */

const chainLabels: Record<string, string> = {
  BEEF: "Bovinos",
  DAIRY: "Leite",
  PORK: "Suínos",
  POULTRY: "Aves",
};

const statusMap: Record<string, { text: string; className: string }> = {
  active: { text: "Ativo", className: "bg-primary/10 text-primary" },
  inactive: { text: "Inativo", className: "bg-muted text-muted-foreground" },
  deprecated: { text: "Depreciado", className: "bg-destructive/10 text-destructive" },
};

function eventSummary(event: PublicItemEvent): string | null {
  const p = event.payload || {};
  if (event.event_type === "item_movement") {
    const base = typeof p.property_dfid === "string" ? `Propriedade: ${p.property_dfid}` : "Movimentação registrada";
    return typeof p.gta_number === "string" ? `${base} · GTA ${p.gta_number}` : base;
  }
  if (event.event_type === "item_property_linked" || event.event_type === "item_property_unlinked") {
    return typeof p.property_dfid === "string" ? `Propriedade: ${p.property_dfid}` : null;
  }
  if (event.event_type === "item_weighed" && typeof p.weight_kg === "number") {
    return `${p.weight_kg} kg${typeof p.occurred_at === "string" ? ` · ${p.occurred_at}` : ""}`;
  }
  if (event.event_type === "item_born" && typeof p.occurred_at === "string") {
    return `Nascimento em ${p.occurred_at}`;
  }
  // generic: show source if available
  if (typeof p.source === "string") return `Origem: ${p.source}`;
  return null;
}

type TechnicalProof = {
  eventId: string;
  createdAt: string;
  eventType: string;
  txHash?: string;
  stellarUrl?: string;
  network?: string;
  cid?: string;
  gatewayUrl?: string;
  pinStatus?: string;
};

function readString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function extractTechnicalProof(event: PublicItemEvent): TechnicalProof | null {
  const anyEvent = event as PublicItemEvent & { metadata?: Record<string, unknown> | null };
  const payload = (event.payload || {}) as Record<string, unknown>;
  const metadata = (anyEvent.metadata || {}) as Record<string, unknown>;
  const merged = { ...metadata, ...payload };

  const txHash = readString(merged, ["transaction_hash", "stellar_tx_hash", "tx_hash"]);
  const cid = readString(merged, ["ipfs_cid", "content_id", "cid"]);
  if (!txHash && !cid) return null;

  const stellarUrl = readString(merged, ["stellar_url"]);
  const gatewayUrl = readString(merged, ["gateway_url", "ipfs_gateway_url"]);
  const network = readString(merged, ["network", "stellar_network"]);
  const pinStatus = readString(merged, ["pin_status", "status"]);

  return {
    eventId: event.id,
    createdAt: event.created_at,
    eventType: event.event_type,
    txHash,
    stellarUrl,
    network,
    cid,
    gatewayUrl,
    pinStatus,
  };
}

function compactJson(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function detectCanonicalIdentifier(metadata: Record<string, unknown>): { label: string; value: string } | null {
  const picks: Array<{ key: string; label: string }> = [
    { key: "sisbov", label: "SISBOV" },
    { key: "chip", label: "CHIP" },
    { key: "cpf", label: "CPF" },
    { key: "cnpj", label: "CNPJ" },
    { key: "inscricao_estadual", label: "IE" },
    { key: "ie", label: "IE" },
    { key: "land_dfid", label: "LAND_DFID" },
    { key: "car", label: "CAR" },
  ];
  for (const pick of picks) {
    const raw = metadata[pick.key];
    if (typeof raw === "string" && raw.trim()) {
      return { label: pick.label, value: raw.trim() };
    }
    if (typeof raw === "number") {
      return { label: pick.label, value: String(raw) };
    }
  }
  return null;
}

function trustBadge(level?: string | null, score?: number | null): { text: string; className: string } {
  if (level === "high" || (typeof score === "number" && score >= 80)) {
    return {
      text: `Confiança alta${typeof score === "number" ? ` · ${score}` : ""}`,
      className: "bg-emerald-500/10 text-emerald-700",
    };
  }
  if (level === "medium" || (typeof score === "number" && score >= 60)) {
    return {
      text: `Confiança média${typeof score === "number" ? ` · ${score}` : ""}`,
      className: "bg-amber-500/10 text-amber-700",
    };
  }
  if (level === "low" || typeof score === "number") {
    return {
      text: `Confiança baixa${typeof score === "number" ? ` · ${score}` : ""}`,
      className: "bg-rose-500/10 text-rose-700",
    };
  }
  return { text: "Confiança n/d", className: "bg-muted text-muted-foreground" };
}

/* ── main component ──────────────────────────── */

export default function PublicItem() {
  const { dfid, identifierType, identifierValue } = useParams<{
    dfid?: string;
    identifierType?: string;
    identifierValue?: string;
  }>();
  const navigate = useNavigate();
  const [showOperational, setShowOperational] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [resolvedDfid, setResolvedDfid] = useState<string | null>(dfid || null);
  const [isResolvingRef, setIsResolvingRef] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolveDeprecated, setResolveDeprecated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resolveIdentifierReference() {
      if (dfid) {
        setResolvedDfid(dfid);
        setResolveError(null);
        setResolveDeprecated(false);
        return;
      }
      if (!identifierType || !identifierValue) return;

      setIsResolvingRef(true);
      setResolveError(null);
      setResolveDeprecated(false);
      try {
        const resolved = await resolvePublicItemByIdentifier(identifierType, identifierValue);
        if (cancelled) return;
        setResolvedDfid(resolved.dfid);
        navigate(`/i/${encodeURIComponent(resolved.dfid)}`, { replace: true });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 410 && err.code === "item_deprecated") {
          setResolveDeprecated(true);
          setResolveError("Este item foi marcado como deprecated e não está mais visível publicamente.");
          return;
        }
        setResolveError("Este identificador não foi encontrado como item público.");
      } finally {
        if (!cancelled) setIsResolvingRef(false);
      }
    }

    void resolveIdentifierReference();
    return () => {
      cancelled = true;
    };
  }, [dfid, identifierType, identifierValue, navigate]);

  const { data: item, isLoading, error } = useQuery({
    queryKey: ["public-item", resolvedDfid],
    queryFn: () => getPublicItem(resolvedDfid!),
    enabled: !!resolvedDfid,
    retry: 1,
  });

  const { data: events = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ["public-item-events", resolvedDfid],
    queryFn: () => getPublicItemEvents(resolvedDfid!, { limit: 50 }),
    enabled: !!resolvedDfid,
    retry: 1,
  });

  const itemDeprecated = useMemo(() => {
    if (resolveDeprecated) return true;
    if (error instanceof ApiError && error.status === 410 && error.code === "item_deprecated") return true;
    return false;
  }, [resolveDeprecated, error]);

  const maskedDfid = useMemo(() => {
    const ref = resolvedDfid || dfid || null;
    if (!ref) return null;
    const head = ref.slice(0, 20);
    return `${head}${ref.length > 20 ? "•••" : ""}`;
  }, [resolvedDfid, dfid]);

  const { realEvents, operationalEvents } = useMemo(() => {
    const real: PublicItemEvent[] = [];
    const ops: PublicItemEvent[] = [];
    for (const e of events) {
      if (REAL_LIFE_EVENT_TYPES.has(e.event_type)) real.push(e);
      else ops.push(e);
    }
    return { realEvents: real, operationalEvents: ops };
  }, [events]);

  const technicalProofs = useMemo(() => {
    const proofs = events
      .map(extractTechnicalProof)
      .filter((proof): proof is TechnicalProof => !!proof)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const seenTx = new Set<string>();
    const seenCid = new Set<string>();
    const unique: TechnicalProof[] = [];
    for (const proof of proofs) {
      const txKey = proof.txHash || "";
      const cidKey = proof.cid || "";
      if (txKey && seenTx.has(txKey) && cidKey && seenCid.has(cidKey)) continue;
      if (txKey && seenTx.has(txKey) && !cidKey) continue;
      if (!txKey && cidKey && seenCid.has(cidKey)) continue;
      if (txKey) seenTx.add(txKey);
      if (cidKey) seenCid.add(cidKey);
      unique.push(proof);
    }
    return unique;
  }, [events]);

  const visibleMetadataEntries = useMemo(() => {
    const technicalKeys = new Set([
      "stellar_tx_hash",
      "tx_hash",
      "transaction_hash",
      "ipfs_cid",
      "cid",
      "content_id",
      "stellar_url",
      "gateway_url",
      "ipfs_gateway_url",
      "blockchain_anchors",
      "storage_refs",
    ]);
    const metadata = (item?.metadata || {}) as Record<string, unknown>;
    return Object.entries(metadata).filter(([key]) => !technicalKeys.has(key));
  }, [item?.metadata]);

  const canonicalIdentifier = useMemo(() => {
    const metadata = (item?.metadata || {}) as Record<string, unknown>;
    return detectCanonicalIdentifier(metadata);
  }, [item?.metadata]);

  const publicCircuitId = useMemo(() => {
    for (const event of events) {
      if (typeof event.circuit_id === "string" && event.circuit_id) {
        return event.circuit_id;
      }
    }
    return null;
  }, [events]);
  const publicCircuitUrl = publicCircuitId ? `/c/${publicCircuitId}` : "/circuitos/publicos";
  const publicBackLabel = publicCircuitId ? "Voltar ao circuito" : "Voltar aos circuitos";

  const visibleEvents = showOperational ? events : realEvents;

  const toggleExpanded = (id: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* ── edge states ── */

  if (isResolvingRef || isLoading) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-7 w-7 animate-spin text-primary mb-3" />
          <p className="text-sm text-muted-foreground">
            {isResolvingRef ? "Resolvendo referência do item..." : "Carregando dados do animal…"}
          </p>
        </div>
      </Shell>
    );
  }

  if (itemDeprecated) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-4 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-left max-w-md w-full">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Item reference</p>
            <p className="font-mono text-sm text-foreground/70 mt-1">{maskedDfid || "DFID não disponível"}</p>
          </div>
          <Package className="h-10 w-10 text-muted-foreground/50 mb-4" />
          <h1 className="text-lg font-semibold text-foreground">Item deprecated</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Este item foi descontinuado da visualização pública.
          </p>
        </div>
      </Shell>
    );
  }

  if (resolveError || error || !item) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Package className="h-10 w-10 text-muted-foreground/40 mb-4" />
          <h1 className="text-lg font-semibold text-foreground">Item não encontrado</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            {resolveError || "Este item não existe ou não está disponível publicamente."}
          </p>
          <Link to={publicCircuitUrl} className="mt-6">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              {publicBackLabel}
            </Button>
          </Link>
        </div>
      </Shell>
    );
  }

  const st = statusMap[(item.status || "").toLowerCase()] || statusMap.active;

  return (
    <Shell>
      <div className="space-y-6">
        {/* ── breadcrumb ── */}
        <Link
          to={publicCircuitUrl}
          className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          {publicBackLabel}
        </Link>

        {/* ── item hero card ── */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/8 via-background to-primary/4 border border-primary/10 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Fingerprint className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground font-mono tracking-tight break-all">
                {item.dfid}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.className}`}>
                  {st.text}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Globe className="h-3 w-3" />
                  {item.country}
                </span>
                <span className="text-xs text-muted-foreground">
                  {chainLabels[item.value_chain] || item.value_chain}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarDays className="h-3 w-3" />
                  {item.year}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium self-start">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verificado
            </div>
          </div>
        </div>

        {/* ── QR code card ── */}
        {item.dfid && (
          <AssetQRCode
            dfid={item.dfid}
            canonicalIdLabel={canonicalIdentifier?.label}
            canonicalIdValue={canonicalIdentifier?.value}
          />
        )}

        {/* ── metadata ── */}
        {visibleMetadataEntries.length > 0 && (
          <section className="rounded-xl border border-border p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">Metadados públicos</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {visibleMetadataEntries.map(([key, value]) => (
                <div key={key} className="bg-muted/40 rounded-lg p-3">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{key.replace(/_/g, " ")}</p>
                  {typeof value === "object" ? (
                    <pre className="text-xs text-foreground mt-1 overflow-x-auto whitespace-pre-wrap break-words">
                      {compactJson(value)}
                    </pre>
                  ) : (
                    <p className="text-sm font-medium text-foreground mt-0.5 break-words">
                      {String(value ?? "-")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {technicalProofs.length > 0 && (
          <section className="rounded-xl border border-border p-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Database className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Provas Técnicas (Stellar + IPFS)</h2>
                <p className="text-xs text-muted-foreground">
                  {technicalProofs.length} registro(s) públicos de ancoragem/versionamento
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {technicalProofs.slice(0, 8).map((proof) => (
                <div key={proof.eventId} className="rounded-lg border border-border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{eventTypeLabels[proof.eventType] || proof.eventType}</span>
                    <span>·</span>
                    <span>{formatDateShort(proof.createdAt)}</span>
                    {proof.network ? (
                      <>
                        <span>·</span>
                        <span>{proof.network}</span>
                      </>
                    ) : null}
                  </div>
                  <div className="mt-2 space-y-1">
                    {proof.txHash ? (
                      <a
                        href={proof.stellarUrl || `https://stellar.expert/explorer/public/tx/${proof.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-mono"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Stellar: {proof.txHash}
                      </a>
                    ) : null}
                    {proof.cid ? (
                      <a
                        href={proof.gatewayUrl || `https://gateway.pinata.cloud/ipfs/${proof.cid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-mono"
                      >
                        <Link2 className="h-3 w-3" />
                        IPFS CID: {proof.cid}
                      </a>
                    ) : null}
                    {proof.pinStatus ? (
                      <p className="text-[11px] text-muted-foreground">Status IPFS: {proof.pinStatus}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── timeline ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Activity className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Histórico</h2>
                <p className="text-xs text-muted-foreground">
                  {realEvents.length} evento{realEvents.length !== 1 ? "s" : ""} registrado{realEvents.length !== 1 ? "s" : ""}
                  {operationalEvents.length > 0 && (
                    <span> · {operationalEvents.length} técnico/operacional(is)</span>
                  )}
                </p>
              </div>
            </div>

            {operationalEvents.length > 0 && (
              <button
                onClick={() => setShowOperational((prev) => !prev)}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border hover:bg-muted/50"
              >
                {showOperational ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    Ocultar operacionais
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    Mostrar técnicos
                  </>
                )}
              </button>
            )}
          </div>

          {isLoadingEvents ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : visibleEvents.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/30 py-12 text-center">
              <Activity className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum evento público disponível.</p>
            </div>
          ) : (
            <div className="relative">
              {/* vertical line */}
              <div className="absolute left-[19px] top-3 bottom-3 w-px bg-border" />

              <div className="space-y-0">
                {visibleEvents.map((event) => {
                  const Icon = eventTypeIcons[event.event_type] || Activity;
                  const colors = eventTypeColors[event.event_type] || "bg-muted text-muted-foreground";
                  const label = eventTypeLabels[event.event_type] || event.event_type;
                  const summary = eventSummary(event);
                  const isOperational = !REAL_LIFE_EVENT_TYPES.has(event.event_type);
                  const isExpanded = expandedEvents.has(event.id);
                  const hasPayload = event.payload && Object.keys(event.payload).length > 0;
                  const trust = trustBadge(event.trust_level, event.trust_score);

                  return (
                    <div key={event.id} className="relative pl-12 pb-1 pt-1">
                      {/* dot */}
                      <div
                        className={`absolute left-[7px] top-3 w-6 h-6 rounded-full flex items-center justify-center ring-2 ring-background ${colors}`}
                      >
                        <Icon className="h-3 w-3" />
                      </div>

                      {/* card */}
                      <div
                        className={`rounded-xl border p-4 transition-colors ${
                          isOperational
                            ? "border-border/60 bg-muted/20"
                            : "border-border bg-background hover:bg-muted/20"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors}`}>
                                {label}
                              </span>
                              {isOperational && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                  operacional
                                </span>
                              )}
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded ${trust.className}`}
                                title={
                                  event.trust_factors
                                    ? `Modelo ${event.trust_model_version || "v1"} · ${JSON.stringify(event.trust_factors)}`
                                    : `Modelo ${event.trust_model_version || "v1"}`
                                }
                              >
                                {trust.text}
                              </span>
                            </div>
                            {summary && (
                              <p className="text-sm text-foreground mt-2">{summary}</p>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap mt-0.5">
                            {formatDateShort(event.created_at)}
                          </span>
                        </div>

                        {/* expandable payload */}
                        {hasPayload && (
                          <div className="mt-2">
                            <button
                              onClick={() => toggleExpanded(event.id)}
                              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-3 w-3" />
                                  Ocultar detalhes
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3" />
                                  Ver detalhes
                                </>
                              )}
                            </button>
                            {isExpanded && (
                              <div className="mt-2 rounded-lg bg-muted/50 p-3 space-y-1">
                                {Object.entries(event.payload!).map(([k, v]) => (
                                  <div key={k} className="flex gap-2 text-xs">
                                    <span className="text-muted-foreground min-w-[100px]">{k}:</span>
                                    <span className="text-foreground break-all font-mono">
                                      {typeof v === "object" ? JSON.stringify(v) : String(v ?? "-")}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </Shell>
  );
}

/* ── shell ────────────────────────────────────── */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={logoIcon} alt="DeFarm" className="h-7 w-7" />
            <span className="font-bold text-foreground text-sm">DeFarm</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Rastreabilidade verificada
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>

      <footer className="border-t border-border mt-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Dados verificados pela plataforma DeFarm
          </p>
          <a
            href="https://defarm.net"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            defarm.net
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </footer>
    </div>
  );
}
