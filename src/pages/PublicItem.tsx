import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Package,
  ShieldCheck,
  ExternalLink,
  CalendarDays,
  Globe,
  Fingerprint,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Activity,
  Database,
  Link2,
  Copy,
  Scale,
  Lock,
  TrendingUp,
  Network,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ApiError,
  getPublicItem,
  getPublicItemCanonicalIdentifier,
  getPublicItemEvents,
  getPublicItemProofs,
  resolvePublicItemByIdentifier,
} from "@/lib/defarm-api";
import {
  eventTypeColors,
  eventTypeLabels,
  eventTypeIcons,
  formatDateShort,
  REAL_LIFE_EVENT_TYPES,
} from "@/components/item-detail/constants";
import logoIcon from "@/assets/logo-icon.png";
import { AssetQRCode } from "@/components/AssetQRCode";
import type { PublicItemEvent } from "@/lib/api/types";
import type { CheckResponse } from "@/lib/check-api/types";
import { executeCheck } from "@/lib/check-api";
import { getCarGeoJSON, type CarGeoJSON } from "@/lib/check-api/car";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { PropertyMap } from "@/components/onboarding/PropertyMap";
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

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

type WeightPoint = {
  date: string;
  label: string;
  weight: number;
  source: "metadata" | "event";
};

function shortHash(value: string, head = 10, tail = 8): string {
  if (!value) return "-";
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

const CAR_REGEX = /^[A-Z]{2}-\d{5,7}-[A-F0-9]{32}$/i;

function isOfficialCarFormat(value: string): boolean {
  return CAR_REGEX.test(value.trim());
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

function readString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
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
  if (typeof p.source === "string") return `Origem: ${p.source}`;
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

export default function PublicItem() {
  const { dfid, identifierType, identifierValue } = useParams<{
    dfid?: string;
    identifierType?: string;
    identifierValue?: string;
  }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const [showOperational, setShowOperational] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [resolvedDfid, setResolvedDfid] = useState<string | null>(dfid || null);
  const [isResolvingRef, setIsResolvingRef] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolveDeprecated, setResolveDeprecated] = useState(false);

  const [showCarDialog, setShowCarDialog] = useState(false);
  const [carResult, setCarResult] = useState<CheckResponse | null>(null);
  const [carLoading, setCarLoading] = useState(false);
  const [carError, setCarError] = useState<string | null>(null);
  const [carGeojson, setCarGeojson] = useState<CarGeoJSON | null>(null);
  const [carGeoLoading, setCarGeoLoading] = useState(false);
  const [carGeoError, setCarGeoError] = useState<string | null>(null);

  const [showWeightDialog, setShowWeightDialog] = useState(false);
  const [showIdentityDialog, setShowIdentityDialog] = useState(false);
  const [showCidDialog, setShowCidDialog] = useState(false);
  const [showCircuitsDialog, setShowCircuitsDialog] = useState(false);

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

  const { data: proofs, isLoading: isLoadingProofs } = useQuery({
    queryKey: ["public-item-proofs", resolvedDfid],
    queryFn: () => getPublicItemProofs(resolvedDfid!),
    enabled: !!resolvedDfid,
    retry: 1,
  });

  const { data: canonicalFromDb } = useQuery({
    queryKey: ["public-item-canonical", resolvedDfid],
    queryFn: () => getPublicItemCanonicalIdentifier(resolvedDfid!),
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
    const rows = events
      .map(extractTechnicalProof)
      .filter((proof): proof is TechnicalProof => !!proof)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const unique: TechnicalProof[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      const key = `${row.txHash || "-"}|${row.cid || "-"}|${row.createdAt}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(row);
    }
    return unique;
  }, [events]);

  const emittedTxHashes = useMemo(() => {
    const identity = proofs?.identity_anchor?.transaction_hash;
    const nft = proofs?.nft_mint_anchor?.transaction_hash;
    const txRows = technicalProofs.filter((p) => p.txHash).map((p) => p.txHash as string);
    return Array.from(new Set(txRows)).filter((tx) => tx !== identity && tx !== nft);
  }, [technicalProofs, proofs]);

  const metadata = useMemo(() => ((item?.metadata || {}) as Record<string, unknown>), [item?.metadata]);

  const weightMeta = useMemo(() => {
    const weightRaw = metadata.weight_kg;
    const dateRaw = metadata.data_peso;
    const weight = typeof weightRaw === "number" ? weightRaw : Number(weightRaw);
    const date = typeof dateRaw === "string" ? dateRaw : null;
    if (!Number.isFinite(weight)) return null;
    return { weight, date };
  }, [metadata]);

  const weightHistory = useMemo<WeightPoint[]>(() => {
    const points: WeightPoint[] = [];

    if (weightMeta) {
      points.push({
        date: weightMeta.date || item?.updated_at || item?.created_at || new Date().toISOString(),
        label: weightMeta.date || formatDateShort(item?.updated_at || item?.created_at || new Date().toISOString()),
        weight: weightMeta.weight,
        source: "metadata",
      });
    }

    for (const event of events) {
      if (event.event_type !== "item_weighed") continue;
      const payload = (event.payload || {}) as Record<string, unknown>;
      const weightRaw = payload.weight_kg;
      const weight = typeof weightRaw === "number" ? weightRaw : Number(weightRaw);
      if (!Number.isFinite(weight)) continue;
      const occurredAt =
        (typeof payload.occurred_at === "string" && payload.occurred_at) ||
        (typeof payload.data_peso === "string" && payload.data_peso) ||
        event.created_at;
      points.push({
        date: occurredAt,
        label: formatDateShort(occurredAt),
        weight,
        source: "event",
      });
    }

    const dedup = new Map<string, WeightPoint>();
    for (const p of points) {
      dedup.set(`${p.date}|${p.weight}`, p);
    }

    return Array.from(dedup.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [events, item?.created_at, item?.updated_at, weightMeta]);

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
      "partner_internal_id",
      "partner_reference",
      "data_peso",
    ]);

    return Object.entries(metadata).filter(([key]) => !technicalKeys.has(normalizeKey(key)));
  }, [metadata]);

  const fallbackCanonicalIdentifier = useMemo(() => detectCanonicalIdentifier(metadata), [metadata]);

  const canonicalIdentifier = canonicalFromDb
    ? { label: canonicalFromDb.identifier_type.toUpperCase(), value: canonicalFromDb.value }
    : fallbackCanonicalIdentifier;

  const carValue = useMemo(() => {
    const direct = metadata.car;
    if (typeof direct === "string" && direct.trim()) return direct.trim();
    if (typeof direct === "number") return String(direct);
    return null;
  }, [metadata]);
  const carHasOfficialFormat = useMemo(
    () => (carValue ? isOfficialCarFormat(carValue) : false),
    [carValue]
  );

  const latestContentVersion = useMemo(() => {
    if (!proofs?.content_versions?.length) return null;
    return (
      proofs.content_versions.find((v) => v.is_latest) ||
      [...proofs.content_versions].sort((a, b) => b.version - a.version)[0]
    );
  }, [proofs?.content_versions]);

  const olderContentVersions = useMemo(() => {
    if (!proofs?.content_versions?.length || !latestContentVersion) return [];
    return proofs.content_versions
      .filter((v) => v.cid !== latestContentVersion.cid)
      .sort((a, b) => b.version - a.version);
  }, [proofs?.content_versions, latestContentVersion]);

  const visibleEvents = showOperational ? events : realEvents;

  const associatedCircuitIds = useMemo(() => {
    const ids = events
      .map((event) => event.circuit_id)
      .filter((value): value is string => typeof value === "string" && value.length > 0);
    return Array.from(new Set(ids));
  }, [events]);

  const carAuthExpired = useMemo(() => {
    if (!carError) return false;
    const msg = carError.toLowerCase();
    return (
      msg.includes("token has expired") ||
      msg.includes("token expired") ||
      msg.includes("401") ||
      msg.includes("unauthorized")
    );
  }, [carError]);

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} copiado` });
    } catch {
      toast({ title: `Falha ao copiar ${label.toLowerCase()}`, variant: "destructive" });
    }
  };

  const openCarVerification = async () => {
    if (!carValue) return;
    setShowCarDialog(true);
    setCarGeojson(null);
    setCarResult(null);

    if (!carHasOfficialFormat) {
      setCarGeoError(null);
      setCarError("Este CAR não está no formato oficial para verificação automática.");
      return;
    }

    setCarGeoLoading(true);
    setCarGeoError(null);
    getCarGeoJSON(carValue, { skipAuth: true })
      .then((geo) => setCarGeojson(geo))
      .catch(() => {
        setCarGeoError(null);
      })
      .finally(() => setCarGeoLoading(false));

    if (!isAuthenticated) {
      return;
    }

    setCarLoading(true);
    setCarError(null);

    try {
      const response = await executeCheck({
        input: { type: "CAR", value: carValue },
        options: { useCache: true, includeEvidence: false },
      });
      setCarResult(response);
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : "Falha ao consultar compliance do CAR";
      const normalized = raw.toLowerCase();
      if (
        normalized.includes("token has expired") ||
        normalized.includes("token expired") ||
        normalized.includes("401") ||
        normalized.includes("unauthorized")
      ) {
        setCarError("Sua sessão expirou. Faça login novamente para consultar o compliance.");
      } else {
        setCarError("Não foi possível consultar o compliance deste CAR agora.");
      }
    } finally {
      setCarLoading(false);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (isResolvingRef || isLoading) {
    return (
      <Shell isAuthenticated={isAuthenticated}>
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-7 w-7 animate-spin text-primary mb-3" />
          <p className="text-sm text-muted-foreground">
            {isResolvingRef ? "Resolvendo referência do item..." : "Carregando dados do item..."}
          </p>
        </div>
      </Shell>
    );
  }

  if (itemDeprecated) {
    return (
      <Shell isAuthenticated={isAuthenticated}>
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
      <Shell isAuthenticated={isAuthenticated}>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Package className="h-10 w-10 text-muted-foreground/40 mb-4" />
          <h1 className="text-lg font-semibold text-foreground">Item não encontrado</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            {resolveError || "Este item não existe ou não está disponível publicamente."}
          </p>
          <Link to="/circuitos/publicos" className="mt-6">
            <Button variant="outline" size="sm">Voltar aos circuitos</Button>
          </Link>
        </div>
      </Shell>
    );
  }

  const st = statusMap[(item.status || "").toLowerCase()] || statusMap.active;

  return (
    <Shell isAuthenticated={isAuthenticated}>
      <div className="space-y-6">
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
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.className}`}>{st.text}</span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Globe className="h-3 w-3" />
                  {item.country}
                </span>
                <span className="text-xs text-muted-foreground">{chainLabels[item.value_chain] || item.value_chain}</span>
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

        <section className="rounded-xl border border-border p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Circuitos associados</h2>
              <p className="text-xs text-muted-foreground">
                {associatedCircuitIds.length} circuito{associatedCircuitIds.length !== 1 ? "s" : ""} detectado{associatedCircuitIds.length !== 1 ? "s" : ""}.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowCircuitsDialog(true)}>
              <Network className="h-4 w-4 mr-1.5" />
              Ver circuitos
            </Button>
          </div>
        </section>

        {item.dfid && (
          <AssetQRCode
            dfid={item.dfid}
            canonicalIdLabel={canonicalIdentifier?.label}
            canonicalIdValue={canonicalIdentifier?.value}
            identityHash={proofs?.identity_anchor?.transaction_hash || undefined}
            latestCid={latestContentVersion?.cid || undefined}
          />
        )}

        {visibleMetadataEntries.length > 0 && (
          <section className="rounded-xl border border-border p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">Metadados públicos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visibleMetadataEntries.map(([key, value]) => {
                const normalized = normalizeKey(key);
                const displayLabel = key.replace(/_/g, " ");

                if (normalized === "sisbov" && (typeof value === "string" || typeof value === "number")) {
                  const sisbov = String(value);
                  const refUrl = `${window.location.origin}/i/sisbov/${encodeURIComponent(sisbov)}`;
                  return (
                    <div key={key} className="bg-muted/40 rounded-lg p-3 space-y-2">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">SISBOV</p>
                      <a
                        href={`/i/sisbov/${encodeURIComponent(sisbov)}`}
                        className="text-sm font-medium text-primary break-all hover:underline"
                      >
                        {sisbov}
                      </a>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => void copyText(sisbov, "SISBOV")}>
                          <Copy className="h-3 w-3 mr-1" />
                          Copiar número
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => void copyText(refUrl, "Link SISBOV")}>
                          <Link2 className="h-3 w-3 mr-1" />
                          Copiar link
                        </Button>
                      </div>
                    </div>
                  );
                }

                if (normalized === "car" && (typeof value === "string" || typeof value === "number")) {
                  const car = String(value);
                  return (
                    <div key={key} className="bg-muted/40 rounded-lg p-3 space-y-2">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">CAR</p>
                      <button
                        onClick={() => void openCarVerification()}
                        className="text-sm font-medium text-primary break-all hover:underline text-left"
                      >
                        {car}
                      </button>
                      <p className="text-[11px] text-muted-foreground">
                        {carHasOfficialFormat
                          ? "Clique para verificar compliance e polígono desse CAR."
                          : "CAR fora do padrão oficial; a consulta geoespacial pode não estar disponível."}
                      </p>
                    </div>
                  );
                }

                if (normalized === "weight_kg" && (typeof value === "number" || typeof value === "string")) {
                  const weight = Number(value);
                  return (
                    <div key={key} className="bg-muted/40 rounded-lg p-3 space-y-2">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Peso</p>
                      <button
                        onClick={() => setShowWeightDialog(true)}
                        className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary"
                      >
                        <TrendingUp className="h-4 w-4" />
                        {Number.isFinite(weight) ? `${weight.toFixed(1)} kg` : String(value)}
                      </button>
                      {weightMeta?.date ? (
                        <p className="text-[11px] text-muted-foreground">Data da pesagem: {weightMeta.date}</p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">Clique para ver evolução de peso.</p>
                      )}
                    </div>
                  );
                }

                return (
                  <div key={key} className="bg-muted/40 rounded-lg p-3">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{displayLabel}</p>
                    {typeof value === "object" ? (
                      <pre className="text-xs text-foreground mt-1 overflow-x-auto whitespace-pre-wrap break-words">
                        {compactJson(value)}
                      </pre>
                    ) : (
                      <p className="text-sm font-medium text-foreground mt-0.5 break-words">{String(value ?? "-")}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="rounded-xl border border-border p-5 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Database className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Registros Decentralizados</h2>
              <p className="text-xs text-muted-foreground">Identidade on-chain + versões de conteúdo IPFS</p>
            </div>
          </div>

          {isLoadingProofs ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando provas...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Identidade</p>
                {proofs?.identity_anchor?.transaction_hash ? (
                  <>
                    <a
                      href={`https://stellar.expert/explorer/public/tx/${proofs.identity_anchor.transaction_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-mono text-primary hover:underline break-all inline-flex items-center gap-1"
                    >
                      {shortHash(proofs.identity_anchor.transaction_hash)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => void copyText(proofs.identity_anchor!.transaction_hash, "Hash de identidade")}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copiar hash
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowIdentityDialog(true)}>
                        Ver detalhes
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Identidade ainda não disponível.</p>
                )}
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">CID (última versão)</p>
                {latestContentVersion ? (
                  <>
                    <a
                      href={latestContentVersion.gateway_url || `https://gateway.pinata.cloud/ipfs/${latestContentVersion.cid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-mono text-primary hover:underline break-all inline-flex items-center gap-1"
                    >
                      {shortHash(latestContentVersion.cid)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => void copyText(latestContentVersion.cid, "CID")}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copiar CID
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowCidDialog(true)}>
                        Ver versões
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhuma versão de conteúdo disponível.</p>
                )}
              </div>
            </div>
          )}
        </section>

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
                  {operationalEvents.length > 0 && <span> · {operationalEvents.length} técnico/operacional(is)</span>}
                </p>
              </div>
            </div>

            {isAuthenticated && operationalEvents.length > 0 && (
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

          {!isAuthenticated ? (
            <div className="rounded-xl border border-border bg-muted/30 py-8 px-5 text-center">
              <Lock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-foreground font-medium">Histórico visível para usuários logados</p>
              <p className="text-xs text-muted-foreground mt-1">Entre na DeFarm para visualizar a timeline detalhada.</p>
              <Link to="/login" className="inline-block mt-4">
                <Button size="sm">Entrar na DeFarm</Button>
              </Link>
            </div>
          ) : isLoadingEvents ? (
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
                      <div
                        className={`absolute left-[7px] top-3 w-6 h-6 rounded-full flex items-center justify-center ring-2 ring-background ${colors}`}
                      >
                        <Icon className="h-3 w-3" />
                      </div>

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
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors}`}>{label}</span>
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
                            {summary && <p className="text-sm text-foreground mt-2">{summary}</p>}
                          </div>
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap mt-0.5">
                            {formatDateShort(event.created_at)}
                          </span>
                        </div>

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

      <Dialog
        open={showCarDialog}
        onOpenChange={(open) => {
          setShowCarDialog(open);
          if (!open) {
            setCarError(null);
            setCarGeoError(null);
            setCarLoading(false);
            setCarGeoLoading(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-4 w-4" /> Verificação de CAR
            </DialogTitle>
            <DialogDescription>
              {carValue ? `CAR: ${carValue}` : "CAR não informado no item."}
            </DialogDescription>
          </DialogHeader>

          {!carValue ? (
            <p className="text-sm text-muted-foreground">Este item não contém CAR público para consulta.</p>
          ) : (
            <div className="space-y-4">
              {carGeoLoading || carGeojson ? (
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground mb-2">Polígono da propriedade</p>
                  {carGeoLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
                      <Loader2 className="h-4 w-4 animate-spin" /> Carregando mapa...
                    </div>
                  ) : carGeojson ? (
                    <PropertyMap geojson={carGeojson} className="h-64 w-full" />
                  ) : null}
                </div>
              ) : null}

              {!isAuthenticated ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Para executar verificação de compliance desse CAR, entre na DeFarm.
                  </p>
                  <Link to="/login" className="inline-block">
                    <Button size="sm">Entrar na DeFarm</Button>
                  </Link>
                </div>
              ) : carLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Consultando compliance...
                </div>
              ) : carError ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{carError}</p>
                  {carAuthExpired ? (
                    <Link to="/login" className="inline-block">
                      <Button size="sm">Entrar novamente</Button>
                    </Link>
                  ) : null}
                </div>
              ) : carResult ? (
                <div className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Veredito:</span> <span className="font-medium">{carResult.verdict}</span></p>
                  <p><span className="text-muted-foreground">Score:</span> <span className="font-medium">{carResult.score}</span></p>
                  <p><span className="text-muted-foreground">Checkers:</span> <span className="font-medium">{carResult.summary.totalCheckers}</span></p>
                  <p><span className="text-muted-foreground">Falhas:</span> <span className="font-medium">{carResult.summary.failed}</span></p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Abra novamente para executar a consulta.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCircuitsDialog} onOpenChange={setShowCircuitsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Circuitos associados</DialogTitle>
            <DialogDescription>
              Se o circuito for privado/seletivo, a página de destino poderá exigir autenticação.
            </DialogDescription>
          </DialogHeader>

          {associatedCircuitIds.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum circuito associado foi identificado nos eventos públicos deste item.
            </p>
          ) : (
            <div className="space-y-2">
              {associatedCircuitIds.map((circuitId) => (
                <a
                  key={circuitId}
                  href={`/c/${circuitId}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 hover:bg-muted/40"
                >
                  <span className="font-mono text-xs break-all">{circuitId}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </a>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showWeightDialog} onOpenChange={setShowWeightDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Evolução de peso</DialogTitle>
            <DialogDescription>Histórico de pesagens públicas registradas para este item.</DialogDescription>
          </DialogHeader>

          {weightHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma pesagem pública disponível.</p>
          ) : (
            <div className="space-y-4">
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={["dataMin - 5", "dataMax + 5"]} />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="weight" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                {weightHistory.map((p, idx) => (
                  <div key={`${p.date}-${idx}`} className="text-xs flex items-center justify-between border rounded px-2 py-1.5">
                    <span className="text-muted-foreground">{p.date}</span>
                    <span className="font-medium">{p.weight.toFixed(1)} kg</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showIdentityDialog} onOpenChange={setShowIdentityDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Identidade e eventos emitidos</DialogTitle>
            <DialogDescription>
              Primeiro registro de identidade e emissões on-chain associadas ao conteúdo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            {proofs?.identity_anchor ? (
              <div className="rounded border p-3">
                <p className="text-xs text-muted-foreground">Hash de identidade</p>
                <p className="font-mono break-all mt-1">{proofs.identity_anchor.transaction_hash}</p>
              </div>
            ) : (
              <p className="text-muted-foreground">Sem hash de identidade disponível.</p>
            )}

            {proofs?.nft_mint_anchor ? (
              <div className="rounded border p-3">
                <p className="text-xs text-muted-foreground">Hash de mint</p>
                <p className="font-mono break-all mt-1">{proofs.nft_mint_anchor.transaction_hash}</p>
              </div>
            ) : null}

            <div className="rounded border p-3">
              <p className="text-xs text-muted-foreground mb-2">Hashes de eventos emitidos ({emittedTxHashes.length})</p>
              {emittedTxHashes.length === 0 ? (
                <p className="text-muted-foreground">Nenhum evento emitido público encontrado.</p>
              ) : (
                <div className="space-y-2">
                  {emittedTxHashes.map((tx) => (
                    <div key={tx} className="flex items-center justify-between gap-2">
                      <a
                        href={`https://stellar.expert/explorer/public/tx/${tx}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-primary hover:underline break-all text-xs"
                      >
                        {shortHash(tx, 14, 10)}
                      </a>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => void copyText(tx, "Hash")}>Copiar</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCidDialog} onOpenChange={setShowCidDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Versões de CID</DialogTitle>
            <DialogDescription>
              Última versão e histórico de CIDs anteriores.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            {latestContentVersion ? (
              <div className="rounded border p-3">
                <p className="text-xs text-muted-foreground">Último CID (v{latestContentVersion.version})</p>
                <a
                  href={latestContentVersion.gateway_url || `https://gateway.pinata.cloud/ipfs/${latestContentVersion.cid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-primary hover:underline break-all mt-1 inline-flex"
                >
                  {latestContentVersion.cid}
                </a>
              </div>
            ) : (
              <p className="text-muted-foreground">Nenhum CID disponível.</p>
            )}

            <div className="rounded border p-3">
              <p className="text-xs text-muted-foreground mb-2">CIDs anteriores ({olderContentVersions.length})</p>
              {olderContentVersions.length === 0 ? (
                <p className="text-muted-foreground">Sem versões anteriores.</p>
              ) : (
                <div className="space-y-2">
                  {olderContentVersions.map((v) => (
                    <div key={`${v.version}-${v.cid}`} className="flex items-center justify-between gap-2">
                      <a
                        href={v.gateway_url || `https://gateway.pinata.cloud/ipfs/${v.cid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-primary hover:underline break-all text-xs"
                      >
                        v{v.version} · {shortHash(v.cid, 14, 10)}
                      </a>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => void copyText(v.cid, "CID")}>Copiar</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

function Shell({
  children,
  isAuthenticated,
}: {
  children: React.ReactNode;
  isAuthenticated: boolean;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={logoIcon} alt="DeFarm" className="h-7 w-7" />
            <span className="font-bold text-foreground text-sm">DeFarm</span>
          </div>
          <div className="flex items-center gap-3">
            {!isAuthenticated ? (
              <Link to="/login">
                <Button size="sm" variant="outline" className="h-8 px-3 text-xs">
                  Login na DeFarm
                </Button>
              </Link>
            ) : (
              <Link to="/app">
                <Button size="sm" variant="outline" className="h-8 px-3 text-xs">
                  Abrir app
                </Button>
              </Link>
            )}
            <span className="text-[11px] text-muted-foreground hidden sm:inline">Rastreabilidade verificada</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>

      <footer className="border-t border-border mt-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">Dados verificados pela plataforma DeFarm</p>
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
