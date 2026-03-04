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
  Languages,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  source: "metadata" | "event" | "cid";
  inferredDate?: boolean;
};

type MetadataLocale = "pt-BR" | "en";

type MetadataFieldDefinition = {
  canonical: string;
  aliases: string[];
  label: Record<MetadataLocale, string>;
};

type NormalizedMetadataEntry = {
  canonicalKey: string;
  rawKeys: string[];
  value: unknown;
};

const WEIGHT_KEYS = ["weight_kg", "peso_kg", "weight", "peso"];
const WEIGHT_DATE_KEYS = ["data_peso", "weight_date", "data_pesagem", "date", "occurred_at"];

const METADATA_FIELD_DEFINITIONS: MetadataFieldDefinition[] = [
  { canonical: "value_chain", aliases: ["value_chain", "valuechain"], label: { "pt-BR": "Cadeia de valor", en: "Value chain" } },
  { canonical: "sisbov", aliases: ["sisbov"], label: { "pt-BR": "SISBOV", en: "SISBOV" } },
  { canonical: "chip", aliases: ["chip", "rfid"], label: { "pt-BR": "Chip", en: "Chip" } },
  { canonical: "car", aliases: ["car"], label: { "pt-BR": "CAR", en: "CAR" } },
  {
    canonical: "inscricao_estadual",
    aliases: ["inscricao_estadual", "ie", "state_registration"],
    label: { "pt-BR": "Inscrição estadual", en: "State registration" },
  },
  {
    canonical: "partner_internal_id",
    aliases: ["partner_internal_id", "partner_reference", "external_id"],
    label: { "pt-BR": "Referência do parceiro", en: "Partner reference" },
  },
  {
    canonical: "animal_id",
    aliases: ["animal_id", "animalid", "id_animal"],
    label: { "pt-BR": "ID do animal", en: "Animal ID" },
  },
  { canonical: "weight_kg", aliases: ["weight_kg", "peso_kg", "weight", "peso"], label: { "pt-BR": "Peso (kg)", en: "Weight (kg)" } },
  {
    canonical: "data_peso",
    aliases: ["data_peso", "weight_date", "data_pesagem", "date"],
    label: { "pt-BR": "Data da pesagem", en: "Weighing date" },
  },
  { canonical: "document_type", aliases: ["document_type", "tipo_documento"], label: { "pt-BR": "Tipo de documento", en: "Document type" } },
  { canonical: "document_number", aliases: ["document_number", "numero_documento"], label: { "pt-BR": "Número do documento", en: "Document number" } },
  { canonical: "document_date", aliases: ["document_date", "data_documento"], label: { "pt-BR": "Data do documento", en: "Document date" } },
  { canonical: "movement_type", aliases: ["movement_type", "tipo_movimento"], label: { "pt-BR": "Tipo de movimento", en: "Movement type" } },
  { canonical: "stock_motive", aliases: ["stock_motive", "motivo_estoque"], label: { "pt-BR": "Motivo", en: "Motive" } },
  { canonical: "supplier", aliases: ["supplier", "fornecedor"], label: { "pt-BR": "Fornecedor", en: "Supplier" } },
  { canonical: "description", aliases: ["description", "descricao"], label: { "pt-BR": "Descrição", en: "Description" } },
  { canonical: "stock_location", aliases: ["stock_location", "location", "fazenda", "farm"], label: { "pt-BR": "Local do estoque", en: "Stock location" } },
  { canonical: "batch", aliases: ["batch", "lote"], label: { "pt-BR": "Lote", en: "Batch" } },
  { canonical: "category", aliases: ["category", "categoria"], label: { "pt-BR": "Categoria", en: "Category" } },
  { canonical: "breed", aliases: ["breed", "raca"], label: { "pt-BR": "Raça", en: "Breed" } },
];

const METADATA_ALIAS_TO_CANONICAL = (() => {
  const map = new Map<string, string>();
  for (const def of METADATA_FIELD_DEFINITIONS) {
    map.set(def.canonical, def.canonical);
    for (const alias of def.aliases) map.set(alias, def.canonical);
  }
  return map;
})();

const METADATA_LABELS = (() => {
  const map = new Map<string, Record<MetadataLocale, string>>();
  for (const def of METADATA_FIELD_DEFINITIONS) map.set(def.canonical, def.label);
  return map;
})();

function parseWeightPointFromSnapshot(snapshot: unknown, uploadedAtFallback?: string): WeightPoint | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const obj = snapshot as Record<string, unknown>;
  const business = (obj.business && typeof obj.business === "object"
    ? (obj.business as Record<string, unknown>)
    : null);
  const metadata = (business?.metadata && typeof business.metadata === "object"
    ? (business.metadata as Record<string, unknown>)
    : (obj.metadata && typeof obj.metadata === "object"
      ? (obj.metadata as Record<string, unknown>)
      : null));

  if (!metadata) return null;
  const rawWeight = readAliasValue(metadata, WEIGHT_KEYS);
  const weight = typeof rawWeight === "number" ? rawWeight : Number(rawWeight);
  if (!Number.isFinite(weight)) return null;

  const rawDate = readAliasValue(metadata, WEIGHT_DATE_KEYS);
  const hasExplicitDate = typeof rawDate === "string" && rawDate.trim().length > 0;
  const date =
    (hasExplicitDate ? rawDate.trim() : "") ||
    uploadedAtFallback ||
    new Date().toISOString();

  return {
    date,
    label: `${formatDateShort(date)}${hasExplicitDate ? "" : "*"}`,
    weight,
    source: "cid",
    inferredDate: !hasExplicitDate,
  };
}

function shortHash(value: string, head = 10, tail = 8): string {
  if (!value) return "-";
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

function normalizeFieldKey(key: string): string {
  return key
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function readAliasValue(record: Record<string, unknown>, aliases: string[]): unknown {
  for (const alias of aliases) {
    const value = record[alias];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  const normalizedAliases = new Set(aliases.map((alias) => normalizeFieldKey(alias)));
  for (const [key, value] of Object.entries(record)) {
    if (!normalizedAliases.has(normalizeFieldKey(key))) continue;
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function formatFallbackMetadataLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getMetadataLabel(canonicalKey: string, locale: MetadataLocale): string {
  return METADATA_LABELS.get(canonicalKey)?.[locale] || formatFallbackMetadataLabel(canonicalKey);
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
  const [metadataLocale, setMetadataLocale] = useState<MetadataLocale>(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("public_item_locale") : null;
    return stored === "en" ? "en" : "pt-BR";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("public_item_locale", metadataLocale);
  }, [metadataLocale]);

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

  const { data: cidWeightHistory = [] } = useQuery({
    queryKey: [
      "public-item-cid-weight-history",
      resolvedDfid,
      ...(proofs?.content_versions || []).map((v) => `${v.version}:${v.cid}`),
    ],
    enabled: !!resolvedDfid && !!proofs?.content_versions?.length,
    queryFn: async () => {
      const versions = proofs?.content_versions || [];
      const points: WeightPoint[] = [];

      await Promise.all(
        versions.map(async (version) => {
          const url = version.gateway_url || `https://gateway.pinata.cloud/ipfs/${version.cid}`;
          if (!url) return;
          try {
            const resp = await fetch(url);
            if (!resp.ok) return;
            const json = await resp.json();
            const point = parseWeightPointFromSnapshot(json, version.uploaded_at);
            if (point) points.push(point);
          } catch {
            // Ignore CID fetch failures in public UI and keep timeline best-effort.
          }
        })
      );

      return points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    },
    staleTime: 60_000,
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
    const weightRaw = readAliasValue(metadata, WEIGHT_KEYS);
    const dateRaw = readAliasValue(metadata, WEIGHT_DATE_KEYS);
    const weight = typeof weightRaw === "number" ? weightRaw : Number(weightRaw);
    const hasExplicitDate = typeof dateRaw === "string" && dateRaw.trim().length > 0;
    const date = hasExplicitDate ? dateRaw.trim() : null;
    if (!Number.isFinite(weight)) return null;
    return { weight, date, inferredDate: !hasExplicitDate };
  }, [metadata]);

  const weightHistory = useMemo<WeightPoint[]>(() => {
    const points: WeightPoint[] = [];

    if (weightMeta) {
      const fallbackDate = item?.updated_at || item?.created_at || new Date().toISOString();
      const finalDate = weightMeta.date || fallbackDate;
      points.push({
        date: finalDate,
        label: `${weightMeta.date || formatDateShort(fallbackDate)}${weightMeta.inferredDate ? "*" : ""}`,
        weight: weightMeta.weight,
        source: "metadata",
        inferredDate: weightMeta.inferredDate,
      });
    }

    for (const event of events) {
      if (event.event_type !== "item_weighed") continue;
      const payload = (event.payload || {}) as Record<string, unknown>;
      const weightRaw = readAliasValue(payload, WEIGHT_KEYS);
      const weight = typeof weightRaw === "number" ? weightRaw : Number(weightRaw);
      if (!Number.isFinite(weight)) continue;
      const occurredAtRaw = readAliasValue(payload, WEIGHT_DATE_KEYS);
      const hasExplicitDate = typeof occurredAtRaw === "string" && occurredAtRaw.trim().length > 0;
      const occurredAt = (hasExplicitDate ? occurredAtRaw.trim() : "") || event.created_at;
      points.push({
        date: occurredAt,
        label: `${formatDateShort(occurredAt)}${hasExplicitDate ? "" : "*"}`,
        weight,
        source: "event",
        inferredDate: !hasExplicitDate,
      });
    }

    for (const point of cidWeightHistory) {
      points.push(point);
    }

    const dedup = new Map<string, WeightPoint>();
    for (const p of points) {
      dedup.set(`${p.date}|${p.weight}`, p);
    }

    return Array.from(dedup.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [events, item?.created_at, item?.updated_at, weightMeta, cidWeightHistory]);

  const hasInferredWeightDates = useMemo(
    () => weightHistory.some((point) => point.inferredDate),
    [weightHistory]
  );

  const visibleMetadataEntries = useMemo<NormalizedMetadataEntry[]>(() => {
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

    const grouped = new Map<string, NormalizedMetadataEntry>();

    for (const [rawKey, value] of Object.entries(metadata)) {
      const normalizedRawKey = normalizeFieldKey(rawKey);
      const canonicalKey = METADATA_ALIAS_TO_CANONICAL.get(normalizedRawKey) || normalizedRawKey;
      if (technicalKeys.has(canonicalKey)) continue;
      if (value === null || value === undefined || value === "") continue;

      const current = grouped.get(canonicalKey);
      if (!current) {
        grouped.set(canonicalKey, {
          canonicalKey,
          rawKeys: [rawKey],
          value,
        });
        continue;
      }

      if (!current.rawKeys.includes(rawKey)) {
        current.rawKeys.push(rawKey);
      }
      if (normalizeFieldKey(rawKey) === canonicalKey) {
        current.value = value;
      }
    }

    return Array.from(grouped.values()).sort((a, b) => a.canonicalKey.localeCompare(b.canonicalKey));
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
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">
                {metadataLocale === "en" ? "Public metadata" : "Metadados públicos"}
              </h2>
              <div className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/30 p-1">
                <Languages className="h-3.5 w-3.5 text-muted-foreground ml-1" />
                <Button
                  size="sm"
                  variant={metadataLocale === "pt-BR" ? "default" : "ghost"}
                  className="h-6 px-2 text-[11px]"
                  onClick={() => setMetadataLocale("pt-BR")}
                >
                  PT-BR
                </Button>
                <Button
                  size="sm"
                  variant={metadataLocale === "en" ? "default" : "ghost"}
                  className="h-6 px-2 text-[11px]"
                  onClick={() => setMetadataLocale("en")}
                >
                  EN
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visibleMetadataEntries.map((entry) => {
                const { canonicalKey, rawKeys, value } = entry;
                const normalized = normalizeFieldKey(canonicalKey);
                const displayLabel = getMetadataLabel(canonicalKey, metadataLocale);

                if (normalized === "sisbov" && (typeof value === "string" || typeof value === "number")) {
                  const sisbov = String(value);
                  const refUrl = `${window.location.origin}/i/sisbov/${encodeURIComponent(sisbov)}`;
                  return (
                    <div key={`${canonicalKey}-${rawKeys.join(",")}`} className="bg-muted/40 rounded-lg p-3 space-y-2">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">SISBOV</p>
                      <a
                        href={`/i/sisbov/${encodeURIComponent(sisbov)}`}
                        className="text-sm font-medium text-primary break-all hover:underline"
                      >
                        {sisbov}
                      </a>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => void copyText(sisbov, metadataLocale === "en" ? "SISBOV number" : "SISBOV")}>
                          <Copy className="h-3 w-3 mr-1" />
                          {metadataLocale === "en" ? "Copy number" : "Copiar número"}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => void copyText(refUrl, metadataLocale === "en" ? "SISBOV link" : "Link SISBOV")}>
                          <Link2 className="h-3 w-3 mr-1" />
                          {metadataLocale === "en" ? "Copy link" : "Copiar link"}
                        </Button>
                      </div>
                    </div>
                  );
                }

                if (normalized === "car" && (typeof value === "string" || typeof value === "number")) {
                  const car = String(value);
                  return (
                    <div key={`${canonicalKey}-${rawKeys.join(",")}`} className="bg-muted/40 rounded-lg p-3 space-y-2">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">CAR</p>
                      <button
                        onClick={() => void openCarVerification()}
                        className="text-sm font-medium text-primary break-all hover:underline text-left"
                      >
                        {car}
                      </button>
                      <p className="text-[11px] text-muted-foreground">
                        {carHasOfficialFormat
                          ? (metadataLocale === "en"
                              ? "Click to verify compliance and property polygon."
                              : "Clique para verificar compliance e polígono desse CAR.")
                          : (metadataLocale === "en"
                              ? "CAR outside official format; geospatial check may be unavailable."
                              : "CAR fora do padrão oficial; a consulta geoespacial pode não estar disponível.")}
                      </p>
                    </div>
                  );
                }

                if (normalized === "weight_kg" && (typeof value === "number" || typeof value === "string")) {
                  const weight = Number(value);
                  return (
                    <div key={`${canonicalKey}-${rawKeys.join(",")}`} className="bg-muted/40 rounded-lg p-3 space-y-2">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{displayLabel}</p>
                      <button
                        onClick={() => setShowWeightDialog(true)}
                        className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary"
                      >
                        <TrendingUp className="h-4 w-4" />
                        {Number.isFinite(weight) ? `${weight.toFixed(1)} kg` : String(value)}
                      </button>
                      {weightMeta?.date ? (
                        <p className="text-[11px] text-muted-foreground">
                          {metadataLocale === "en" ? "Weighing date" : "Data da pesagem"}: {weightMeta.date}
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">
                          {metadataLocale === "en" ? "Click to view weight progression." : "Clique para ver evolução de peso."}
                        </p>
                      )}
                    </div>
                  );
                }

                return (
                  <div key={`${canonicalKey}-${rawKeys.join(",")}`} className="bg-muted/40 rounded-lg p-3">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{displayLabel}</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex text-muted-foreground hover:text-foreground"
                            aria-label={metadataLocale === "en" ? "Show original field" : "Mostrar campo original"}
                          >
                            <Info className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs">
                          {metadataLocale === "en" ? "Original field(s): " : "Campo(s) original(is): "}
                          {rawKeys.join(", ")}
                          <br />
                          {metadataLocale === "en" ? "Official field: " : "Campo oficial: "}
                          {canonicalKey}
                        </TooltipContent>
                      </Tooltip>
                    </div>
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
                    <span className="text-muted-foreground">
                      {p.date}
                      {p.inferredDate ? "*" : ""}
                    </span>
                    <span className="font-medium">{p.weight.toFixed(1)} kg</span>
                  </div>
                ))}
              </div>
              {hasInferredWeightDates && (
                <p className="text-xs text-muted-foreground">
                  * Não foi informada a data da pesagem. O gráfico usa a data do processamento/envio dos dados.
                </p>
              )}
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
                <div className="mt-1 flex items-center justify-between gap-2">
                  <a
                    href={`https://stellar.expert/explorer/public/tx/${proofs.identity_anchor.transaction_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-primary hover:underline break-all text-xs"
                  >
                    {proofs.identity_anchor.transaction_hash}
                  </a>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => void copyText(proofs.identity_anchor!.transaction_hash, "Hash de identidade")}
                  >
                    Copiar
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Sem hash de identidade disponível.</p>
            )}

            {proofs?.nft_mint_anchor ? (
              <div className="rounded border p-3">
                <p className="text-xs text-muted-foreground">Hash de mint</p>
                <a
                  href={`https://stellar.expert/explorer/public/tx/${proofs.nft_mint_anchor.transaction_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-primary hover:underline break-all text-xs mt-1 inline-flex"
                >
                  {proofs.nft_mint_anchor.transaction_hash}
                </a>
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
