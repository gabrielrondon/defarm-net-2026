import { useState, useMemo, useEffect, useRef } from "react";
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
  Tag,
  FileText,
  Truck,
  MapPinned,
  LogOut,
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
import cowproLogo from "@/assets/partners/cowpro.png";
import { AssetQRCode } from "@/components/AssetQRCode";
import type { PublicItemEvent } from "@/lib/api/types";
import type { CheckResponse } from "@/lib/check-api/types";
import { executeCheck } from "@/lib/check-api";
import { getCarGeoJSON, getCarMetadata, type CarGeoJSON, type CarMetadata } from "@/lib/check-api/car";
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

type MetadataGroupKey = "identification" | "movement" | "weighing" | "documents" | "other";
type ProofOfLifeEvent = {
  eventId: string;
  occurredAt: string;
  latitude: number | null;
  longitude: number | null;
  activityStatus?: string;
  signalQuality?: string;
  deviceId?: string;
};

const WEIGHT_KEYS = ["weight_kg", "peso_kg", "weight", "peso"];
const WEIGHT_DATE_KEYS = ["data_peso", "weight_date", "data_pesagem", "date", "occurred_at"];
const DEFAULT_PROOF_OF_LIFE_EXPECTED_30D = 4;

const METADATA_GROUP_ORDER: MetadataGroupKey[] = [
  "identification",
  "movement",
  "weighing",
  "documents",
  "other",
];

function resolveMetadataGroup(canonicalKey: string): MetadataGroupKey {
  if (
    [
      "value_chain",
      "sisbov",
      "chip",
      "car",
      "inscricao_estadual",
      "inscricao_estadual_centro_custo",
      "animal_id",
      "partner_internal_id",
      "category",
      "breed",
    ].includes(canonicalKey)
  ) {
    return "identification";
  }
  if (["movement_type", "stock_motive", "supplier", "description", "stock_location", "batch"].includes(canonicalKey)) {
    return "movement";
  }
  if (["weight_kg", "data_peso"].includes(canonicalKey)) {
    return "weighing";
  }
  if (["document_type", "document_number", "document_date"].includes(canonicalKey)) {
    return "documents";
  }
  return "other";
}

function metadataGroupTitle(group: MetadataGroupKey, locale: MetadataLocale): string {
  if (locale === "en") {
    if (group === "identification") return "Identification";
    if (group === "movement") return "Movement";
    if (group === "weighing") return "Weighing";
    if (group === "documents") return "Documents";
    return "Additional data";
  }
  if (group === "identification") return "Identificação";
  if (group === "movement") return "Movimentação";
  if (group === "weighing") return "Pesagem";
  if (group === "documents") return "Documentos";
  return "Dados adicionais";
}

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
    canonical: "inscricao_estadual_centro_custo",
    aliases: [
      "inscricao_estadual_centro_custo",
      "inscricao_estadual_do_centro_de_custo",
      "ie_cc",
      "state_registration_cost_center",
      "inscricaeo_estadual_do_centro_de_custo",
    ],
    label: { "pt-BR": "Inscrição estadual (centro de custo)", en: "State registration (cost center)" },
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

function shortMiddle(value: string, head = 4, tail = 4): string {
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

const PAYLOAD_KEY_LABELS: Record<string, string> = {
  occurred_at: "Data",
  weight_kg: "Peso (kg)",
  location: "Local",
  source: "Origem",
  vaccine: "Vacina",
  dose: "Dose",
  veterinarian: "Veterinário",
  lote_vacina: "Lote",
  treatment: "Tratamento",
  dose_ml: "Dose (ml)",
  reason: "Motivo",
  classification: "Classificação",
  category: "Categoria",
  frame_score: "Frame",
  musculosidade: "Musculosidade",
  pelagem: "Pelagem",
  acabamento_gordura: "Acabamento",
  conformacao: "Conformação",
  escore_corporal: "Escore corporal",
  aptidao_reprodutiva: "Aptidão reprodutiva",
  peso_estimado_carcaca_kg: "Carcaça est. (kg)",
  from_location: "Origem",
  to_location: "Destino",
  from_car: "CAR origem",
  to_car: "CAR destino",
  from_municipality: "Município origem",
  to_municipality: "Município destino",
  from_state: "UF origem",
  to_state: "UF destino",
  from_coordinates: "Coord. origem",
  to_coordinates: "Coord. destino",
  coordinates: "Coordenadas",
  movement_reason: "Motivo",
  gta_number: "GTA",
  transport: "Transporte",
  distancia_km: "Distância (km)",
  transportadora: "Transportadora",
  placa_veiculo: "Placa",
  property_dfid: "Propriedade",
  car: "CAR",
  municipality: "Município",
  state: "UF",
  nota: "Observação",
};

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

function weightSourceLabel(source: WeightPoint["source"], locale: MetadataLocale): string {
  if (locale === "en") {
    if (source === "event") return "public event";
    if (source === "cid") return "versioned content";
    return "metadata";
  }
  if (source === "event") return "evento público";
  if (source === "cid") return "conteúdo versionado";
  return "metadata";
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

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toTitle(value?: string): string {
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function formatUtcDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const iso = date.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

function toProofOfLifeEvent(event: PublicItemEvent): ProofOfLifeEvent | null {
  if (event.event_type !== "custom") return null;
  const payload = (event.payload || {}) as Record<string, unknown>;
  if (payload.custom_type !== "proof_of_life") return null;

  const occurredAtRaw = typeof payload.occurred_at === "string" ? payload.occurred_at : event.created_at;
  const occurredAt = new Date(occurredAtRaw);
  if (Number.isNaN(occurredAt.getTime())) return null;

  return {
    eventId: event.id,
    occurredAt: occurredAt.toISOString(),
    latitude: toNumber(payload.latitude),
    longitude: toNumber(payload.longitude),
    activityStatus: typeof payload.activity_status === "string" ? payload.activity_status : undefined,
    signalQuality: typeof payload.signal_quality === "string" ? payload.signal_quality : undefined,
    deviceId: typeof payload.device_id === "string" ? payload.device_id : undefined,
  };
}

type JourneyPointDef = {
  lat: number;
  lon: number;
  label: string;
  date: string;
  eventType: string;
  detail: string;
  isProperty: boolean;
};

const EVENT_ICON_COLORS: Record<string, string> = {
  item_born: "#10b981",
  item_weighed: "#06b6d4",
  item_vaccinated: "#22c55e",
  item_treated: "#14b8a6",
  item_classified: "#f59e0b",
  item_slaughtered: "#ef4444",
  item_movement: "#6366f1",
  item_property_linked: "#3b82f6",
  item_property_unlinked: "#f43f5e",
};

function PropertyMapMini({ car }: { car: string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    Promise.all([
      import("leaflet").then((m) => m.default || m),
      import("leaflet/dist/leaflet.css"),
      getCarGeoJSON(car, { skipAuth: true }),
    ]).then(([L_, , geo]) => {
      if (cancelled || !mapRef.current) return;
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }

      const map = L_.map(mapRef.current, {
        zoomControl: false, attributionControl: false,
        dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false,
      });
      L_.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 18 }).addTo(map);
      const layer = L_.geoJSON(geo as any, { style: { color: "#22c55e", weight: 2, fillColor: "#22c55e", fillOpacity: 0.2 } }).addTo(map);
      map.fitBounds(layer.getBounds(), { padding: [10, 10] });
      mapInstance.current = map;
    }).catch(() => {});

    return () => { cancelled = true; if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, [car]);

  return <div ref={mapRef} className="w-full h-full" />;
}

const EVENT_ICON_EMOJI: Record<string, string> = {
  item_born: "N",
  item_weighed: "P",
  item_vaccinated: "V",
  item_treated: "T",
  item_classified: "C",
  item_slaughtered: "A",
  item_movement: "M",
  item_property_linked: "L",
  item_property_unlinked: "D",
};

function JourneyMapInline({ points }: { points: JourneyPointDef[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<Map<number, any>>(new Map());
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Extract unique CARs from property points to fetch polygons
  const propertyCars = useMemo(() => {
    const cars = new Map<string, { lat: number; lon: number }>();
    for (const pt of points) {
      if (!pt.isProperty) continue;
      const carMatch = pt.detail.match(/[A-Z]{2}-\d{5,7}-[A-F0-9]{32}/i);
      if (carMatch) {
        cars.set(carMatch[0], { lat: pt.lat, lon: pt.lon });
      }
    }
    return cars;
  }, [points]);

  // Group unique locations for summary
  const locationSummary = useMemo(() => {
    const locs = new Map<string, { name: string; count: number }>();
    for (const pt of points) {
      const key = `${pt.lat.toFixed(2)},${pt.lon.toFixed(2)}`;
      if (!locs.has(key)) locs.set(key, { name: pt.label, count: 0 });
      locs.get(key)!.count++;
    }
    return Array.from(locs.values());
  }, [points]);

  useEffect(() => {
    if (!mapRef.current || points.length === 0) return;
    let cancelled = false;

    import("leaflet").then((leafletModule) => {
      if (cancelled || !mapRef.current) return;
      import("leaflet/dist/leaflet.css");
      const L_ = leafletModule.default || leafletModule;

      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      markersRef.current.clear();

      const map = L_.map(mapRef.current, {
        zoomControl: true,
        attributionControl: false,
      });

      L_.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 18,
      }).addTo(map);

      // Draw route line between unique property coords
      const uniquePropertyCoords: [number, number][] = [];
      const seenCoords = new Set<string>();
      for (const pt of points.filter((p) => p.isProperty)) {
        const key = `${pt.lat},${pt.lon}`;
        if (!seenCoords.has(key)) {
          seenCoords.add(key);
          uniquePropertyCoords.push([pt.lat, pt.lon]);
        }
      }

      if (uniquePropertyCoords.length >= 2) {
        const lineWeight = window.innerWidth < 640 ? 6 : 4;
        const glowWeight = window.innerWidth < 640 ? 16 : 12;
        L_.polyline(uniquePropertyCoords, {
          color: "#818cf8",
          weight: glowWeight,
          opacity: 0.2,
        }).addTo(map);
        L_.polyline(uniquePropertyCoords, {
          color: "#6366f1",
          weight: lineWeight,
          opacity: 0.8,
          dashArray: "12 8",
        }).addTo(map);
      }

      // Add text labels for unique property locations
      const labeledCoords = new Set<string>();
      for (const pt of points.filter((p) => p.isProperty)) {
        const key = `${pt.lat},${pt.lon}`;
        if (labeledCoords.has(key)) continue;
        labeledCoords.add(key);
        const shortName = pt.label.replace(/^(Saída|Chegada|Vinculado):\s*/, "").replace(/^Fazenda\s+/, "Faz. ");
        const labelIcon = L_.divIcon({
          className: "",
          html: `<div style="
            background:rgba(255,255,255,0.92);
            color:#1e293b;
            font-size:11px;
            font-weight:600;
            padding:2px 8px;
            border-radius:6px;
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
            white-space:nowrap;
            pointer-events:none;
            transform:translateY(-22px);
          ">${shortName}</div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });
        L_.marker([pt.lat, pt.lon], { icon: labelIcon, interactive: false }).addTo(map);
      }

      // Detect mobile for larger markers
      const isMobile = window.innerWidth < 640;

      // Create markers for each point
      points.forEach((pt, idx) => {
        const color = EVENT_ICON_COLORS[pt.eventType] || "#8b5cf6";
        const isProperty = pt.isProperty;
        const size = isProperty ? (isMobile ? 28 : 24) : (isMobile ? 18 : 14);
        const border = isProperty ? 3 : 2;
        const emoji = EVENT_ICON_EMOJI[pt.eventType] || "📌";

        const icon = L_.divIcon({
          className: "",
          html: `<div style="
            background:${color};
            width:${size}px;height:${size}px;
            border-radius:50%;
            border:${border}px solid white;
            box-shadow:0 2px 8px rgba(0,0,0,0.4);
            transition: transform 0.2s, box-shadow 0.2s;
          " data-idx="${idx}"></div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        const popupHtml = `
          <div style="font-size:13px;max-width:260px;">
            <div style="font-size:16px;margin-bottom:2px;">${emoji}</div>
            <strong>${pt.label}</strong>
            <div style="font-size:11px;color:#888;margin-top:2px;">${pt.date}</div>
            <div style="font-size:12px;margin-top:4px;">${pt.detail}</div>
          </div>`;

        const marker = L_.marker([pt.lat, pt.lon], { icon })
          .addTo(map)
          .bindPopup(popupHtml, { maxWidth: 280 });

        marker.on("click", () => setSelectedIdx(idx));
        markersRef.current.set(idx, marker);
      });

      // Fit bounds
      const allCoords: [number, number][] = points.map((p) => [p.lat, p.lon]);
      if (allCoords.length > 0) {
        map.fitBounds(L_.latLngBounds(allCoords), { padding: [50, 50], maxZoom: 13 });
      }

      mapInstance.current = map;
      setMapReady(true);

      // Fetch CAR polygons asynchronously AFTER markers are placed
      for (const [car] of propertyCars) {
        getCarGeoJSON(car, { skipAuth: true })
          .then((geo) => {
            if (!cancelled && mapInstance.current) {
              L_.geoJSON(geo as any, {
                style: { color: "#22c55e", weight: 2, fillColor: "#22c55e", fillOpacity: 0.15 },
              }).addTo(mapInstance.current);
            }
          })
          .catch(() => {});
      }
    });

    return () => {
      cancelled = true;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      setMapReady(false);
    };
  }, [points, propertyCars]);

  const focusPoint = (idx: number) => {
    setSelectedIdx(idx);
    const marker = markersRef.current.get(idx);
    if (marker && mapInstance.current) {
      mapInstance.current.flyTo(marker.getLatLng(), 14, { duration: 0.8 });
      marker.openPopup();
    }
    // Scroll timeline item into view
    const el = timelineRef.current?.querySelector(`[data-timeline-idx="${idx}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  // Type counts for summary badges
  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const pt of points) {
      const t = pt.eventType;
      counts.set(t, (counts.get(t) || 0) + 1);
    }
    return counts;
  }, [points]);

  return (
    <div className="space-y-3">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        {locationSummary.map((loc) => (
          <span key={loc.name} className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 text-blue-700 px-2.5 py-1 text-[11px] font-medium">
            {loc.name}
            <span className="text-blue-500/70">{loc.count}</span>
          </span>
        ))}
        {Array.from(typeCounts.entries())
          .filter(([t]) => !t.includes("property"))
          .map(([t, c]) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
              {EVENT_ICON_EMOJI[t] || "📌"} {c}
            </span>
          ))}
      </div>

      {/* Map + Timeline */}
      <div className="flex gap-3 h-[320px] sm:h-[440px]">
        {/* Timeline sidebar — desktop only */}
        <div
          ref={timelineRef}
          className="w-52 shrink-0 overflow-y-auto rounded-xl border border-border bg-muted/20 p-2 space-y-0.5 hidden sm:block"
        >
          {points.map((pt, idx) => {
            const color = EVENT_ICON_COLORS[pt.eventType] || "#8b5cf6";
            const isActive = selectedIdx === idx;
            return (
              <button
                key={idx}
                data-timeline-idx={idx}
                onClick={() => focusPoint(idx)}
                className={`w-full text-left rounded-lg px-2.5 py-2 transition-all text-xs ${
                  isActive
                    ? "bg-primary/10 ring-1 ring-primary/30"
                    : "hover:bg-muted/60"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: color, border: "2px solid white", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}
                  />
                  <span className="text-muted-foreground tabular-nums">{pt.date}</span>
                </div>
                <p className={`mt-0.5 leading-tight truncate ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {EVENT_ICON_EMOJI[pt.eventType] || ""} {pt.detail.length > 40 ? pt.detail.slice(0, 40) + "…" : pt.detail}
                </p>
              </button>
            );
          })}
        </div>

        {/* Map */}
        <div className="flex-1 min-w-0">
          <div
            ref={mapRef}
            className="rounded-xl border border-border overflow-hidden h-full"
          />
        </div>
      </div>

      {/* Mobile timeline — horizontal scroll below map */}
      <div className="flex gap-2 overflow-x-auto pb-2 sm:hidden -mx-1 px-1">
        {points.map((pt, idx) => {
          const color = EVENT_ICON_COLORS[pt.eventType] || "#8b5cf6";
          const isActive = selectedIdx === idx;
          return (
            <button
              key={idx}
              onClick={() => focusPoint(idx)}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs border transition-all ${
                isActive
                  ? "bg-primary/10 border-primary/30"
                  : "bg-muted/30 border-border"
              }`}
              style={{ minWidth: "120px" }}
            >
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-muted-foreground tabular-nums">{pt.date}</span>
              </div>
              <p className={`mt-0.5 truncate ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {EVENT_ICON_EMOJI[pt.eventType] || ""} {pt.detail.length > 28 ? pt.detail.slice(0, 28) + "…" : pt.detail}
              </p>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm" /> Propriedade</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-500 border border-white shadow-sm" /> Pesagem</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 border border-white shadow-sm" /> Vacinação</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-teal-500 border border-white shadow-sm" /> Tratamento</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 border border-white shadow-sm" /> Classificação</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500 border border-white shadow-sm" /> Movimentação</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-6 h-3 rounded border border-green-500/40" style={{ background: "rgba(34,197,94,0.15)" }} /> Polígono CAR</span>
      </div>
    </div>
  );
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
  const [carMetadata, setCarMetadata] = useState<CarMetadata | null>(null);
  const [carMetaLoading, setCarMetaLoading] = useState(false);
  const [carDialogValue, setCarDialogValue] = useState<string | null>(null);

  const [showWeightDialog, setShowWeightDialog] = useState(false);
  const [showIdentityDialog, setShowIdentityDialog] = useState(false);
  const [showCidDialog, setShowCidDialog] = useState(false);
  const [cidViewContent, setCidViewContent] = useState<{ cid: string; data: Record<string, unknown> } | null>(null);
  const [cidViewLoading, setCidViewLoading] = useState(false);
  const [showCircuitsDialog, setShowCircuitsDialog] = useState(false);
  const [showProofOfLifeDialog, setShowProofOfLifeDialog] = useState(false);
  const [showJourneyDialog, setShowJourneyDialog] = useState(false);
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

  const groupedMetadataEntries = useMemo(() => {
    const grouped = new Map<MetadataGroupKey, NormalizedMetadataEntry[]>();
    for (const entry of visibleMetadataEntries) {
      const group = resolveMetadataGroup(entry.canonicalKey);
      if (!grouped.has(group)) grouped.set(group, []);
      grouped.get(group)!.push(entry);
    }

    return METADATA_GROUP_ORDER.map((group) => ({
      group,
      entries: grouped.get(group) || [],
    })).filter((section) => section.entries.length > 0);
  }, [visibleMetadataEntries]);

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

  const proofOfLifeEvents = useMemo<ProofOfLifeEvent[]>(() => {
    return events
      .map(toProofOfLifeEvent)
      .filter((event): event is ProofOfLifeEvent => !!event)
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }, [events]);

  const latestProofOfLife = proofOfLifeEvents[0] || null;

  const proofOfLife30Days = useMemo(() => {
    const nowMs = Date.now();
    const threshold = nowMs - 30 * 24 * 60 * 60 * 1000;
    return proofOfLifeEvents.filter((event) => new Date(event.occurredAt).getTime() >= threshold).length;
  }, [proofOfLifeEvents]);

  const proofOfLifeExpected30Days = useMemo(() => {
    if (!latestProofOfLife) return DEFAULT_PROOF_OF_LIFE_EXPECTED_30D;
    const fromPayload = events.find((event) => event.id === latestProofOfLife.eventId)?.payload as
      | Record<string, unknown>
      | undefined;
    const expected = toNumber(fromPayload?.expected_checkins_30d);
    return expected && expected > 0 ? Math.floor(expected) : DEFAULT_PROOF_OF_LIFE_EXPECTED_30D;
  }, [events, latestProofOfLife]);

  const proofOfLifeStatusLabel = useMemo(() => {
    if (!latestProofOfLife) return "Unknown";
    const isActive = latestProofOfLife.activityStatus?.toLowerCase() === "active";
    const hasLocation = latestProofOfLife.latitude !== null && latestProofOfLife.longitude !== null;
    if (isActive && hasLocation) return "Active & Located";
    return toTitle(latestProofOfLife.activityStatus);
  }, [latestProofOfLife]);

  const journeyPoints = useMemo<JourneyPointDef[]>(() => {
    const points: JourneyPoint[] = [];
    for (const e of events) {
      const p = (e.payload || {}) as Record<string, unknown>;
      const coords = p.coordinates as { lat?: number; lon?: number } | undefined;
      const fromCoords = p.from_coordinates as { lat?: number; lon?: number } | undefined;
      const toCoords = p.to_coordinates as { lat?: number; lon?: number } | undefined;
      const occurred = typeof p.occurred_at === "string" ? p.occurred_at : "";
      const etype = e.event_type;
      const eLabel = eventTypeLabels[etype] || etype;

      if (etype === "item_movement" && fromCoords?.lat && fromCoords?.lon && toCoords?.lat && toCoords?.lon) {
        points.push({
          lat: fromCoords.lat, lon: fromCoords.lon,
          label: `Saída: ${typeof p.from_location === "string" ? p.from_location : "Origem"}`,
          date: occurred, eventType: etype,
          detail: `${eLabel} → ${typeof p.to_location === "string" ? p.to_location : "?"} ${typeof p.gta_number === "string" ? `(GTA: ${p.gta_number})` : ""}`,
          isProperty: true,
        });
        points.push({
          lat: toCoords.lat, lon: toCoords.lon,
          label: `Chegada: ${typeof p.to_location === "string" ? p.to_location : "Destino"}`,
          date: occurred, eventType: etype,
          detail: `${eLabel} — ${typeof p.distancia_km === "number" ? `${p.distancia_km}km` : ""}`,
          isProperty: true,
        });
        continue;
      }

      if (etype === "item_property_linked" && coords?.lat && coords?.lon) {
        points.push({
          lat: coords.lat, lon: coords.lon,
          label: typeof p.property_dfid === "string" ? p.property_dfid : "Propriedade",
          date: occurred, eventType: etype,
          detail: `Vinculado — ${typeof p.car === "string" ? p.car : ""}`,
          isProperty: true,
        });
        continue;
      }

      if (coords?.lat && coords?.lon) {
        let detail = eLabel;
        if (typeof p.weight_kg === "number") detail = `${eLabel}: ${p.weight_kg}kg`;
        else if (typeof p.vaccine === "string") detail = `${eLabel}: ${p.vaccine}`;
        else if (typeof p.treatment === "string") detail = `${eLabel}: ${p.treatment}`;
        else if (typeof p.classification === "string") detail = `${eLabel}: ${p.classification}`;
        points.push({
          lat: coords.lat, lon: coords.lon,
          label: typeof p.location === "string" ? p.location : eLabel,
          date: occurred, eventType: etype, detail, isProperty: false,
        });
      }
    }
    return points.sort((a, b) => a.date.localeCompare(b.date));
  }, [events]);

  const hasJourneyData = journeyPoints.length > 0;

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
    setCarDialogValue(carValue);
    setShowCarDialog(true);
    setCarGeojson(null);
    setCarResult(null);
    setCarMetadata(null);

    if (!carHasOfficialFormat) {
      setCarGeoError(null);
      setCarError("Este CAR não está no formato oficial para verificação automática.");
      return;
    }

    // Fetch GeoJSON (public, no auth needed)
    setCarGeoLoading(true);
    setCarGeoError(null);
    getCarGeoJSON(carValue, { skipAuth: true })
      .then((geo) => setCarGeojson(geo))
      .catch(() => {
        setCarGeoError(null);
      })
      .finally(() => setCarGeoLoading(false));

    // Fetch metadata (public, no auth needed)
    setCarMetaLoading(true);
    getCarMetadata(carValue, { skipAuth: true })
      .then((meta) => setCarMetadata(meta))
      .catch((err) => {
        console.warn("[CAR Metadata] Failed to fetch:", err);
      })
      .finally(() => setCarMetaLoading(false));

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

  const isBeta = new URLSearchParams(window.location.search).get("beta") === "1";

  const animalAge = useMemo(() => {
    const m = ((item?.metadata || {}) as Record<string, unknown>);
    const bd = typeof m.birth_date === "string" ? m.birth_date : null;
    if (!bd) return null;
    const birth = new Date(bd);
    if (isNaN(birth.getTime())) return null;
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (months < 0) { years--; months += 12; }
    if (now.getDate() < birth.getDate()) months--;
    if (months < 0) { years--; months += 12; }
    if (years > 0 && months > 0) return `${years} ano${years > 1 ? "s" : ""} e ${months} mes${months > 1 ? "es" : ""}`;
    if (years > 0) return `${years} ano${years > 1 ? "s" : ""}`;
    return `${months} mes${months > 1 ? "es" : ""}`;
  }, [item?.metadata]);

  const sanitySummary = useMemo(() => {
    if (!events.length) return null;
    const vaccines: { name: string; date: string }[] = [];
    const treatments: { name: string; date: string }[] = [];
    let lastWeight: number | null = null;
    let lastWeightDate: string | null = null;
    let firstWeight: number | null = null;
    let firstWeightDate: string | null = null;
    for (const e of events) {
      const p = (e.payload || {}) as Record<string, unknown>;
      if (e.event_type === "item_vaccinated" && typeof p.vaccine === "string")
        vaccines.push({ name: p.vaccine, date: typeof p.occurred_at === "string" ? p.occurred_at : "" });
      if (e.event_type === "item_treated" && typeof p.treatment === "string")
        treatments.push({ name: p.treatment, date: typeof p.occurred_at === "string" ? p.occurred_at : "" });
      if (e.event_type === "item_weighed" && typeof p.weight_kg === "number") {
        const d = typeof p.occurred_at === "string" ? p.occurred_at : "";
        if (!firstWeight || (d && d < (firstWeightDate || "9"))) { firstWeight = p.weight_kg; firstWeightDate = d; }
        if (!lastWeight || (d && d > (lastWeightDate || ""))) { lastWeight = p.weight_kg; lastWeightDate = d; }
      }
    }
    let gmd: number | null = null;
    if (firstWeight && lastWeight && firstWeightDate && lastWeightDate && firstWeightDate !== lastWeightDate) {
      const days = (new Date(lastWeightDate).getTime() - new Date(firstWeightDate).getTime()) / (1000 * 60 * 60 * 24);
      if (days > 0) gmd = (lastWeight - firstWeight) / days;
    }
    return { vaccines, treatments, lastWeight, lastWeightDate, firstWeight, gmd };
  }, [events]);

  const currentProperty = useMemo(() => {
    const linked = events
      .filter((e) => e.event_type === "item_property_linked")
      .map((e) => ({ payload: (e.payload || {}) as Record<string, unknown>, created: e.created_at }))
      .sort((a, b) => b.created.localeCompare(a.created));
    if (!linked.length) return null;
    const p = linked[0].payload;
    return {
      name: typeof p.property_dfid === "string" ? p.property_dfid : null,
      car: typeof p.car === "string" ? p.car : null,
      municipality: typeof p.municipality === "string" ? p.municipality : null,
      state: typeof p.state === "string" ? p.state : null,
    };
  }, [events]);

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
      <div className="space-y-5">
        <div className="rounded-2xl bg-white border border-stone-200/70 shadow-sm p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
            <span>{metadata.breed ? String(metadata.breed) : chainLabels[item.value_chain] || item.value_chain}</span>
            {metadata.sex && <><span className="text-muted-foreground/40">·</span><span>{String(metadata.sex) === "male" ? "Macho" : String(metadata.sex) === "female" ? "Fêmea" : String(metadata.sex)}</span></>}
            {metadata.birth_date && <><span className="text-muted-foreground/40">·</span><span>Nasc. {String(metadata.birth_date)}{animalAge ? ` (${animalAge})` : ""}</span></>}
            <span className="text-muted-foreground/40">·</span><span>{item.country}</span>
          </div>
          <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground/50 mt-2">Identidade Digital</p>
          <h1 className="text-sm sm:text-base md:text-xl font-bold text-foreground font-mono tracking-tight break-all leading-relaxed">
            {item.dfid}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.className}`}>{st.text}</span>
            {canonicalIdentifier && (
              <span className="text-xs text-muted-foreground font-mono">
                {canonicalIdentifier.label}: {canonicalIdentifier.value}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDateShort(item.updated_at || item.created_at)}
            </span>
          </div>
        </div>

        {/* === BETA: Propriedade atual + Sanidade + Peso inline === */}
        {isBeta && currentProperty?.car && (
          <section className="rounded-xl bg-white border border-stone-200/70 shadow-sm p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Propriedade atual</p>
                <p className="text-sm font-semibold text-foreground">{currentProperty.name || "—"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {[currentProperty.municipality, currentProperty.state].filter(Boolean).join(" / ")}
                </p>
                <button
                  onClick={() => {
                    if (currentProperty.car && isOfficialCarFormat(currentProperty.car)) {
                      setCarDialogValue(currentProperty.car);
                      setCarGeojson(null); setCarMetadata(null); setCarResult(null);
                      setCarError(null); setCarGeoError(null); setShowCarDialog(true);
                      setCarGeoLoading(true); setCarMetaLoading(true);
                      getCarGeoJSON(currentProperty.car, { skipAuth: true }).then((g) => setCarGeojson(g)).catch(() => {}).finally(() => setCarGeoLoading(false));
                      getCarMetadata(currentProperty.car, { skipAuth: true }).then((m) => setCarMetadata(m)).catch(() => {}).finally(() => setCarMetaLoading(false));
                    }
                  }}
                  className="text-xs text-primary hover:underline mt-1 font-mono"
                >
                  {currentProperty.car}
                </button>
              </div>
              <div className="w-full sm:w-48 h-32 rounded-lg border border-border overflow-hidden shrink-0">
                {currentProperty.car && (
                  <PropertyMapMini car={currentProperty.car} />
                )}
              </div>
            </div>
          </section>
        )}

        {isBeta && sanitySummary && (
          <section className="rounded-xl bg-white border border-stone-200/70 shadow-sm p-4 sm:p-5">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-3">Sanidade</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200/50 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-700">{sanitySummary.vaccines.length}</p>
                <p className="text-[11px] text-emerald-600 mt-0.5">Vacinações</p>
              </div>
              <div className="rounded-lg bg-teal-50 border border-teal-200/50 p-3 text-center">
                <p className="text-2xl font-bold text-teal-700">{sanitySummary.treatments.length}</p>
                <p className="text-[11px] text-teal-600 mt-0.5">Tratamentos</p>
              </div>
              <div className="rounded-lg bg-cyan-50 border border-cyan-200/50 p-3 text-center">
                <p className="text-2xl font-bold text-cyan-700">{weightHistory.length}</p>
                <p className="text-[11px] text-cyan-600 mt-0.5">Pesagens</p>
              </div>
              {sanitySummary.gmd !== null && (
                <div className="rounded-lg bg-amber-50 border border-amber-200/50 p-3 text-center">
                  <p className="text-2xl font-bold text-amber-700">{sanitySummary.gmd.toFixed(2)}</p>
                  <p className="text-[11px] text-amber-600 mt-0.5">GMD (kg/dia)</p>
                </div>
              )}
            </div>
            {sanitySummary.vaccines.length > 0 && (
              <div className="mt-3 space-y-1">
                {sanitySummary.vaccines.map((v, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-foreground">{v.name}</span>
                    <span className="text-muted-foreground">{v.date}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {isBeta && weightHistory.length >= 2 && (
          <section className="rounded-xl bg-white border border-stone-200/70 shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Evolução de peso</p>
              {sanitySummary?.lastWeight && (
                <span className="text-sm font-semibold text-foreground">{sanitySummary.lastWeight} kg</span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={weightHistory.map((wp) => ({ name: wp.label, peso: wp.weight }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                <RechartsTooltip contentStyle={{ fontSize: 12 }} formatter={(v: number) => [`${v} kg`, "Peso"]} />
                <Line type="monotone" dataKey="peso" stroke="#16a34a" strokeWidth={2} dot={{ fill: "#16a34a", r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </section>
        )}

        <section className="rounded-xl bg-white border border-stone-200/70 shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Redes de rastreabilidade</h2>
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

        {hasJourneyData && (
          <section
            className="rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50/80 via-white to-white shadow-sm p-5 sm:p-6 cursor-pointer group"
            onClick={() => setShowJourneyDialog(true)}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-500/20 transition-colors">
                <MapPinned className="h-7 w-7 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-indigo-950">Jornada do Animal</h2>
                <p className="text-sm text-indigo-700/70 mt-1">
                  {(() => { const u = new Set(journeyPoints.map((p) => `${p.lat.toFixed(2)},${p.lon.toFixed(2)}`)); return u.size; })()} propriedade{new Set(journeyPoints.map((p) => `${p.lat.toFixed(2)},${p.lon.toFixed(2)}`)).size !== 1 ? "s" : ""} · {journeyPoints.length} eventos geolocalizados · mapa interativo com timeline
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {Array.from(
                    (() => { const locs = new Map<string, string>(); for (const pt of journeyPoints.filter((p) => p.isProperty)) { const key = `${pt.lat.toFixed(2)},${pt.lon.toFixed(2)}`; if (!locs.has(key)) locs.set(key, pt.label.replace(/^(Saída|Chegada|Vinculado):\s*/, "")); } return locs.values(); })()
                  ).map((name) => (
                    <span key={name} className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 text-indigo-700 px-2 py-0.5 text-[11px] font-medium">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
              <Button size="sm" variant="outline" className="border-indigo-300 text-indigo-700 hover:bg-indigo-100 self-start sm:self-center">
                <MapPinned className="h-4 w-4 mr-1.5" />
                Ver mapa
              </Button>
            </div>
          </section>
        )}

        {latestProofOfLife && (
          <section className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/60 p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="relative inline-flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500/45 motion-safe:animate-ping" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600 ring-2 ring-emerald-100" />
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white/90 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-emerald-800">
                    <Activity className="h-3 w-3" />
                    Live telemetry
                  </span>
                </div>
                <p className="text-base font-semibold text-emerald-950">Proof of Life</p>
                <p className="text-xs text-emerald-700">
                  Last check-in: {formatUtcDateTime(latestProofOfLife.occurredAt)}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/90 border border-emerald-200 px-2.5 py-1">
                <span className="text-[11px] uppercase tracking-wide text-emerald-700">by</span>
                <img src={cowproLogo} alt="CowPro" className="h-4 w-auto object-contain" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <p className="text-emerald-900">
                <span className="font-medium">Location:</span>{" "}
                {latestProofOfLife.latitude !== null && latestProofOfLife.longitude !== null
                  ? `${latestProofOfLife.latitude.toFixed(4)}, ${latestProofOfLife.longitude.toFixed(4)}`
                  : "Unavailable"}
              </p>
              <p className="text-emerald-900">
                <span className="font-medium">Status:</span> {proofOfLifeStatusLabel}
              </p>
              <p className="text-emerald-900">
                <span className="font-medium">Signal:</span> {toTitle(latestProofOfLife.signalQuality)}
              </p>
              <p className="text-emerald-900">
                <span className="font-medium">Device:</span> {latestProofOfLife.deviceId || "Unknown"}
              </p>
            </div>
            <div className="mt-3 border-t border-emerald-200/80 pt-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-emerald-900">
                  <span className="font-medium">Last 30 days:</span> {proofOfLife30Days}/{proofOfLifeExpected30Days} check-ins{" "}
                  {proofOfLife30Days >= proofOfLifeExpected30Days ? "✓" : ""}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                  onClick={() => setShowProofOfLifeDialog(true)}
                >
                  Ver localizações
                </Button>
              </div>
            </div>
          </section>
        )}

        {visibleMetadataEntries.length > 0 && (
          <section className="rounded-xl bg-white border border-stone-200/70 shadow-sm p-5">
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
            <div className="space-y-4">
              {groupedMetadataEntries.map(({ group, entries }) => (
                <div key={group} className="space-y-2.5">
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-muted/40 px-2.5 py-1">
                    {group === "identification" ? (
                      <Tag className="h-3.5 w-3.5 text-primary" />
                    ) : group === "movement" ? (
                      <Truck className="h-3.5 w-3.5 text-primary" />
                    ) : group === "weighing" ? (
                      <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    ) : group === "documents" ? (
                      <FileText className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Info className="h-3.5 w-3.5 text-primary" />
                    )}
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {metadataGroupTitle(group, metadataLocale)}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {entries.map((entry) => {
                      const { canonicalKey, rawKeys, value } = entry;
                      const normalized = normalizeFieldKey(canonicalKey);
                      const displayLabel = getMetadataLabel(canonicalKey, metadataLocale);

                      if (normalized === "sisbov" && (typeof value === "string" || typeof value === "number")) {
                        const sisbov = String(value);
                        const sisbovDfidUrl = resolvedDfid ? `/i/${encodeURIComponent(resolvedDfid)}` : `/i/sisbov/${encodeURIComponent(sisbov)}`;
                        const refUrl = `${window.location.origin}${sisbovDfidUrl}`;
                        return (
                          <div key={`${canonicalKey}-${rawKeys.join(",")}`} className="bg-muted/40 rounded-lg p-3 space-y-2">
                            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">SISBOV</p>
                            <a
                              href={sisbovDfidUrl}
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

                      if (
                        (normalized === "inscricao_estadual" || normalized === "inscricao_estadual_centro_custo") &&
                        (typeof value === "string" || typeof value === "number")
                      ) {
                        const ieValue = String(value).trim();
                        const ieMasked = shortMiddle(ieValue, 4, 3);
                        return (
                          <div key={`${canonicalKey}-${rawKeys.join(",")}`} className="bg-muted/40 rounded-lg p-3 space-y-2">
                            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{displayLabel}</p>
                            <p className="text-sm font-medium text-foreground break-all">{ieMasked}</p>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() =>
                                  void copyText(
                                    ieValue,
                                    metadataLocale === "en"
                                      ? normalized === "inscricao_estadual_centro_custo"
                                        ? "Cost center state registration"
                                        : "State registration"
                                      : normalized === "inscricao_estadual_centro_custo"
                                      ? "Inscrição estadual do centro de custo"
                                      : "Inscrição estadual"
                                  )
                                }
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                {metadataLocale === "en" ? "Copy number" : "Copiar número"}
                              </Button>
                            </div>
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
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-xl bg-white border border-stone-200/70 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Database className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Registro verificável</h2>
              <p className="text-xs text-muted-foreground">
                {metadataLocale === "en"
                  ? "Blockchain anchoring + versioned content (IPFS)"
                  : "Ancorado em blockchain + conteúdo versionado (IPFS)"}
              </p>
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
                  {metadataLocale === "en"
                    ? `${realEvents.length} public · ${operationalEvents.length} technical`
                    : `${realEvents.length} público${realEvents.length !== 1 ? "s" : ""} · ${operationalEvents.length} técnico${operationalEvents.length !== 1 ? "s" : ""}`}
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
                    {metadataLocale === "en" ? "Hide technical" : "Ocultar operacionais"}
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    {metadataLocale === "en" ? "Show technical" : "Mostrar técnicos"}
                  </>
                )}
              </button>
            )}
          </div>

          {!isAuthenticated ? (
            <div className="rounded-xl border border-border bg-muted/30 py-8 px-5 text-center">
              <Lock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-foreground font-medium">
                {metadataLocale === "en" ? "History visible for logged-in users" : "Histórico visível para usuários logados"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {metadataLocale === "en"
                  ? "Sign in to DeFarm to view detailed timeline context."
                  : "Entre na DeFarm para visualizar a timeline detalhada."}
              </p>
              <Link to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`} className="inline-block mt-4">
                <Button size="sm">{metadataLocale === "en" ? "Sign in to DeFarm" : "Entrar na DeFarm"}</Button>
              </Link>
            </div>
          ) : isLoadingEvents ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : visibleEvents.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/30 py-12 text-center">
              <Activity className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-foreground font-medium">
                {metadataLocale === "en" ? "No public events for this item." : "Sem eventos públicos neste item."}
              </p>
              {operationalEvents.length > 0 && !showOperational ? (
                <>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metadataLocale === "en"
                      ? `${operationalEvents.length} technical event${operationalEvents.length !== 1 ? "s are" : " is"} available to view.`
                      : `Há ${operationalEvents.length} evento${operationalEvents.length !== 1 ? "s" : ""} técnico${operationalEvents.length !== 1 ? "s" : ""} disponível${operationalEvents.length !== 1 ? "is" : ""} para visualização.`}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4"
                    onClick={() => setShowOperational(true)}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                    {metadataLocale === "en" ? "Show technical" : "Mostrar técnicos"}
                  </Button>
                </>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  {metadataLocale === "en"
                    ? "Events may exist with private visibility (circuit_only/selective)."
                    : "Eventos podem existir com visibilidade privada (circuit_only/selective)."}
                </p>
              )}
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
                                {Object.entries(event.payload!).map(([k, v]) => {
                                  const strVal = typeof v === "object" ? JSON.stringify(v) : String(v ?? "-");
                                  const isCarField = (k === "car" || k === "from_car" || k === "to_car") && typeof v === "string" && isOfficialCarFormat(v);
                                  return (
                                    <div key={k} className="flex gap-2 text-xs">
                                      <span className="text-muted-foreground min-w-[100px]">{PAYLOAD_KEY_LABELS[k] || k}:</span>
                                      {isCarField ? (
                                        <button
                                          onClick={() => {
                                            const carVal = v as string;
                                            setCarDialogValue(carVal);
                                            setCarGeojson(null);
                                            setCarMetadata(null);
                                            setCarResult(null);
                                            setCarError(null);
                                            setCarGeoError(null);
                                            setShowCarDialog(true);
                                            setCarGeoLoading(true);
                                            setCarMetaLoading(true);
                                            getCarGeoJSON(carVal, { skipAuth: true })
                                              .then((geo) => setCarGeojson(geo))
                                              .catch(() => {})
                                              .finally(() => setCarGeoLoading(false));
                                            getCarMetadata(carVal, { skipAuth: true })
                                              .then((meta) => setCarMetadata(meta))
                                              .catch(() => {})
                                              .finally(() => setCarMetaLoading(false));
                                            if (isAuthenticated && isOfficialCarFormat(carVal)) {
                                              setCarLoading(true);
                                              executeCheck({ input: { type: "CAR", value: carVal }, options: { useCache: true, includeEvidence: false } })
                                                .then((res) => setCarResult(res))
                                                .catch(() => setCarError(null))
                                                .finally(() => setCarLoading(false));
                                            }
                                          }}
                                          className="text-primary hover:underline break-all font-mono text-left"
                                        >
                                          {strVal}
                                        </button>
                                      ) : (
                                        <span className="text-foreground break-all font-mono">{strVal}</span>
                                      )}
                                    </div>
                                  );
                                })}
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
            setCarMetaLoading(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-4 w-4" /> Verificação de CAR
            </DialogTitle>
            <DialogDescription>
              {(carDialogValue || carValue) ? `CAR: ${carDialogValue || carValue}` : "CAR não informado no item."}
            </DialogDescription>
          </DialogHeader>

          {!(carDialogValue || carValue) ? (
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

              {/* CAR Metadata (public, always shown) */}
              {carMetaLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando dados do CAR...
                </div>
              ) : carMetadata ? (
                <div className="bg-muted/40 rounded-lg p-3 space-y-2">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Dados do Cadastro</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    {carMetadata.status && (
                      <div>
                        <span className="text-muted-foreground text-xs">Status</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`inline-block h-2 w-2 rounded-full ${
                            carMetadata.status === "AT" || carMetadata.status === "Ativo" ? "bg-emerald-500" :
                            carMetadata.status === "PE" || carMetadata.status === "Pendente" ? "bg-yellow-500" :
                            carMetadata.status === "CA" || carMetadata.status === "Cancelado" ? "bg-red-500" :
                            carMetadata.status === "SU" || carMetadata.status === "Suspenso" ? "bg-orange-500" :
                            "bg-gray-400"
                          }`} />
                          <span className="font-medium">{
                          carMetadata.status === "AT" ? "Ativo" :
                          carMetadata.status === "PE" ? "Pendente" :
                          carMetadata.status === "CA" ? "Cancelado" :
                          carMetadata.status === "SU" ? "Suspenso" :
                          carMetadata.status
                        }</span>
                        </div>
                      </div>
                    )}
                    {(carMetadata.municipality || carMetadata.state) && (
                      <div>
                        <span className="text-muted-foreground text-xs">Município / UF</span>
                        <p className="font-medium mt-0.5">{[carMetadata.municipality, carMetadata.state].filter(Boolean).join(" / ")}</p>
                      </div>
                    )}
                    {typeof carMetadata.area === "number" && (
                      <div>
                        <span className="text-muted-foreground text-xs">Área</span>
                        <p className="font-medium mt-0.5">{carMetadata.area.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha</p>
                      </div>
                    )}
                    {carMetadata.biome && (
                      <div>
                        <span className="text-muted-foreground text-xs">Bioma</span>
                        <p className="font-medium mt-0.5">{carMetadata.biome}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {carLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Consultando compliance...
                </div>
              ) : carResult ? (
                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Compliance Check</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Veredito</span>
                      <p className={`font-medium mt-0.5 ${carResult.verdict === "pass" ? "text-emerald-600" : carResult.verdict === "fail" ? "text-red-600" : "text-amber-600"}`}>{carResult.verdict}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Score</span>
                      <p className="font-medium mt-0.5">{carResult.score}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Checkers</span>
                      <p className="font-medium mt-0.5">{carResult.summary.totalCheckers}</p>
                    </div>
                    {carResult.summary.failed > 0 && (
                      <div>
                        <span className="text-muted-foreground text-xs">Falhas</span>
                        <p className="font-medium mt-0.5 text-red-600">{carResult.summary.failed}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showJourneyDialog} onOpenChange={setShowJourneyDialog}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Jornada do Animal</DialogTitle>
            <DialogDescription>
              Mapa com propriedades, deslocamentos e eventos geolocalizados. Clique nos marcadores para ver detalhes.
            </DialogDescription>
          </DialogHeader>
          {showJourneyDialog && journeyPoints.length > 0 && (
            <JourneyMapInline points={journeyPoints} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCircuitsDialog} onOpenChange={setShowCircuitsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redes de rastreabilidade</DialogTitle>
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

      <Dialog open={showProofOfLifeDialog} onOpenChange={setShowProofOfLifeDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Proof of Life · CowPro</DialogTitle>
            <DialogDescription>Últimos check-ins públicos (mais recente primeiro).</DialogDescription>
          </DialogHeader>

          {proofOfLifeEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum check-in encontrado para este item.</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {proofOfLifeEvents.map((checkin, index) => (
                <div key={`${checkin.eventId}-${index}`} className="rounded-lg border border-border p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">{formatUtcDateTime(checkin.occurredAt)}</p>
                  <p className="text-sm text-foreground">
                    <span className="font-medium">Location:</span>{" "}
                    {checkin.latitude !== null && checkin.longitude !== null
                      ? `${checkin.latitude.toFixed(4)}, ${checkin.longitude.toFixed(4)}`
                      : "Unavailable"}
                  </p>
                  <p className="text-sm text-foreground">
                    <span className="font-medium">Status:</span> {toTitle(checkin.activityStatus)}
                  </p>
                  <p className="text-sm text-foreground">
                    <span className="font-medium">Signal:</span> {toTitle(checkin.signalQuality)}
                  </p>
                  <p className="text-sm text-foreground">
                    <span className="font-medium">Device:</span> {checkin.deviceId || "Unknown"}
                  </p>
                </div>
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
                    <RechartsTooltip
                      formatter={(value: number, _name, item) => {
                        const payload = item?.payload as WeightPoint | undefined;
                        const src = payload ? weightSourceLabel(payload.source, metadataLocale) : "-";
                        const inferred = payload?.inferredDate
                          ? metadataLocale === "en"
                            ? " (inferred date)"
                            : " (data inferida)"
                          : "";
                        return [
                          `${Number(value).toFixed(1)} kg · ${src}${inferred}`,
                          metadataLocale === "en" ? "Weight" : "Peso",
                        ];
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={(props) => {
                        const payload = props.payload as WeightPoint;
                        const inferred = payload?.inferredDate;
                        return (
                          <circle
                            cx={props.cx}
                            cy={props.cy}
                            r={inferred ? 4 : 3}
                            fill={inferred ? "#f59e0b" : "#22c55e"}
                            stroke="#ffffff"
                            strokeWidth={1}
                          />
                        );
                      }}
                    />
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
                    <span className="font-medium">
                      {p.weight.toFixed(1)} kg
                      <span className="ml-1 text-[10px] text-muted-foreground">
                        · {weightSourceLabel(p.source, metadataLocale)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              {hasInferredWeightDates && (
                <p className="text-xs text-muted-foreground">
                  {metadataLocale === "en"
                    ? "* Weighing date was not provided. The chart uses the data processing/submission date."
                    : "* Não foi informada a data da pesagem. O gráfico usa a data do processamento/envio dos dados."}
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
              <div className="rounded border p-3 space-y-2">
                <p className="text-xs text-muted-foreground">Último CID (v{latestContentVersion.version})</p>
                <p className="font-mono text-xs text-foreground break-all">{latestContentVersion.cid}</p>
                <div className="flex items-center gap-2">
                  <a
                    href={latestContentVersion.gateway_url || `https://gateway.pinata.cloud/ipfs/${latestContentVersion.cid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Ver registro original <ExternalLink className="h-3 w-3" />
                  </a>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={async () => {
                      const url = latestContentVersion.gateway_url || `https://gateway.pinata.cloud/ipfs/${latestContentVersion.cid}`;
                      setCidViewLoading(true);
                      try {
                        const res = await fetch(url);
                        const data = await res.json();
                        setCidViewContent({ cid: latestContentVersion.cid, data });
                      } catch {
                        setCidViewContent(null);
                      } finally {
                        setCidViewLoading(false);
                      }
                    }}
                  >
                    {cidViewLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Visualizar"}
                  </Button>
                </div>
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

            {cidViewContent && (
              <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Conteúdo do registro</p>
                  <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => setCidViewContent(null)}>Fechar</Button>
                </div>
                {cidViewContent.data.schema_version && (
                  <p className="text-xs text-muted-foreground">Schema v{String(cidViewContent.data.schema_version)}</p>
                )}

                {cidViewContent.data.identity && typeof cidViewContent.data.identity === "object" && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-foreground">Identidade</p>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {Object.entries(cidViewContent.data.identity as Record<string, unknown>).filter(([, v]) => v != null && !Array.isArray(v)).map(([k, v]) => (
                        <div key={k} className="flex gap-1.5"><span className="text-muted-foreground">{PAYLOAD_KEY_LABELS[k] || k}:</span><span className="font-mono">{String(v)}</span></div>
                      ))}
                    </div>
                  </div>
                )}

                {cidViewContent.data.sanity && typeof cidViewContent.data.sanity === "object" && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-foreground">Resumo sanitário</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-xs">
                      {Object.entries(cidViewContent.data.sanity as Record<string, unknown>).filter(([, v]) => v != null).map(([k, v]) => (
                        <div key={k} className="flex gap-1.5"><span className="text-muted-foreground">{k.replace(/_/g, " ")}:</span><span className="font-mono">{String(v)}</span></div>
                      ))}
                    </div>
                  </div>
                )}

                {cidViewContent.data.events && typeof cidViewContent.data.events === "object" && (cidViewContent.data.events as Record<string, unknown>).hash && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-foreground">Hash dos eventos</p>
                    <p className="font-mono text-[11px] text-muted-foreground break-all">{String((cidViewContent.data.events as Record<string, unknown>).hash)}</p>
                    <p className="text-[10px] text-muted-foreground">BLAKE3 — concatenação cronológica</p>
                  </div>
                )}

                {cidViewContent.data.provenance && typeof cidViewContent.data.provenance === "object" && (cidViewContent.data.provenance as Record<string, unknown>).previous_cid && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-foreground">Versão anterior</p>
                    <p className="font-mono text-[11px] text-muted-foreground break-all">{String((cidViewContent.data.provenance as Record<string, unknown>).previous_cid)}</p>
                  </div>
                )}

                {/* Fallback: legacy format (v2) — show business section */}
                {cidViewContent.data.business && !cidViewContent.data.identity && typeof cidViewContent.data.business === "object" && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-foreground">Dados do animal</p>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {Object.entries((cidViewContent.data.business as Record<string, unknown>)).filter(([k, v]) => v != null && k !== "metadata" && typeof v !== "object").map(([k, v]) => (
                        <div key={k} className="flex gap-1.5"><span className="text-muted-foreground">{PAYLOAD_KEY_LABELS[k] || k}:</span><span className="font-mono">{String(v)}</span></div>
                      ))}
                    </div>
                  </div>
                )}

                <details className="text-xs">
                  <summary className="text-muted-foreground cursor-pointer hover:text-foreground">Ver JSON completo</summary>
                  <pre className="mt-2 rounded bg-muted p-3 overflow-x-auto text-[11px] whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
                    {JSON.stringify(cidViewContent.data, null, 2)}
                  </pre>
                </details>
              </div>
            )}
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
    <div className="min-h-screen bg-stone-50/80">
      <header className="border-b border-stone-200/60 bg-white/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={logoIcon} alt="DeFarm" className="h-7 w-7" />
            <span className="font-semibold text-foreground text-sm tracking-tight">DeFarm</span>
          </div>
          <div className="flex items-center gap-3">
            {!isAuthenticated ? (
              <Link to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}>
                <Button size="sm" variant="outline" className="h-8 px-3 text-xs">
                  Login na DeFarm
                </Button>
              </Link>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link to="/app">
                  <Button size="sm" variant="outline" className="h-8 px-3 text-xs">
                    Abrir app
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    localStorage.removeItem("defarm_token");
                    localStorage.removeItem("defarm_refresh_token");
                    window.location.reload();
                  }}
                  title="Sair"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">{children}</main>

      <footer className="mt-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-center gap-2">
          <img src={logoIcon} alt="" className="h-4 w-4 opacity-30" />
          <a
            href="https://defarm.net"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-stone-400 hover:text-stone-500 transition-colors"
          >
            defarm.net
          </a>
        </div>
      </footer>
    </div>
  );
}
