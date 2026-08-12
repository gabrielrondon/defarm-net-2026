import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import {
  Loader2,
  AlertTriangle,
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
  Printer,
  Share2,
} from "lucide-react";
import { SignedBadge } from "@/components/item-detail/SignedBadge";
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
  getPublicItemIdentifiers,
  getPublicItemEvents,
  getPublicItemProofs,
  resolvePublicItemByIdentifier,
  verifyPublicItem,
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
import { getPublicWorkspace } from "@/lib/api/workspaces";
import { GATEWAY_BASE } from "@/lib/api/client";
import type { PublicItemEvent, PublicLocationProjection, PublicWorkspace } from "@/lib/api/types";
import type { CheckResponse } from "@/lib/check-api/types";
import { executeCheck } from "@/lib/check-api";
import { getCarGeoJSON, getCarMetadata, type CarGeoJSON, type CarMetadata } from "@/lib/check-api/car";
import { verifyEudrPublic } from "@/lib/api/products";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getPrivateItemLocation } from "@/lib/api/join-requests";
import { getItem } from "@/lib/api/items";
import { PropertyMap } from "@/components/onboarding/PropertyMap";
import {
  Area,
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

// Trilíngue: o rótulo da cadeia acompanha o toggle PT/EN/ES da página pública.
const chainLabels3: Record<string, [string, string, string]> = {
  BEEF: ["Bovinos", "Cattle", "Bovinos"],
  DAIRY: ["Leite", "Dairy", "Lácteos"],
  PORK: ["Suínos", "Pork", "Porcinos"],
  POULTRY: ["Aves", "Poultry", "Aves"],
};
function chainLabel(locale: MetadataLocale, chain: string): string {
  const entry = chainLabels3[chain];
  if (!entry) return chain;
  return localized(locale, entry[0], entry[1], entry[2]);
}

const statusMap: Record<string, { text: [string, string, string]; className: string }> = {
  active: { text: ["Ativo", "Active", "Activo"], className: "bg-primary/10 text-primary" },
  inactive: { text: ["Inativo", "Inactive", "Inactivo"], className: "bg-muted text-muted-foreground" },
  deprecated: { text: ["Depreciado", "Deprecated", "Obsoleto"], className: "bg-destructive/10 text-destructive" },
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

type MetadataLocale = "pt-BR" | "en" | "es";

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
  if (canonicalKey.endsWith("_commitment")) return "identification";
  if (
    [
      "value_chain",
      "sisbov",
      "sisbov_commitment",
      "chip",
      "car",
      "inscricao_estadual",
      "inscricao_estadual_centro_custo",
      "animal_id",
      "partner_internal_id",
      "country",
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
  if (locale === "es") {
    if (group === "identification") return "Identificación";
    if (group === "movement") return "Movimiento";
    if (group === "weighing") return "Pesaje";
    if (group === "documents") return "Documentos";
    return "Datos adicionales";
  }
  if (group === "identification") return "Identificação";
  if (group === "movement") return "Movimentação";
  if (group === "weighing") return "Pesagem";
  if (group === "documents") return "Documentos";
  return "Dados adicionais";
}

const METADATA_FIELD_DEFINITIONS: MetadataFieldDefinition[] = [
  { canonical: "value_chain", aliases: ["value_chain", "valuechain"], label: { "pt-BR": "Cadeia de valor", en: "Value chain", es: "Cadena de valor" } },
  { canonical: "sisbov", aliases: ["sisbov"], label: { "pt-BR": "SISBOV", en: "SISBOV", es: "SISBOV" } },
  {
    canonical: "sisbov_commitment",
    aliases: ["sisbov_commitment"],
    label: { "pt-BR": "SISBOV protegido", en: "Protected SISBOV", es: "SISBOV protegido" },
  },
  { canonical: "chip", aliases: ["chip", "rfid"], label: { "pt-BR": "Chip", en: "Chip", es: "Chip" } },
  { canonical: "car", aliases: ["car"], label: { "pt-BR": "CAR", en: "CAR", es: "CAR" } },
  {
    canonical: "inscricao_estadual",
    aliases: ["inscricao_estadual", "ie", "state_registration"],
    label: { "pt-BR": "Inscrição estadual", en: "State registration", es: "Registro estatal" },
  },
  {
    canonical: "inscricao_estadual_centro_custo",
    aliases: [
      "inscricao_estadual_centro_custo",
      "inscricao_estadual_do_centro_de_custo",
      "inscricao_estadual_do_centro_custo",
      "ie_cc",
      "state_registration_cost_center",
      "inscricaeo_estadual_do_centro_de_custo",
      "inscricaeo_estadual_do_centro_custo",
    ],
    label: { "pt-BR": "Inscrição estadual (centro de custo)", en: "State registration (cost center)", es: "Registro estatal (centro de costo)" },
  },
  {
    canonical: "partner_internal_id",
    aliases: ["partner_internal_id", "partner_reference", "external_id"],
    label: { "pt-BR": "Referência do parceiro", en: "Partner reference", es: "Referencia del socio" },
  },
  {
    canonical: "animal_id",
    aliases: ["animal_id", "animalid", "id_animal", "numero_do_animal", "numero_animal"],
    label: { "pt-BR": "ID do animal", en: "Animal ID", es: "ID del animal" },
  },
  {
    canonical: "animal_code",
    aliases: ["animal_code", "codigo_animal", "codigo_do_animal"],
    label: { "pt-BR": "Código do animal", en: "Animal code", es: "Código del animal" },
  },
  { canonical: "country", aliases: ["country", "pais", "país"], label: { "pt-BR": "País", en: "Country", es: "País" } },
  { canonical: "weight_kg", aliases: ["weight_kg", "peso_kg", "weight", "peso"], label: { "pt-BR": "Peso (kg)", en: "Weight (kg)", es: "Peso (kg)" } },
  {
    canonical: "data_peso",
    aliases: ["data_peso", "weight_date", "data_pesagem", "date"],
    label: { "pt-BR": "Data da pesagem", en: "Weighing date", es: "Fecha de pesaje" },
  },
  { canonical: "document_type", aliases: ["document_type", "tipo_documento", "tipo_do_documento"], label: { "pt-BR": "Tipo de documento", en: "Document type", es: "Tipo de documento" } },
  { canonical: "document_number", aliases: ["document_number", "numero_documento", "numero_do_documento"], label: { "pt-BR": "Número do documento", en: "Document number", es: "Número de documento" } },
  { canonical: "document_date", aliases: ["document_date", "data_documento", "data_do_documento"], label: { "pt-BR": "Data do documento", en: "Document date", es: "Fecha del documento" } },
  { canonical: "movement_date", aliases: ["movement_date", "data_movimentacao", "data_da_movimentacao", "data"], label: { "pt-BR": "Data da movimentação", en: "Movement date", es: "Fecha del movimiento" } },
  { canonical: "movement_type", aliases: ["movement_type", "tipo_movimento", "tipo_da_movimentacao", "tipo_movimentacao"], label: { "pt-BR": "Tipo de movimento", en: "Movement type", es: "Tipo de movimiento" } },
  { canonical: "stock_motive", aliases: ["stock_motive", "motivo_estoque", "motivo"], label: { "pt-BR": "Motivo", en: "Motive", es: "Motivo" } },
  { canonical: "supplier", aliases: ["supplier", "fornecedor"], label: { "pt-BR": "Fornecedor", en: "Supplier", es: "Proveedor" } },
  { canonical: "description", aliases: ["description", "descricao"], label: { "pt-BR": "Descrição", en: "Description", es: "Descripción" } },
  { canonical: "stock_location", aliases: ["stock_location", "location", "fazenda", "farm", "local_de_estoque"], label: { "pt-BR": "Local do estoque", en: "Stock location", es: "Ubicación del inventario" } },
  { canonical: "cost_center_name", aliases: ["cost_center_name", "nome_centro_de_custo", "centro_de_custo"], label: { "pt-BR": "Centro de custo", en: "Cost center", es: "Centro de costo" } },
  { canonical: "mapa_code", aliases: ["mapa_code", "codigo_mapa", "codigo_mapa_estabelecimento"], label: { "pt-BR": "Código MAPA", en: "MAPA code", es: "Código MAPA" } },
  { canonical: "municipality", aliases: ["municipality", "municipio", "município"], label: { "pt-BR": "Município", en: "Municipality", es: "Municipio" } },
  { canonical: "state", aliases: ["state", "uf"], label: { "pt-BR": "UF", en: "State", es: "Estado" } },
  { canonical: "species", aliases: ["species", "especie", "espécie"], label: { "pt-BR": "Espécie", en: "Species", es: "Especie" } },
  { canonical: "sex", aliases: ["sex", "sexo"], label: { "pt-BR": "Sexo", en: "Sex", es: "Sexo" } },
  { canonical: "birth_date", aliases: ["birth_date", "data_nascimento", "data_de_nascimento"], label: { "pt-BR": "Data de nascimento", en: "Birth date", es: "Fecha de nacimiento" } },
  { canonical: "sisbov_registration_date", aliases: ["sisbov_registration_date", "data_registro_sisbov", "data_de_registro_sisbov"], label: { "pt-BR": "Registro SISBOV", en: "SISBOV registration", es: "Registro SISBOV" } },
  { canonical: "identification_date", aliases: ["identification_date", "data_identificacao", "data_de_identificacao"], label: { "pt-BR": "Data de identificação", en: "Identification date", es: "Fecha de identificación" } },
  { canonical: "batch", aliases: ["batch", "lote"], label: { "pt-BR": "Lote", en: "Batch", es: "Lote" } },
  { canonical: "category", aliases: ["category", "categoria"], label: { "pt-BR": "Categoria", en: "Category", es: "Categoría" } },
  { canonical: "breed", aliases: ["breed", "raca"], label: { "pt-BR": "Raça", en: "Breed", es: "Raza" } },
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

// Máscara pública (#44): oculta início+meio, mostra só os dígitos finais. Usada
// em identificadores sensíveis (CHIP/SISBOV) quando o visitante NÃO está logado.
const SENSITIVE_PUBLIC_IDS = new Set(["sisbov", "chip", "rfid", "brinco"]);
function maskTail(value: string, visible = 4): string {
  const v = (value ?? "").trim();
  if (v.length <= visible) return v;
  return `•••• ${v.slice(-visible)}`;
}
// Mascara um identificador sensível (CHIP/SISBOV/...) pra visitante anônimo,
// mantendo completo quando logado. Usado onde o identificador canônico é
// re-renderizado fora da seção de metadados (hero, card do QR).
function maskPublicValue(label: string, value: string, authed: boolean): string {
  if (authed) return value;
  return SENSITIVE_PUBLIC_IDS.has((label ?? "").toLowerCase()) ? maskTail(value) : value;
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

function getMetadataAliases(canonicalKey: string): string[] {
  const definition = METADATA_FIELD_DEFINITIONS.find((def) => def.canonical === canonicalKey);
  return definition ? [definition.canonical, ...definition.aliases] : [canonicalKey];
}

function normalizeMetadataLocale(language?: string): MetadataLocale {
  if (language?.startsWith("en")) return "en";
  if (language?.startsWith("es")) return "es";
  return "pt-BR";
}

function localized(locale: MetadataLocale, ptBR: string, en: string, es: string): string {
  if (locale === "en") return en;
  if (locale === "es") return es;
  return ptBR;
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

type PartnerSummaryField = {
  key: string;
  value: unknown;
};

const PARTNER_SUMMARY_KEYS = [
  "movement_type",
  "movement_date",
  "stock_motive",
  "description",
  "document_type",
  "document_number",
  "document_date",
  "stock_location",
  "cost_center_name",
  "municipality",
  "state",
  "batch",
  "category",
  "breed",
  "species",
  "sex",
  "animal_id",
  "animal_code",
  "mapa_code",
  "sisbov_registration_date",
  "identification_date",
] as const;

function formatMetadataDisplayValue(key: string, value: unknown, locale: MetadataLocale): string {
  if (value === null || value === undefined || value === "") return "-";
  if (key === "sex" && typeof value === "string") {
    const normalized = normalizeFieldKey(value);
    if (normalized === "male" || normalized === "macho") return localized(locale, "Macho", "Male", "Macho");
    if (normalized === "female" || normalized === "femea") return localized(locale, "Fêmea", "Female", "Hembra");
  }
  if (key === "weight_kg") {
    const weight = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(weight)) return `${weight.toFixed(1)} kg`;
  }
  if (typeof value === "object") return compactJson(value);
  return String(value);
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

function readCommitment(value: unknown): { alg?: string; domain?: string; version?: string; value?: string } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const commitmentValue = typeof record.value === "string" ? record.value : undefined;
  if (!commitmentValue) return null;
  return {
    alg: typeof record.alg === "string" ? record.alg : undefined,
    domain: typeof record.domain === "string" ? record.domain : undefined,
    version: typeof record.version === "string" ? record.version : undefined,
    value: commitmentValue,
  };
}

function shortCommitment(value: unknown): string {
  const text = typeof value === "string" ? value : String(value || "");
  if (text.length <= 22) return text || "-";
  return `${text.slice(0, 12)}...${text.slice(-8)}`;
}

function commitmentSubject(canonicalKey: string, domain: string | undefined, locale: MetadataLocale): string {
  const rawSubject = canonicalKey.replace(/_commitment$/, "") || (domain || "").split(".").pop() || "";
  const subject = normalizeFieldKey(rawSubject);
  if (locale === "en") {
    if (subject === "sisbov") return "SISBOV identifier";
    if (subject === "car") return "CAR property record";
    if (subject === "chip" || subject === "rfid") return "chip/RFID identifier";
    if (subject === "ear_tag" || subject === "eartag") return "ear tag identifier";
    if (subject === "cpf") return "CPF";
    if (subject === "cnpj") return "CNPJ";
    return formatFallbackMetadataLabel(subject || "identifier");
  }
  if (locale === "es") {
    if (subject === "sisbov") return "identificador SISBOV";
    if (subject === "car") return "registro CAR de la propiedad";
    if (subject === "chip" || subject === "rfid") return "identificador chip/RFID";
    if (subject === "ear_tag" || subject === "eartag") return "identificador de arete";
    if (subject === "cpf") return "CPF";
    if (subject === "cnpj") return "CNPJ";
    return formatFallbackMetadataLabel(subject || "identificador");
  }
  if (subject === "sisbov") return "Identificador SISBOV";
  if (subject === "car") return "CAR da propriedade";
  if (subject === "chip" || subject === "rfid") return "Identificador chip/RFID";
  if (subject === "ear_tag" || subject === "eartag") return "Identificador de brinco";
  if (subject === "cpf") return "CPF";
  if (subject === "cnpj") return "CNPJ";
  return formatFallbackMetadataLabel(subject || "identificador");
}

function protectedCommitmentTitle(subject: string, locale: MetadataLocale): string {
  if (locale === "en") return `Protected ${subject}`;
  if (locale === "es") return `${subject} protegido`;
  return `${subject} protegido`;
}

function protectedCommitmentDescription(subject: string, locale: MetadataLocale): string {
  if (locale === "en") {
    return `The original ${subject} value is not public. This proof lets DeFarm confirm the same record later without exposing the original value.`;
  }
  if (locale === "es") {
    return `El valor original de ${subject} no es público. Esta prueba permite que DeFarm confirme el mismo registro más adelante sin exponer el dato original.`;
  }
  return `O valor original de ${subject} não é público. Esta prova permite confirmar o mesmo registro depois sem expor o dado bruto.`;
}

function weightSourceLabel(source: WeightPoint["source"], locale: MetadataLocale): string {
  if (locale === "en") {
    if (source === "event") return "public event";
    if (source === "cid") return "versioned content";
    return "metadata";
  }
  if (locale === "es") {
    if (source === "event") return "evento público";
    if (source === "cid") return "contenido versionado";
    return "metadatos";
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
  if (event.event_type === "item_vaccinated" && typeof p.vaccine === "string") {
    return p.vaccine;
  }
  if (event.event_type === "item_treated" && typeof p.treatment === "string") {
    return p.treatment;
  }
  if (event.event_type === "item_classified" && typeof p.classification === "string") {
    return p.classification;
  }
  return null;
}

// Human label for a workspace_type (provenance display — the moat).
function workspaceTypeLabel(type?: string | null): string {
  switch ((type || "").toLowerCase()) {
    case "tracker":
      return "Certificadora SISBOV";
    case "certifier":
      return "Certificadora";
    case "processor":
      return "Frigorífico";
    case "government":
      return "Órgão sanitário";
    case "producer":
      return "Produtor";
    case "partner":
      return "Parceiro";
    default:
      return "Emissor";
  }
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

// === CAR data cache (10 min TTL, in-memory) ===
const CAR_CACHE_TTL = 10 * 60 * 1000;
const carCache = new Map<string, { data: any; ts: number }>();

async function cachedGetCarMetadata(car: string) {
  const key = `meta:${car}`;
  const cached = carCache.get(key);
  if (cached && Date.now() - cached.ts < CAR_CACHE_TTL) return cached.data;
  const data = await getCarMetadata(car, { skipAuth: true });
  carCache.set(key, { data, ts: Date.now() });
  return data;
}

async function cachedGetCarGeoJSON(car: string) {
  const key = `geo:${car}`;
  const cached = carCache.get(key);
  if (cached && Date.now() - cached.ts < CAR_CACHE_TTL) return cached.data;
  const data = await getCarGeoJSON(car, { skipAuth: true });
  carCache.set(key, { data, ts: Date.now() });
  return data;
}

const EVENT_ICON_COLORS: Record<string, string> = {
  item_born: "#10b981",
  item_weighed: "#06b6d4",
  item_vaccinated: "#22c55e",
  item_treated: "#c2410c",
  item_classified: "#f59e0b",
  item_slaughtered: "#ef4444",
  item_movement: "#6366f1",
  item_property_linked: "#3b82f6",
  item_property_unlinked: "#f43f5e",
};

function ComplianceBadge({ car }: { car: string | null }) {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!car) return;
    setLoading(true);
    cachedGetCarMetadata(car)
      .then((m) => setStatus(m.status || null))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, [car]);

  if (loading || !status) return null;

  const isActive = status === "AT" || status === "Ativo";
  const isCancelled = status === "CA" || status === "Cancelado";
  const isPending = status === "PE" || status === "Pendente";

  return (
    <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-[11px] font-medium ${
      isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50" :
      isCancelled ? "bg-stone-50 text-stone-500 border border-stone-200/50" :
      isPending ? "bg-amber-50 text-amber-700 border border-amber-200/50" :
      "bg-stone-50 text-stone-500 border border-stone-200/50"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        isActive ? "bg-emerald-500" : isCancelled ? "bg-stone-400" : isPending ? "bg-amber-500" : "bg-stone-400"
      }`} />
      {isActive ? "CAR ativo — sem restrições" :
       isCancelled ? "CAR cancelado no SICAR" :
       isPending ? "CAR com pendências" :
       `CAR: ${status}`}
    </div>
  );
}

function TourOverlay({
  step, steps, refs, locale, onNext, onPrev, onClose,
}: {
  step: number | null;
  steps: { title: string; description: string }[];
  refs: React.MutableRefObject<(HTMLElement | null)[]>;
  locale: MetadataLocale;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}) {
  const [pos, setPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    if (step === null) return;
    const update = () => {
      const el = refs.current[step];
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPos({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [step, refs]);

  if (step === null || step >= steps.length || !pos) return null;

  const pad = 8;
  const tooltipTop = pos.y + pos.h + pad + 12;
  const tooltipFlip = tooltipTop + 180 > window.innerHeight;
  const tooltipY = tooltipFlip ? Math.max(8, pos.y - 180 - 12) : tooltipTop;
  const tooltipX = Math.max(12, Math.min(pos.x, window.innerWidth - 340));

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <svg className="fixed inset-0 w-full h-full pointer-events-none" style={{ zIndex: 50 }}>
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={pos.x - pad} y={pos.y - pad}
              width={pos.w + pad * 2} height={pos.h + pad * 2}
              rx={12} fill="black"
            />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#tour-mask)" />
      </svg>
      <div
        className="fixed rounded-xl ring-2 ring-indigo-400 pointer-events-none transition-all duration-300"
        style={{ left: pos.x - pad, top: pos.y - pad, width: pos.w + pad * 2, height: pos.h + pad * 2, zIndex: 51 }}
      />
      <div
        className="fixed bg-white rounded-xl shadow-2xl border border-stone-200 p-4 max-w-xs sm:max-w-sm transition-all duration-300"
        style={{ left: tooltipX, top: tooltipY, zIndex: 52 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-2">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-indigo-500" : "bg-stone-200"}`} />
          ))}
        </div>
        <p className="text-sm font-semibold text-foreground">{steps[step].title}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{steps[step].description}</p>
        <div className="flex items-center justify-between mt-4">
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-xs text-muted-foreground hover:text-foreground">
            {localized(locale, "Fechar", "Close", "Cerrar")}
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); onPrev(); }}>
                {localized(locale, "Anterior", "Previous", "Anterior")}
              </Button>
            )}
            {step < steps.length - 1 ? (
              <Button size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); onNext(); }}>
                {localized(locale, "Próximo", "Next", "Siguiente")}
              </Button>
            ) : (
              <Button size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); onClose(); }}>
                {localized(locale, "Concluir", "Finish", "Finalizar")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PropertyMapMini({ car }: { car: string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    Promise.all([
      import("leaflet").then((m) => m.default || m),
      import("leaflet/dist/leaflet.css"),
      cachedGetCarGeoJSON(car),
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

function readPublicLocation(metadata: Record<string, unknown>): PublicLocationProjection | null {
  const raw = metadata.public_location;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.label !== "string" || typeof obj.level !== "string") return null;
  const centerRaw = obj.approximate_center;
  const center =
    centerRaw && typeof centerRaw === "object" && !Array.isArray(centerRaw)
      ? (centerRaw as Record<string, unknown>)
      : null;
  const lat = typeof center?.lat === "number" ? center.lat : null;
  const lon = typeof center?.lon === "number" ? center.lon : null;
  return {
    level: obj.level,
    label: obj.label,
    country: typeof obj.country === "string" ? obj.country : "BR",
    uf: typeof obj.uf === "string" ? obj.uf : null,
    municipio: typeof obj.municipio === "string" ? obj.municipio : null,
    precision: typeof obj.precision === "string" ? obj.precision : "approximate",
    source: typeof obj.source === "string" ? obj.source : "public_projection",
    map_available: obj.map_available === true,
    public_policy:
      typeof obj.public_policy === "string"
        ? obj.public_policy
        : "no_raw_coordinates_no_property_polygon",
    approximate_center:
      lat !== null && lon !== null
        ? {
            lat,
            lon,
          }
        : null,
    approximate_radius_km:
      typeof obj.approximate_radius_km === "number" ? obj.approximate_radius_km : null,
  };
}

function PublicLocationMap({ location }: { location: PublicLocationProjection }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const center = location.approximate_center;

  useEffect(() => {
    if (!mapRef.current || !center) return;
    let cancelled = false;

    Promise.all([
      import("leaflet").then((m) => m.default || m),
      import("leaflet/dist/leaflet.css"),
    ]).then(([L_]) => {
      if (cancelled || !mapRef.current) return;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }

      const radiusMeters = Math.max(25, location.approximate_radius_km || 75) * 1000;
      const map = L_.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
      });
      L_.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 12,
      }).addTo(map);
      const circle = L_.circle([center.lat, center.lon], {
        radius: radiusMeters,
        color: "#059669",
        weight: 2,
        fillColor: "#10b981",
        fillOpacity: 0.18,
      }).addTo(map);
      map.fitBounds(circle.getBounds(), { padding: [12, 12] });
      mapInstance.current = map;
    }).catch(() => {});

    return () => {
      cancelled = true;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [center, location.approximate_radius_km]);

  if (!center) return null;
  return (
    <div className="relative h-40 w-full overflow-hidden rounded-lg border border-emerald-200/60 bg-[linear-gradient(135deg,#ecfdf5_0%,#f8fafc_55%,#d1fae5_100%)]">
      <div ref={mapRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-28 w-28 rounded-full border-2 border-emerald-500/60 bg-emerald-400/20 shadow-[0_0_0_26px_rgba(16,185,129,0.08)]" />
      </div>
      <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-white/85 px-2 py-1 text-[11px] font-medium text-emerald-800 shadow-sm">
        {location.approximate_radius_km
          ? `raio aprox. ${Math.round(location.approximate_radius_km)} km`
          : "zona aproximada"}
      </div>
    </div>
  );
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

function JourneyMapInline({ points, locale }: { points: JourneyPointDef[]; locale: MetadataLocale }) {
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
        cachedGetCarGeoJSON(car)
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
    <div className="space-y-3 min-w-0">
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
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm" /> {localized(locale, "Propriedade", "Property", "Propiedad")}</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-500 border border-white shadow-sm" /> {localized(locale, "Pesagem", "Weighing", "Pesaje")}</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 border border-white shadow-sm" /> {localized(locale, "Vacinação", "Vaccination", "Vacunación")}</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-teal-500 border border-white shadow-sm" /> {localized(locale, "Tratamento", "Treatment", "Tratamiento")}</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 border border-white shadow-sm" /> {localized(locale, "Classificação", "Classification", "Clasificación")}</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500 border border-white shadow-sm" /> {localized(locale, "Movimentação", "Movement", "Movimiento")}</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-6 h-3 rounded border border-green-500/40" style={{ background: "rgba(34,197,94,0.15)" }} /> {localized(locale, "Polígono CAR", "CAR polygon", "Polígono CAR")}</span>
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
  const { i18n } = useTranslation();
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
  const [carMetaError, setCarMetaError] = useState<string | null>(null);
  const [carDialogValue, setCarDialogValue] = useState<string | null>(null);

  const [showWeightDialog, setShowWeightDialog] = useState(false);
  const [showIdentityDialog, setShowIdentityDialog] = useState(false);
  const [showCidDialog, setShowCidDialog] = useState(false);
  const [cidViewContent, setCidViewContent] = useState<{ cid: string; data: Record<string, unknown> } | null>(null);
  const [cidViewLoading, setCidViewLoading] = useState(false);
  const [showCircuitsDialog, setShowCircuitsDialog] = useState(false);
  const [showProofOfLifeDialog, setShowProofOfLifeDialog] = useState(false);
  const [showJourneyDialog, setShowJourneyDialog] = useState(false);
  const [showEmbedPreview, setShowEmbedPreview] = useState(false);
  const metadataLocale = normalizeMetadataLocale(i18n.language);
  const setMetadataLocale = (next: MetadataLocale) => {
    void i18n.changeLanguage(next);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const legacy = window.localStorage.getItem("public_item_locale");
    const alreadyChosen = window.localStorage.getItem("i18nextLng");
    if (!alreadyChosen && (legacy === "en" || legacy === "pt-BR" || legacy === "es")) {
      void i18n.changeLanguage(legacy);
    }
    if (legacy) window.localStorage.removeItem("public_item_locale");
  }, [i18n]);

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

      // LGPD: as chaves pseudonimizadas (SISBOV, e a identidade ISO do animal: chip/RFID/
      // brinco/ear_tag) NÃO são resolvíveis publicamente — o backend responde 404 de propósito
      // (um resolve anônimo por elas seria um oráculo de confirmação sobre a identidade do
      // animal). Não dá pra redirecionar pro DFID sem reabrir esse oráculo. Mostra uma mensagem
      // clara em vez de tentar resolver: o caminho é o QR/link direto /i/{dfid}.
      if (SENSITIVE_PUBLIC_IDS.has(identifierType.toLowerCase())) {
        setResolveError(
          "Por privacidade (LGPD), o SISBOV/brinco/chip não resolve a página pública de forma anônima. " +
            "Use o QR do animal ou o link direto /i/{DFID}. O número completo fica visível só para membros autorizados do circuito.",
        );
        return;
      }

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

  // G3 (Gerbov): localização PRECISA pra quem tem ACESSO. O backend gateia por visibility.can_read()
  // (ItemVisibilityPolicy — acesso ao item via circuito/role, NÃO só estar logado); devolve 403 sem
  // acesso. Só busca se autenticado; falha silenciosa (retry:false) → cai no coarse público. O
  // polígono preciso e a coordenada NUNCA vão pro certificado público — só aqui, pra quem pode ver.
  const { data: privateLoc } = useQuery({
    queryKey: ["private-item-location", resolvedDfid],
    queryFn: () => getPrivateItemLocation(resolvedDfid!),
    enabled: isAuthenticated && !!resolvedDfid,
    retry: false,
  });
  const privatePolygon = privateLoc?.property_polygon?.geojson ?? null;

  const { data: events = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ["public-item-events", resolvedDfid],
    queryFn: () => getPublicItemEvents(resolvedDfid!, { limit: 50 }),
    enabled: !!resolvedDfid,
    retry: 1,
  });

  const { data: verifyResponse } = useQuery({
    queryKey: ["public-item-verify", resolvedDfid],
    queryFn: () => verifyPublicItem(resolvedDfid!),
    enabled: !!resolvedDfid,
    retry: 1,
  });

  const sanitaryAttestation =
    verifyResponse?.sanitary_attestation?.signature_verified === true
      ? verifyResponse.sanitary_attestation
      : null;

  // Provenance (the moat): resolve each public event's issuer workspace to a
  // name/type, so the timeline shows WHO issued it, not just a trust score.
  const issuerIds = useMemo(
    () =>
      Array.from(
        new Set(
          events
            .map((e) => e.event_owner_workspace_id)
            .filter((id): id is string => !!id)
        )
      ),
    [events]
  );

  const { data: issuerMap = {} } = useQuery({
    queryKey: ["public-event-issuers", issuerIds],
    enabled: issuerIds.length > 0,
    staleTime: 300_000,
    queryFn: async () => {
      const entries = await Promise.all(
        issuerIds.map(async (id) => [id, await getPublicWorkspace(id)] as const)
      );
      const map: Record<string, PublicWorkspace> = {};
      for (const [id, ws] of entries) {
        if (ws) map[id] = ws;
      }
      return map;
    },
  });

  const { data: sanitaryIssuer } = useQuery({
    queryKey: ["public-sanitary-issuer", sanitaryAttestation?.issuer_workspace_id],
    enabled: !!sanitaryAttestation?.issuer_workspace_id,
    staleTime: 300_000,
    queryFn: () => getPublicWorkspace(sanitaryAttestation!.issuer_workspace_id),
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

  // Todos os identificadores públicos (não-PII): SISBOV, RFID/chip, CAR… multi-canônico.
  const { data: publicIdentifiers } = useQuery({
    queryKey: ["public-item-identifiers", resolvedDfid],
    queryFn: () => getPublicItemIdentifiers(resolvedDfid!),
    enabled: !!resolvedDfid,
    retry: 1,
  });

  // G3.2 (Gerbov): quando logado, o get_item autenticado devolve os identificadores
  // CRUS pro workspace contribuinte (SISBOV etc.) — mascarados pros demais tenants (o
  // backend decide via mask_sensitive_identifier). O endpoint público barra o SISBOV
  // por inteiro, então essa é a única fonte do valor cru pro dono / quem tem acesso.
  const { data: privateItemDetail } = useQuery({
    queryKey: ["private-item-detail", resolvedDfid],
    queryFn: () => getItem(resolvedDfid!),
    enabled: isAuthenticated && !!resolvedDfid,
    retry: false,
  });
  const privateIdentifiers = privateItemDetail?.identifiers ?? [];

  const identifierBadges = useMemo(() => {
    const labels: Record<string, string> = { sisbov: "SISBOV", chip: "RFID", rfid: "RFID", car: "CAR" };
    // Preferir os identificadores autenticados (crus pro contribuinte) quando logado;
    // cair pro público (barra SISBOV) quando deslogado ou sem acesso.
    const source = privateIdentifiers.length > 0 ? privateIdentifiers : (publicIdentifiers?.identifiers ?? []);
    return source.map((i) => ({
      key: `${i.identifier_type}:${i.value}`,
      label: labels[i.identifier_type.toLowerCase()] ?? i.identifier_type.toUpperCase(),
      value: i.value,
      canonical: i.is_canonical,
    }));
  }, [publicIdentifiers, privateIdentifiers]);

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
  const publicLocation = useMemo(() => readPublicLocation(metadata), [metadata]);

  // #16: cross-link da Declaração EUDR — se o DFID tem DDS emitida, mostra um
  // card pra /eudr/v/:dfid (verificação pública). Sem auth (endpoint público).
  const [eudrDds, setEudrDds] = useState<{ ready: boolean } | null>(null);
  useEffect(() => {
    setEudrDds(null);
    if (!resolvedDfid) return;
    let cancelled = false;
    verifyEudrPublic(resolvedDfid)
      .then((r) => { if (!cancelled && r.found) setEudrDds({ ready: r.eudr_ready }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [resolvedDfid]);
  const sanitaryVerifyUrl = useMemo(() => {
    const raw = sanitaryAttestation?.verify_url;
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    return `${GATEWAY_BASE}${raw.startsWith("/") ? raw : `/${raw}`}`;
  }, [sanitaryAttestation?.verify_url]);
  const sanitaryAnimalStatus = toTitle(sanitaryAttestation?.animal_status || "");
  const sanitaryStatus = toTitle(sanitaryAttestation?.sanitary_status || "");

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
      "public_location",
      "public_map_available",
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

  const partnerSummaryFields = useMemo<PartnerSummaryField[]>(() => {
    return PARTNER_SUMMARY_KEYS.map((key) => ({
      key,
      value: readAliasValue(metadata, getMetadataAliases(key)),
    })).filter(({ value }) => value !== undefined && value !== null && value !== "");
  }, [metadata]);

  const fallbackCanonicalIdentifier = useMemo(() => detectCanonicalIdentifier(metadata), [metadata]);

  // G3.2: pro contribuinte logado, o canônico autenticado (cru) tem prioridade — o
  // público barra o SISBOV, então sem isto o QR do dono cairia no fallback do metadata.
  const authedCanonical = privateItemDetail?.canonical_identifier;
  const canonicalIdentifier = authedCanonical
    ? { label: authedCanonical.identifier_type.toUpperCase(), value: authedCanonical.value }
    : canonicalFromDb
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

  const visibleEvents = isAuthenticated && showOperational ? events : realEvents;

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

  // Copy the link to the clipboard AND open the native share sheet (WhatsApp,
  // e-mail, etc.) where available. Copy is fired before share() so we don't
  // consume the user activation share() requires; this guarantees a copy on
  // every device (incl. desktop browsers whose share sheet lacks "copy link").
  const shareOrCopyLink = async (url: string, title: string) => {
    const copyPromise = navigator.clipboard
      ? navigator.clipboard.writeText(url).then(() => true, () => false)
      : Promise.resolve(false);
    let shared = false;
    if (navigator.share) {
      try {
        await navigator.share({ title, text: title, url });
        shared = true;
      } catch (err) {
        // User cancelled the native sheet — the link is still copied below.
        if (!(err instanceof Error && err.name === "AbortError")) {
          // other share failures fall through to the copy feedback
        }
      }
    }
    const copied = await copyPromise;
    if (copied) {
      toast({ title: shared ? "Compartilhado · link copiado" : "Link copiado" });
    } else if (!shared) {
      toast({ title: "Falha ao compartilhar", variant: "destructive" });
    }
  };

  // Public CAR lookup (map polygon + metadata). Centralizes loading/error state
  // so the dialog never gets stuck on a spinner with errors silently swallowed.
  const runPublicCarLookup = (car: string) => {
    setCarGeojson(null);
    setCarMetadata(null);
    setCarGeoError(null);
    setCarMetaError(null);
    setCarGeoLoading(true);
    setCarMetaLoading(true);
    cachedGetCarGeoJSON(car)
      .then((g) => setCarGeojson(g))
      .catch((err) => {
        console.warn("[CAR GeoJSON] Failed to fetch:", err);
        setCarGeoError("Não foi possível carregar o mapa do CAR. O serviço pode estar temporariamente indisponível.");
      })
      .finally(() => setCarGeoLoading(false));
    cachedGetCarMetadata(car)
      .then((m) => setCarMetadata(m))
      .catch((err) => {
        console.warn("[CAR Metadata] Failed to fetch:", err);
        setCarMetaError("Não foi possível carregar os dados do CAR. O serviço pode estar temporariamente indisponível.");
      })
      .finally(() => setCarMetaLoading(false));
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

    // Fetch GeoJSON + metadata (public, no auth needed)
    runPublicCarLookup(carValue);

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
  const isEmbed = window.location.pathname.startsWith("/embed/");
  const isSelo = new URLSearchParams(window.location.search).get("selo") === "1";

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

  const hasHealthData = !!sanitySummary && (
    sanitySummary.vaccines.length > 0 ||
    sanitySummary.treatments.length > 0
  );
  const hasWeightData = weightHistory.length > 0;
  const latestWeightPoint = hasWeightData ? weightHistory[weightHistory.length - 1] : null;

  // Upcoming expected events based on age + history
  const upcomingEvents = useMemo(() => {
    if (!sanitySummary || !animalAge) return [];
    const upcoming: { label: string; reason: string; urgency: "normal" | "soon" | "overdue" }[] = [];
    const m = ((item?.metadata || {}) as Record<string, unknown>);
    const birthStr = typeof m.birth_date === "string" ? m.birth_date : null;
    if (!birthStr) return [];
    const birth = new Date(birthStr);
    const now = new Date();
    const ageMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());

    // Clostridiose reforço anual — check if last one was > 10 months ago
    const lastClostri = sanitySummary.vaccines.filter((v) => v.name.toLowerCase().includes("clostridi")).sort((a, b) => b.date.localeCompare(a.date))[0];
    if (lastClostri) {
      const monthsSince = (now.getTime() - new Date(lastClostri.date).getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsSince > 12) upcoming.push({ label: "Reforço Clostridiose", reason: `Última dose há ${Math.floor(monthsSince)} meses`, urgency: "overdue" });
      else if (monthsSince > 10) upcoming.push({ label: "Reforço Clostridiose", reason: `Previsto nos próximos ${Math.ceil(12 - monthsSince)} meses`, urgency: "soon" });
    }

    // Vermifugação — check last treatment with Ivermectina
    const lastVerm = sanitySummary.treatments.filter((t) => t.name.toLowerCase().includes("ivermect")).sort((a, b) => b.date.localeCompare(a.date))[0];
    if (lastVerm) {
      const monthsSince = (now.getTime() - new Date(lastVerm.date).getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsSince > 6) upcoming.push({ label: "Vermifugação", reason: `Última há ${Math.floor(monthsSince)} meses`, urgency: monthsSince > 8 ? "overdue" : "soon" });
    }

    // Pesagem — if last > 3 months
    if (sanitySummary.lastWeightDate) {
      const monthsSince = (now.getTime() - new Date(sanitySummary.lastWeightDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsSince > 4) upcoming.push({ label: "Pesagem", reason: `Última há ${Math.floor(monthsSince)} meses`, urgency: monthsSince > 6 ? "overdue" : "soon" });
    }

    // Brucelose — females 3-8 months, dose única
    if (typeof m.sex === "string" && m.sex === "female" && ageMonths >= 3 && ageMonths <= 8) {
      const hasBruce = sanitySummary.vaccines.some((v) => v.name.toLowerCase().includes("brucel"));
      if (!hasBruce) upcoming.push({ label: "Brucelose (B19)", reason: "Fêmea em idade de vacinação (3-8 meses)", urgency: "soon" });
    }

    return upcoming;
  }, [sanitySummary, animalAge, item?.metadata]);

  // === BETA TOUR ===
  const [tourStep, setTourStep] = useState<number | null>(null);
  const tourRefs = useRef<(HTMLElement | null)[]>([]);
  const setTourRef = (idx: number) => (el: HTMLElement | null) => { tourRefs.current[idx] = el; };

  const tourSteps = useMemo(() => {
    const steps: { title: string; description: string }[] = [];
    if (currentProperty?.car) steps.push({
      title: localized(metadataLocale, "Propriedade atual", "Current property", "Propiedad actual"),
      description: localized(metadataLocale, "Visualize a fazenda onde o animal se encontra, com mapa satélite e polígono do CAR extraído do SICAR.", "View the farm where the animal is located, with satellite map and CAR polygon from SICAR.", "Visualiza la finca donde está el animal, con mapa satelital y polígono CAR extraído de SICAR."),
    });
    if (hasHealthData) steps.push({
      title: localized(metadataLocale, "Resumo sanitário", "Health summary", "Resumen sanitario"),
      description: localized(metadataLocale, "Panorama de vacinações e tratamentos registrados para o animal.", "Overview of vaccinations and treatments recorded for the animal.", "Panorama de vacunaciones y tratamientos registrados para el animal."),
    });
    if (hasWeightData) steps.push({
      title: localized(metadataLocale, "Evolução de peso", "Weight progression", "Evolución de peso"),
      description: localized(metadataLocale, "Peso atual, quantidade de pesagens e curva de crescimento quando há histórico suficiente.", "Current weight, number of weighings and growth curve when enough history exists.", "Peso actual, cantidad de pesajes y curva de crecimiento cuando hay historial suficiente."),
    });
    if (upcomingEvents.length > 0) steps.push({
      title: localized(metadataLocale, "Previsões", "Upcoming", "Próximos"),
      description: localized(metadataLocale, "O sistema analisa o histórico e infere quais procedimentos estão próximos do vencimento ou atrasados: reforço vacinal, vermifugação, pesagem periódica.", "The system analyzes history and infers which procedures are due soon or overdue: boosters, deworming, periodic weighing.", "El sistema analiza el historial e infiere qué procedimientos están próximos o atrasados: refuerzo vacunal, desparasitación, pesaje periódico."),
    });
    steps.push({ title: localized(metadataLocale, "Jornada do Animal", "Animal Journey", "Recorrido del animal"), description: localized(metadataLocale, "Mapa interativo com todas as propriedades por onde o animal passou, rotas de transporte e eventos geolocalizados com timeline sincronizada.", "Interactive map with all properties the animal passed through, transport routes and geolocated events with a synchronized timeline.", "Mapa interactivo con todas las propiedades por donde pasó el animal, rutas de transporte y eventos geolocalizados con línea de tiempo sincronizada.") });
    steps.push({ title: "Timeline", description: localized(metadataLocale, "Histórico completo agrupado por ano. Cada evento tem ícone, tipo, data e resumo: pesagens, vacinas, movimentações, tudo em ordem cronológica.", "Complete history grouped by year. Each event has icon, type, date and summary: weighings, vaccines, movements, all in chronological order.", "Historial completo agrupado por año. Cada evento tiene icono, tipo, fecha y resumen: pesajes, vacunas, movimientos, todo en orden cronológico.") });
    steps.push({ title: localized(metadataLocale, "Certificado QR", "QR certificate", "Certificado QR"), description: localized(metadataLocale, "QR code escaneável com hash blockchain e CID do IPFS. Pode ser baixado como PDF ou PNG.", "Scannable QR code with blockchain hash and IPFS CID. It can be downloaded as PDF or PNG.", "Código QR escaneable con hash blockchain y CID de IPFS. Puede descargarse como PDF o PNG.") });
    steps.push({ title: localized(metadataLocale, "Registro verificável", "Verifiable record", "Registro verificable"), description: localized(metadataLocale, "Identidade ancorada na blockchain Stellar e conteúdo versionado no IPFS (Pinata). Cada versão tem um CID único e imutável.", "Identity anchored on Stellar blockchain and versioned content on IPFS (Pinata). Each version has a unique, immutable CID.", "Identidad anclada en la blockchain Stellar y contenido versionado en IPFS (Pinata). Cada versión tiene un CID único e inmutable.") });
    return steps;
  }, [currentProperty, hasHealthData, hasWeightData, metadataLocale, upcomingEvents]);

  useEffect(() => {
    if (tourStep === null) return;
    const el = tourRefs.current[tourStep];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [tourStep]);

  if (isResolvingRef || isLoading) {
    return (
      <Shell isAuthenticated={isAuthenticated} locale={metadataLocale}>
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
      <Shell isAuthenticated={isAuthenticated} locale={metadataLocale}>
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
      <Shell isAuthenticated={isAuthenticated} locale={metadataLocale}>
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

  if (isSelo) {
    const breed = metadata.breed ? String(metadata.breed) : "";
    const sex = String(metadata.sex || "") === "male"
      ? localized(metadataLocale, "Macho", "Male", "Macho")
      : String(metadata.sex || "") === "female"
        ? localized(metadataLocale, "Fêmea", "Female", "Hembra")
        : "";
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-xs w-full text-center">
          <img src={logoIcon} alt="DeFarm" className="h-8 w-8 mx-auto mb-4 opacity-60" />
          <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium">{localized(metadataLocale, "Origem rastreada", "Traced origin", "Origen rastreado")}</p>
          <p className="text-lg font-bold text-stone-800 mt-2">{breed}{sex ? ` · ${sex}` : ""}</p>
          {animalAge && <p className="text-xs text-stone-400 mt-1">{animalAge}</p>}
          {currentProperty?.name && (
            <p className="text-sm text-stone-600 mt-3">{currentProperty.name}</p>
          )}
          {currentProperty?.municipality && currentProperty?.state && (
            <p className="text-xs text-stone-400">{currentProperty.municipality} / {currentProperty.state}</p>
          )}
          <div className="mt-5 flex justify-center">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&color=22c55e&data=${encodeURIComponent(`https://defarm.net/i/${item.dfid}`)}`}
              alt="QR" className="w-24 h-24 rounded-lg"
            />
          </div>
          <p className="text-[9px] font-mono text-stone-300 mt-3 break-all">{item.dfid}</p>
          {sanitySummary && (
            <div className="flex justify-center gap-3 mt-4 text-[10px] text-stone-400">
              {sanitySummary.lastWeight && <span>{sanitySummary.lastWeight} kg</span>}
              <span>{sanitySummary.vaccines.length} {localized(metadataLocale, "vacinas", "vaccines", "vacunas")}</span>
              <span>{weightHistory.length} {localized(metadataLocale, "pesagens", "weighings", "pesajes")}</span>
            </div>
          )}
          <p className="text-[9px] text-stone-300 mt-4">defarm.net</p>
        </div>
      </div>
    );
  }

  if (isEmbed) {
    return (
      <div className="p-4 font-sans text-sm" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-stone-400 font-medium">
              {metadata.breed ? String(metadata.breed) : item.value_chain}
              {metadata.sex && ` · ${String(metadata.sex) === "male" ? "Macho" : "Fêmea"}`}
              {animalAge && ` · ${animalAge}`}
            </p>
            <p className="text-xs font-bold text-stone-800 font-mono mt-1 break-all">{item.dfid}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${st.className}`}>{localized(metadataLocale, st.text[0], st.text[1], st.text[2])}</span>
              {sanitySummary?.lastWeight && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700">{sanitySummary.lastWeight} kg</span>
              )}
              {sanitySummary && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">{sanitySummary.vaccines.length} vacinas</span>
              )}
            </div>
          </div>
          <a
            href={`https://defarm.net/i/${item.dfid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-[10px] text-stone-400 hover:text-stone-600 border border-stone-200 rounded-lg px-2 py-1"
          >
            Ver completo
          </a>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&color=22c55e&data=${encodeURIComponent("https://defarm.net/i/" + item.dfid)}`} alt="QR" className="w-14 h-14 rounded" />
          <div className="text-[10px] text-stone-400">
            <p>Escaneie para rastreabilidade completa</p>
            <p className="font-mono mt-0.5">{item.dfid}</p>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-stone-100 flex items-center gap-1.5">
          <img src={logoIcon} alt="" className="h-3 w-3 opacity-40" />
          <span className="text-[9px] text-stone-300">defarm.net</span>
        </div>
      </div>
    );
  }

  return (
    <Shell isAuthenticated={isAuthenticated} locale={metadataLocale}>
      <div className="space-y-5">
        {/* === HERO HEADER === */}
        <div className="rounded-2xl bg-gradient-to-b from-emerald-50/60 via-white to-white border border-emerald-100/50 shadow-sm overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500" />
          <div className="p-5 sm:p-7">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-2 mb-5 no-print">
              <div className="flex items-center gap-1 rounded-lg border border-stone-200/60 bg-white/80 p-0.5">
                <button
                  onClick={() => setMetadataLocale("pt-BR")}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${metadataLocale === "pt-BR" ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-foreground"}`}
                >PT</button>
                <button
                  onClick={() => setMetadataLocale("en")}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${metadataLocale === "en" ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-foreground"}`}
                >EN</button>
                <button
                  onClick={() => setMetadataLocale("es")}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${metadataLocale === "es" ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-foreground"}`}
                >ES</button>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => void shareOrCopyLink(`https://defarm.net/i/${item.dfid}`, `DeFarm: ${item.dfid}`)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
                  title={localized(metadataLocale, "Compartilhar", "Share", "Compartir")}
                >
                  <Share2 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => window.print()} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors" title={localized(metadataLocale, "Imprimir", "Print", "Imprimir")}>
                  <Printer className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setShowEmbedPreview(true)} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors" title="Embed">
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
                <a href={`/i/${item.dfid}?selo=1`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors" title={localized(metadataLocale, "Selo de origem", "Origin seal", "Sello de origen")}>
                  <Tag className="h-3.5 w-3.5" />
                </a>
                <a href={`/compare?ids=${item.dfid}`} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors" title={localized(metadataLocale, "Comparar", "Compare", "Comparar")}>
                  <Scale className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            {/* Animal identity */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-widest text-emerald-700/60 font-medium">
              <span>{metadata.breed ? String(metadata.breed) : chainLabel(metadataLocale, item.value_chain)}</span>
              {metadata.sex && <><span className="text-emerald-300">·</span><span>{String(metadata.sex) === "male" ? "Macho" : String(metadata.sex) === "female" ? "Fêmea" : String(metadata.sex)}</span></>}
              {metadata.birth_date && <><span className="text-emerald-300">·</span><span>Nasc. {String(metadata.birth_date)}{animalAge ? ` (${animalAge})` : ""}</span></>}
              <span className="text-emerald-300">·</span><span>{item.country}</span>
            </div>

            <h1 className="text-base sm:text-lg md:text-2xl font-bold text-stone-900 font-mono tracking-tight break-all mt-3 leading-snug">
              {item.dfid}
            </h1>

            <div className="flex flex-wrap items-center gap-3 mt-4">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${st.className}`}>{localized(metadataLocale, st.text[0], st.text[1], st.text[2])}</span>
              {sanitySummary?.lastWeight && (
                <span className="text-lg font-bold text-stone-800">{sanitySummary.lastWeight} <span className="text-sm font-normal text-stone-400">kg</span></span>
              )}
              {identifierBadges.length > 0 ? (
                identifierBadges.map((b) => (
                  <span
                    key={b.key}
                    className={`text-xs font-mono px-2 py-0.5 rounded-full border ${
                      b.canonical
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-stone-100 text-stone-600 border-stone-200"
                    }`}
                    title={b.canonical ? "Identificador canônico" : "Identificador"}
                  >
                    {b.label}: {b.value}
                  </span>
                ))
              ) : (
                canonicalIdentifier && (
                  <span className="text-xs text-stone-400 font-mono">
                    {canonicalIdentifier.label}: {maskPublicValue(canonicalIdentifier.label, canonicalIdentifier.value, isAuthenticated)}
                  </span>
                )
              )}
            </div>

            <div className="flex items-center gap-3 mt-3 text-xs text-stone-400">
              <span>{new Date(item.updated_at || item.created_at).toLocaleDateString(metadataLocale, { day: "2-digit", month: "short", year: "numeric" })}</span>
              <span>·</span>
              <span>{chainLabel(metadataLocale, item.value_chain)}</span>
              {associatedCircuitIds.length > 0 && (
                <>
                  <span>·</span>
                  <button onClick={() => setShowCircuitsDialog(true)} className="hover:text-emerald-600 inline-flex items-center gap-1 transition-colors">
                    <Network className="h-3 w-3" />
                    {associatedCircuitIds.length} {localized(metadataLocale, "rede", "network", "red")}{associatedCircuitIds.length !== 1 ? (metadataLocale === "en" ? "s" : "s") : ""}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {item.dfid && (
          <div ref={setTourRef(6)} className="relative z-0">
            <AssetQRCode
              dfid={item.dfid}
              locale={metadataLocale}
              valueChain={item.value_chain}
              statusLabel={localized(metadataLocale, st.text[0], st.text[1], st.text[2])}
              verificationState={
                proofs?.identity_anchor?.status === "confirmed"
                  ? "confirmed"
                  : proofs?.identity_anchor
                    ? "pending"
                    : "unknown"
              }
              canonicalIdLabel={canonicalIdentifier?.label}
              canonicalIdValue={canonicalIdentifier ? maskPublicValue(canonicalIdentifier.label, canonicalIdentifier.value, isAuthenticated) : undefined}
              identityHash={proofs?.identity_anchor?.transaction_hash || undefined}
              latestCid={latestContentVersion?.cid || undefined}
            />
          </div>
        )}

        {privatePolygon ? (
          /* G3 (Gerbov): PRECISO pra quem tem ACESSO — inline, substitui o coarse. Marcado como
             visualização privada; a coordenada/polígono exato NÃO vão pro certificado público. */
          <section className="rounded-xl bg-white border border-emerald-200/60 shadow p-4 sm:p-5 overflow-hidden relative z-0 isolate">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1 h-4 rounded-full bg-emerald-400" />
                  <p className="text-xs uppercase tracking-wide text-stone-500 font-semibold">
                    {localized(metadataLocale, "Localização", "Location", "Ubicación")}
                  </p>
                </div>
                <p className="text-[11px] text-emerald-700/80 mb-2">
                  {localized(
                    metadataLocale,
                    "Visualização privada. Não aparece no certificado público.",
                    "Private view. Not shown on the public certificate.",
                    "Vista privada. No aparece en el certificado público.",
                  )}
                </p>
                {privateLoc?.private_location?.municipio || privateLoc?.private_location?.uf ? (
                  <p className="text-sm font-semibold text-foreground">
                    {[privateLoc?.private_location?.municipio, privateLoc?.private_location?.uf].filter(Boolean).join(" / ")}
                  </p>
                ) : null}
                {privateLoc?.private_location?.car ? (
                  <p className="text-xs text-muted-foreground mt-1 font-mono">CAR: {privateLoc.private_location.car}</p>
                ) : null}
              </div>
              <MapPinned className="h-5 w-5 text-emerald-600 shrink-0" />
            </div>
            <div className="mt-4">
              <PropertyMap geojson={privatePolygon as unknown as CarGeoJSON} className="h-64 w-full" />
            </div>
          </section>
        ) : publicLocation ? (
          <section className="rounded-xl bg-white border border-stone-200/70 shadow p-4 sm:p-5 overflow-hidden relative z-0 isolate">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full bg-emerald-400" />
                  <p className="text-xs uppercase tracking-wide text-stone-500 font-semibold">
                    {localized(metadataLocale, "Localização aproximada", "Approximate location", "Ubicación aproximada")}
                  </p>
                </div>
                <p className="text-sm font-semibold text-foreground">{publicLocation.label}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {localized(
                    metadataLocale,
                    "Mapa público em baixa precisão. Coordenadas brutas e polígono da propriedade ficam restritos a acessos autorizados.",
                    "Low-precision public map. Raw coordinates and the property polygon are restricted to authorized access.",
                    "Mapa público de baja precisión. Las coordenadas crudas y el polígono de la propiedad quedan restringidos a accesos autorizados.",
                  )}
                </p>
              </div>
              <MapPinned className="h-5 w-5 text-emerald-600 shrink-0" />
            </div>
            {publicLocation.approximate_center ? (
              <div className="mt-4">
                <PublicLocationMap location={publicLocation} />
              </div>
            ) : null}
          </section>
        ) : null}

        {/* === BETA: Propriedade atual + Sanidade + Peso inline === */}
        {currentProperty?.car && (
          <section ref={setTourRef(0)} className="rounded-xl bg-white border border-stone-200/70 shadow p-4 sm:p-5 overflow-hidden relative z-0 isolate min-h-[120px]">
            {/* Map watermark background */}
            {currentProperty.car && (
              <div className="absolute inset-0 opacity-[0.12] pointer-events-none" style={{ minHeight: "120px" }}>
                <PropertyMapMini car={currentProperty.car} />
              </div>
            )}
            <div className="relative z-[1]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 rounded-full bg-emerald-400" />
                <p className="text-xs uppercase tracking-wide text-stone-500 font-semibold">{localized(metadataLocale, "Propriedade atual", "Current property", "Propiedad actual")}</p>
              </div>
              <p className="text-sm font-semibold text-foreground">{currentProperty.name || "—"}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {[currentProperty.municipality, currentProperty.state].filter(Boolean).join(" / ")}
              </p>
              {/* Compliance badge from CAR metadata (fetched inline) */}
              <ComplianceBadge car={currentProperty.car} />
              <button
                onClick={() => {
                  if (currentProperty.car && isOfficialCarFormat(currentProperty.car)) {
                    setCarDialogValue(currentProperty.car);
                    setCarResult(null); setCarError(null);
                    setShowCarDialog(true);
                    runPublicCarLookup(currentProperty.car);
                  }
                }}
                className="text-xs text-primary hover:underline mt-1 font-mono"
              >
                {currentProperty.car}
              </button>
            </div>
          </section>
        )}

        {hasJourneyData && (
          <section
            ref={setTourRef(4)}
            className="rounded-2xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50/50 via-white to-white shadow-sm p-5 sm:p-6 cursor-pointer group"
            onClick={() => setShowJourneyDialog(true)}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/15 transition-colors">
                <MapPinned className="h-7 w-7 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-stone-900">{localized(metadataLocale, "Jornada do Animal", "Animal Journey", "Recorrido del animal")}</h2>
                <p className="text-sm text-stone-500 mt-1">
                  {(() => { const u = new Set(journeyPoints.map((p) => `${p.lat.toFixed(2)},${p.lon.toFixed(2)}`)); return u.size; })()} {localized(metadataLocale, "propriedades", "properties", "propiedades")} · {journeyPoints.length} {localized(metadataLocale, "eventos geolocalizados", "geolocated events", "eventos geolocalizados")} · {localized(metadataLocale, "mapa interativo com timeline", "interactive map with timeline", "mapa interactivo con línea de tiempo")}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {Array.from(
                    (() => { const locs = new Map<string, string>(); for (const pt of journeyPoints.filter((p) => p.isProperty)) { const key = `${pt.lat.toFixed(2)},${pt.lon.toFixed(2)}`; if (!locs.has(key)) locs.set(key, pt.label.replace(/^(Saída|Chegada|Vinculado):\s*/, "")); } return locs.values(); })()
                  ).map((name) => (
                    <span key={name} className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-700 px-2 py-0.5 text-[11px] font-medium">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
              <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 self-start sm:self-center">
                <MapPinned className="h-4 w-4 mr-1.5" />
                {localized(metadataLocale, "Ver mapa", "View map", "Ver mapa")}
              </Button>
            </div>
          </section>
        )}

        {(hasHealthData || hasWeightData) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {hasHealthData && sanitySummary && (
              <div ref={setTourRef(1)} className="rounded-xl bg-white border border-stone-200/70 shadow p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full bg-emerald-400" />
                  <p className="text-xs uppercase tracking-wide text-stone-500 font-semibold">{localized(metadataLocale, "Sanidade", "Health", "Sanidad")}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200/50 p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-700">{sanitySummary.vaccines.length}</p>
                    <p className="text-[11px] text-emerald-600 mt-0.5">{localized(metadataLocale, "Vacinações", "Vaccinations", "Vacunaciones")}</p>
                  </div>
                  <div className="rounded-lg bg-teal-50 border border-teal-200/50 p-3 text-center">
                    <p className="text-2xl font-bold text-teal-700">{sanitySummary.treatments.length}</p>
                    <p className="text-[11px] text-teal-600 mt-0.5">{localized(metadataLocale, "Tratamentos", "Treatments", "Tratamientos")}</p>
                  </div>
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
              </div>
            )}

            {hasWeightData && (
              <div ref={setTourRef(2)} className="rounded-xl bg-white border border-stone-200/70 shadow p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 rounded-full bg-cyan-400" />
                    <p className="text-xs uppercase tracking-wide text-stone-500 font-semibold">{localized(metadataLocale, "Evolução de peso", "Weight progression", "Evolución de peso")}</p>
                  </div>
                  {latestWeightPoint && (
                    <span className="text-sm font-semibold text-foreground">{latestWeightPoint.weight.toFixed(1)} kg</span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-lg bg-cyan-50 border border-cyan-200/50 p-3 text-center">
                    <p className="text-2xl font-bold text-cyan-700">{weightHistory.length}</p>
                    <p className="text-[11px] text-cyan-600 mt-0.5">{localized(metadataLocale, "Pesagens", "Weighings", "Pesajes")}</p>
                  </div>
                  <div className="rounded-lg bg-sky-50 border border-sky-200/50 p-3 text-center">
                    <p className="text-2xl font-bold text-sky-700">{latestWeightPoint ? latestWeightPoint.weight.toFixed(1) : "-"}</p>
                    <p className="text-[11px] text-sky-600 mt-0.5">{localized(metadataLocale, "Último kg", "Latest kg", "Último kg")}</p>
                  </div>
                  {sanitySummary?.gmd !== null && sanitySummary?.gmd !== undefined && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200/50 p-3 text-center col-span-2 sm:col-span-1">
                      <p className="text-2xl font-bold text-amber-700">{sanitySummary.gmd.toFixed(2)}</p>
                      <p className="text-[11px] text-amber-600 mt-0.5">{localized(metadataLocale, "GMD kg/dia", "ADG kg/day", "GMD kg/día")}</p>
                    </div>
                  )}
                </div>
                {weightHistory.length >= 2 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={weightHistory.map((wp) => ({ name: wp.label, peso: wp.weight }))}>
                      <defs>
                        <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0891b2" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                      <RechartsTooltip contentStyle={{ fontSize: 12 }} formatter={(v: number) => [`${v} kg`, "Peso"]} />
                      <Area type="monotone" dataKey="peso" stroke="none" fill="url(#weightGradient)" />
                      <Line type="monotone" dataKey="peso" stroke="#0891b2" strokeWidth={2} dot={{ fill: "#0891b2", r: 5, stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {localized(
                      metadataLocale,
                      "Novas pesagens formarão o gráfico de evolução.",
                      "More weighings will form a progression chart.",
                      "Nuevos pesajes formarán el gráfico de evolución."
                    )}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {upcomingEvents.length > 0 && (
          <section ref={setTourRef(3)} className="rounded-xl bg-white border border-stone-200/70 shadow-sm p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 rounded-full bg-emerald-400" />
              <p className="text-xs uppercase tracking-wide text-stone-500 font-semibold">{localized(metadataLocale, "Previsões", "Upcoming", "Próximos")}</p>
            </div>
            <div className="space-y-2">
              {upcomingEvents.map((ev, i) => (
                <div key={i} className={`flex items-start gap-3 rounded-lg p-3 text-sm ${
                  ev.urgency === "overdue" ? "bg-red-50 border border-red-200/50" :
                  ev.urgency === "soon" ? "bg-amber-50 border border-amber-200/50" :
                  "bg-stone-50 border border-stone-200/50"
                }`}>
                  <span className={`inline-block w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    ev.urgency === "overdue" ? "bg-red-500" : ev.urgency === "soon" ? "bg-amber-500" : "bg-stone-400"
                  }`} />
                  <div>
                    <p className={`font-medium ${ev.urgency === "overdue" ? "text-red-800" : ev.urgency === "soon" ? "text-amber-800" : "text-foreground"}`}>{ev.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{ev.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {false && (
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
                  {localized(metadataLocale, "Ver localizações", "View locations", "Ver ubicaciones")}
                </Button>
              </div>
            </div>
          </section>
        )}

        {sanitaryAttestation && sanitaryVerifyUrl && (
          <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl bg-emerald-600 p-2 text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-emerald-950">
                      {localized(metadataLocale, "IAGRO atesta", "IAGRO attests", "IAGRO certifica")}: {sanitaryAnimalStatus || "ativo"} / {sanitaryStatus || "regular"} ✓
                    </h2>
                    <span className="rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700">
                      {localized(metadataLocale, "assinado", "signed", "firmado")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-emerald-800">
                    {sanitaryIssuer?.name || localized(metadataLocale, "Órgão sanitário", "Sanitary agency", "Organismo sanitario")} {localized(metadataLocale, "confirmou esta atestação com assinatura verificável.", "confirmed this attestation with a verifiable signature.", "confirmó esta certificación con una firma verificable.")}
                    {localized(metadataLocale, "O QR aponta para o recibo público da credencial.", "The QR points to the public credential receipt.", "El QR apunta al recibo público de la credencial.")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-emerald-700">
                    {sanitaryAttestation.issued_at ? (
                      <span>{localized(metadataLocale, "Emitido em", "Issued on", "Emitido el")} {formatDateShort(sanitaryAttestation.issued_at)}</span>
                    ) : null}
                    {sanitaryAttestation.valid_until ? (
                      <span>{localized(metadataLocale, "Válido até", "Valid until", "Válido hasta")} {formatDateShort(sanitaryAttestation.valid_until)}</span>
                    ) : null}
                    <span className="font-mono">{localized(metadataLocale, "recibo", "receipt", "recibo")} {sanitaryAttestation.receipt_id.slice(0, 8)}...</span>
                  </div>
                </div>
              </div>
              <a
                href={sanitaryVerifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex shrink-0 items-center gap-3 rounded-xl border border-emerald-200 bg-white p-2 transition-colors hover:border-emerald-300"
              >
                <QRCodeSVG value={sanitaryVerifyUrl} size={72} level="M" fgColor="#047857" bgColor="#ffffff" />
                <span className="max-w-[90px] text-[10px] font-medium leading-tight text-emerald-800">
                  {localized(metadataLocale, "verificar recibo", "verify receipt", "verificar recibo")}
                </span>
              </a>
            </div>
          </section>
        )}

        {eudrDds && resolvedDfid && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <div className="text-sm font-semibold text-stone-900">
                    {localized(metadataLocale, "Declaração de Due Diligence (EUDR)", "EUDR Due Diligence Statement", "Declaración de diligencia debida (EUDR)")}
                  </div>
                  <p className="mt-0.5 text-xs text-stone-600">
                    {eudrDds.ready
                      ? localized(
                          metadataLocale,
                          "Este ativo tem uma Declaração EUDR emitida e ancorada - confira publicamente.",
                          "This asset has an emitted, anchored EUDR statement - verify it publicly.",
                          "Este activo tiene una declaración EUDR emitida y anclada - verifícala públicamente."
                        )
                      : localized(
                          metadataLocale,
                          "Este ativo tem uma Declaração EUDR emitida (com pontos em aberto) - confira publicamente.",
                          "This asset has an emitted EUDR statement (with open points) - verify it publicly.",
                          "Este activo tiene una declaración EUDR emitida (con puntos abiertos) - verifícala públicamente."
                        )}
                  </p>
                </div>
              </div>
              <Link
                to={`/eudr/v/${encodeURIComponent(resolvedDfid)}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                {localized(metadataLocale, "Ver Declaração", "View statement", "Ver declaración")} →
              </Link>
            </div>
          </section>
        )}

        {partnerSummaryFields.length > 0 && (
          <section className="rounded-xl bg-white border border-stone-200/70 shadow-sm p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 rounded-full bg-emerald-400" />
                  <h2 className="text-sm font-semibold text-stone-800">
                    {localized(metadataLocale, "Dados da movimentação", "Movement data", "Datos del movimiento")}
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {localized(
                    metadataLocale,
                    "Campos públicos recebidos na integração do parceiro.",
                    "Public fields received through the partner integration.",
                    "Campos públicos recibidos por la integración del socio."
                  )}
                </p>
              </div>
              <FileText className="h-5 w-5 text-emerald-600 shrink-0" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {partnerSummaryFields.map(({ key, value }) => (
                <div key={key} className="rounded-lg bg-stone-50/80 border border-stone-100 px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {getMetadataLabel(key, metadataLocale)}
                  </p>
                  <p className="text-sm font-medium text-foreground mt-1 break-words">
                    {formatMetadataDisplayValue(key, value, metadataLocale)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {visibleMetadataEntries.length > 0 && (
          <section className="border-t border-stone-200/40 pt-8">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-stone-700">
                {localized(metadataLocale, "Metadados públicos", "Public metadata", "Metadatos públicos")}
              </h2>
            </div>
            <div className="space-y-6">
              {groupedMetadataEntries.map(g => ({
                    ...g,
                    entries: g.entries.filter(e => ![
                      "weight_kg",
                      "data_pesagem",
                      "movement_type",
                      "movement_date",
                      "stock_motive",
                      "description",
                      "document_type",
                      "document_number",
                      "document_date",
                      "stock_location",
                      "cost_center_name",
                      "municipality",
                      "state",
                      "batch",
                      "category",
                      "breed",
                      "species",
                      "sex",
                      "birth_date",
                      "animal_id",
                      "animal_code",
                      "mapa_code",
                      "sisbov_registration_date",
                      "identification_date",
                      "fazenda",
                    ].includes(e.canonicalKey))
                  })).filter(g => g.entries.length > 0).map(({ group, entries }) => (
                <div key={group} className="space-y-2.5">
                  <div className="inline-flex items-center gap-1.5 border-b border-stone-200/60 pb-1.5 mb-1">
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
                          <div key={`${canonicalKey}-${rawKeys.join(",")}`} className="bg-stone-50/80 rounded-lg p-3.5 space-y-2">
                            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">SISBOV</p>
                            <a
                              href={sisbovDfidUrl}
                              className="text-sm font-medium text-primary break-all hover:underline"
                            >
                              {isAuthenticated ? sisbov : maskTail(sisbov)}
                            </a>
                            <div className="flex items-center gap-2">
                              {isAuthenticated && (
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => void copyText(sisbov, localized(metadataLocale, "SISBOV", "SISBOV number", "Número SISBOV"))}>
                                  <Copy className="h-3 w-3 mr-1" />
                                  {localized(metadataLocale, "Copiar número", "Copy number", "Copiar número")}
                                </Button>
                              )}
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => void copyText(refUrl, localized(metadataLocale, "Link SISBOV", "SISBOV link", "Enlace SISBOV"))}>
                                <Link2 className="h-3 w-3 mr-1" />
                                {localized(metadataLocale, "Copiar link", "Copy link", "Copiar enlace")}
                              </Button>
                            </div>
                          </div>
                        );
                      }

                      if (normalized.endsWith("_commitment")) {
                        const commitment = readCommitment(value);
                        if (!commitment) return null;
                        const commitmentHash = commitment?.value;
                        const version = commitment?.version;
                        const subject = commitmentSubject(canonicalKey, commitment.domain, metadataLocale);
                        return (
                          <div key={`${canonicalKey}-${rawKeys.join(",")}`} className="bg-emerald-50/70 border border-emerald-100 rounded-lg p-3.5 space-y-3 sm:col-span-2">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 h-8 w-8 rounded-full bg-white border border-emerald-100 flex items-center justify-center shrink-0">
                                <Lock className="h-4 w-4 text-emerald-700" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground">
                                  {protectedCommitmentTitle(subject, metadataLocale)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {protectedCommitmentDescription(subject, metadataLocale)}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div className="rounded-md bg-white/80 border border-emerald-100 px-3 py-2">
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                  {localized(metadataLocale, "Prova protegida", "Protected proof", "Prueba protegida")}
                                </p>
                                <p className="font-mono text-xs text-foreground mt-1 break-all">
                                  {shortCommitment(commitmentHash)}
                                </p>
                              </div>
                              <div className="rounded-md bg-white/80 border border-emerald-100 px-3 py-2">
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                  {localized(metadataLocale, "Escopo", "Scope", "Alcance")}
                                </p>
                                <p className="text-xs font-medium text-foreground mt-1">
                                  {subject}
                                </p>
                              </div>
                              <div className="rounded-md bg-white/80 border border-emerald-100 px-3 py-2">
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                  {localized(metadataLocale, "Versão", "Version", "Versión")}
                                </p>
                                <p className="text-xs font-medium text-foreground mt-1">
                                  {typeof version === "string" ? version : "v1"}
                                </p>
                              </div>
                            </div>
                            <details>
                              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                {localized(metadataLocale, "Ver prova técnica", "View technical proof", "Ver prueba técnica")}
                              </summary>
                              <pre className="mt-2 text-xs text-foreground overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-white/80 border border-emerald-100 p-3">
                                {compactJson(value)}
                              </pre>
                            </details>
                          </div>
                        );
                      }

                      if (normalized === "car") {
                        // Collect all CARs: from metadata + from property events
                        const allCars = new Map<string, string>();
                        const metaCar = typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : null;
                        if (metaCar) allCars.set(metaCar, localized(metadataLocale, "Registro de origem", "Registration origin", "Registro de origen"));
                        for (const ev of events) {
                          if (ev.event_type === "item_property_linked") {
                            const p = (ev.payload || {}) as Record<string, unknown>;
                            const evCar = typeof p.car === "string" ? p.car.trim() : null;
                            const evName = typeof p.property_dfid === "string" ? p.property_dfid : null;
                            if (evCar && !allCars.has(evCar)) allCars.set(evCar, evName || "");
                            else if (evCar && evName) allCars.set(evCar, evName);
                          }
                        }
                        return (
                          <div key={`${canonicalKey}-${rawKeys.join(",")}`} className="bg-stone-50/80 rounded-lg p-3.5 space-y-3 sm:col-span-2">
                            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                              {localized(metadataLocale, "Propriedades associadas (CAR)", "Associated properties (CAR)", "Propiedades asociadas (CAR)")}
                            </p>
                            {Array.from(allCars.entries()).map(([carNum, propName]) => (
                              <div key={carNum} className="flex items-start gap-2">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                <div className="min-w-0">
                                  {propName && <p className="text-xs font-medium text-foreground">{propName}</p>}
                                  <button
                                    onClick={() => {
                                      if (isOfficialCarFormat(carNum)) {
                                        setCarDialogValue(carNum);
                                        setCarResult(null); setCarError(null);
                                        setShowCarDialog(true);
                                        runPublicCarLookup(carNum);
                                      }
                                    }}
                                    className="text-xs text-primary break-all hover:underline text-left font-mono"
                                  >
                                    {carNum}
                                  </button>
                                </div>
                              </div>
                            ))}
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
                          <div key={`${canonicalKey}-${rawKeys.join(",")}`} className="bg-stone-50/80 rounded-lg p-3.5 space-y-2">
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
                                    normalized === "inscricao_estadual_centro_custo"
                                      ? localized(
                                          metadataLocale,
                                          "Inscrição estadual do centro de custo",
                                          "Cost center state registration",
                                          "Registro estatal del centro de costo"
                                        )
                                      : localized(
                                          metadataLocale,
                                          "Inscrição estadual",
                                          "State registration",
                                          "Registro estatal"
                                        )
                                  )
                                }
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                {localized(metadataLocale, "Copiar número", "Copy number", "Copiar número")}
                              </Button>
                            </div>
                          </div>
                        );
                      }

	                      if (normalized === "weight_kg" && (typeof value === "number" || typeof value === "string")) {
	                        const weight = Number(value);
	                        return (
                          <div key={`${canonicalKey}-${rawKeys.join(",")}`} className="bg-stone-50/80 rounded-lg p-3.5 space-y-2">
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
                                {localized(metadataLocale, "Data da pesagem", "Weighing date", "Fecha de pesaje")}: {weightMeta.date}
                              </p>
                            ) : (
                              <p className="text-[11px] text-muted-foreground">
                                {localized(metadataLocale, "Clique para ver evolução de peso.", "Click to view weight progression.", "Haz clic para ver la evolución de peso.")}
                              </p>
                            )}
                          </div>
	                        );
	                      }

		                      return (
	                        <div key={`${canonicalKey}-${rawKeys.join(",")}`} className="bg-stone-50/80 rounded-lg p-3.5">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{displayLabel}</p>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex text-muted-foreground hover:text-foreground"
                                  aria-label={localized(metadataLocale, "Mostrar campo original", "Show original field", "Mostrar campo original")}
                                >
                                  <Info className="h-3 w-3" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs text-xs">
                                {localized(metadataLocale, "Campo(s) original(is): ", "Original field(s): ", "Campo(s) original(es): ")}
                                {rawKeys.join(", ")}
                                <br />
                                {localized(metadataLocale, "Campo oficial: ", "Official field: ", "Campo oficial: ")}
                                {canonicalKey}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          {typeof value === "object" ? (
                            <pre className="text-xs text-foreground mt-1 overflow-x-auto whitespace-pre-wrap break-words">
                              {compactJson(value)}
                            </pre>
                          ) : (
                            <p className="text-sm font-medium text-foreground mt-0.5 break-words">
                              {!isAuthenticated && SENSITIVE_PUBLIC_IDS.has(normalized)
                                ? maskTail(String(value ?? ""))
                                : String(value ?? "-")}
                            </p>
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

        <section ref={setTourRef(7)} className="border-t border-stone-200/40 pt-5">
          {isLoadingProofs ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando provas...
            </div>
          ) : (
            <div className="border-t border-stone-200/40 pt-5">
              {/* Honest proof state: só afirma "verificado em blockchain" quando a
                  âncora on-chain está confirmada. Caso contrário, mostra a prova
                  real (IPFS) sem alegar confirmação on-chain que não aconteceu. */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    proofs?.identity_anchor?.status === "confirmed"
                      ? "bg-emerald-50"
                      : "bg-amber-50"
                  }`}
                >
                  <ShieldCheck
                    className={`h-5 w-5 ${
                      proofs?.identity_anchor?.status === "confirmed"
                        ? "text-emerald-600"
                        : "text-amber-600"
                    }`}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {proofs?.identity_anchor?.status === "confirmed"
                      ? localized(metadataLocale, "Verificado em blockchain", "Verified on blockchain", "Verificado en blockchain")
                      : latestContentVersion
                        ? localized(metadataLocale, "Registrado no IPFS", "Registered on IPFS", "Registrado en IPFS")
                        : localized(metadataLocale, "Prova pendente", "Proof pending", "Prueba pendiente")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {proofs?.identity_anchor?.status === "confirmed"
                      ? "Stellar mainnet · IPFS (Pinata)"
                      : proofs?.identity_anchor
                        ? localized(metadataLocale, "IPFS (Pinata) · ancoragem Stellar pendente", "IPFS (Pinata) · Stellar anchoring pending", "IPFS (Pinata) · anclaje Stellar pendiente")
                        : "IPFS (Pinata)"}
                  </p>
                </div>
              </div>
              <details className="mt-3">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  {localized(metadataLocale, "Ver detalhes técnicos", "View technical details", "Ver detalles técnicos")}
                </summary>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{localized(metadataLocale, "Identidade", "Identity", "Identidad")}</p>
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
                        <p
                          className={`text-[11px] font-medium ${
                            proofs.identity_anchor.status === "confirmed"
                              ? "text-emerald-600"
                              : "text-amber-600"
                          }`}
                        >
                          {proofs.identity_anchor.status === "confirmed"
                            ? localized(metadataLocale, "Confirmado on-chain", "Confirmed on-chain", "Confirmado on-chain")
                            : localized(metadataLocale, `Status on-chain: ${proofs.identity_anchor.status}`, `On-chain status: ${proofs.identity_anchor.status}`, `Estado on-chain: ${proofs.identity_anchor.status}`)}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => void copyText(proofs.identity_anchor!.transaction_hash, "Hash de identidade")}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            {localized(metadataLocale, "Copiar hash", "Copy hash", "Copiar hash")}
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowIdentityDialog(true)}>
                            {localized(metadataLocale, "Ver detalhes", "View details", "Ver detalles")}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">{localized(metadataLocale, "Identidade ainda não disponível.", "Identity is not available yet.", "Identidad aún no disponible.")}</p>
                    )}
                  </div>

                  <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{localized(metadataLocale, "CID (última versão)", "CID (latest version)", "CID (última versión)")}</p>
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
                            {localized(metadataLocale, "Copiar CID", "Copy CID", "Copiar CID")}
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowCidDialog(true)}>
                            {localized(metadataLocale, "Ver versões", "View versions", "Ver versiones")}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">{localized(metadataLocale, "Nenhuma versão de conteúdo disponível.", "No content version available.", "Ninguna versión de contenido disponible.")}</p>
                    )}
                  </div>
                </div>
              </details>
            </div>
          )}
        </section>

        <section className="mt-4 pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Activity className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">{localized(metadataLocale, "Histórico", "History", "Historial")}</h2>
                <p className="text-xs text-muted-foreground">
                  {localized(
                    metadataLocale,
                    `${realEvents.length} público${realEvents.length !== 1 ? "s" : ""} · ${operationalEvents.length} técnico${operationalEvents.length !== 1 ? "s" : ""}`,
                    `${realEvents.length} public · ${operationalEvents.length} technical`,
                    `${realEvents.length} público${realEvents.length !== 1 ? "s" : ""} · ${operationalEvents.length} técnico${operationalEvents.length !== 1 ? "s" : ""}`
                  )}
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
                    {localized(metadataLocale, "Ocultar operacionais", "Hide technical", "Ocultar técnicos")}
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    {localized(metadataLocale, "Mostrar técnicos", "Show technical", "Mostrar técnicos")}
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
              <p className="text-sm text-foreground font-medium">
                {localized(metadataLocale, "Sem eventos públicos neste item.", "No public events for this item.", "No hay eventos públicos para este animal.")}
              </p>
              {isAuthenticated && operationalEvents.length > 0 && !showOperational ? (
                <>
                  <p className="text-xs text-muted-foreground mt-1">
                    {localized(
                      metadataLocale,
                      operationalEvents.length === 1
                        ? "Há 1 evento técnico disponível para visualização."
                        : `Há ${operationalEvents.length} eventos técnicos disponíveis para visualização.`,
                      `${operationalEvents.length} technical event${operationalEvents.length !== 1 ? "s are" : " is"} available to view.`,
                      operationalEvents.length === 1
                        ? "Hay 1 evento técnico disponible para ver."
                        : `Hay ${operationalEvents.length} eventos técnicos disponibles para ver.`
                    )}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4"
                    onClick={() => setShowOperational(true)}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                    {localized(metadataLocale, "Mostrar técnicos", "Show technical", "Mostrar técnicos")}
                  </Button>
                </>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  {localized(
                    metadataLocale,
                    "Este item ainda não tem linha do tempo pública. O histórico privado do circuito fica visível apenas para participantes autorizados.",
                    "This item has no public timeline yet. Private circuit history is visible only to authorized participants.",
                    "Este animal todavía no tiene línea de tiempo pública. El historial privado del circuito solo es visible para participantes autorizados."
                  )}
                </p>
              )}
            </div>
          ) : (
            /* === Timeline visual with year grouping === */
            <div ref={setTourRef(5)} className="space-y-6">
              {(() => {
                const eventDateStr = (e: typeof visibleEvents[number]) => {
                  const p = (e.payload || {}) as Record<string, unknown>;
                  return typeof p.occurred_at === "string" ? p.occurred_at : e.created_at;
                };
                // Mais recente primeiro: ordena eventos por data desc e agrupa por ano (ano mais novo no topo)
                const sortedEvents = [...visibleEvents].sort((a, b) => eventDateStr(b).localeCompare(eventDateStr(a)));
                const groups = new Map<string, typeof visibleEvents>();
                for (const e of sortedEvents) {
                  const year = eventDateStr(e).slice(0, 4);
                  if (!groups.has(year)) groups.set(year, []);
                  groups.get(year)!.push(e);
                }
                return Array.from(groups.entries()).sort(([a], [b]) => b.localeCompare(a)).map(([year, yearEvents]) => (
                  <div key={year}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-bold text-foreground bg-stone-100 px-2.5 py-1 rounded-full">{year}</span>
                      <div className="flex-1 h-px bg-stone-200" />
                      <span className="text-[10px] text-muted-foreground">{yearEvents.length} evento{yearEvents.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="relative ml-3">
                      <div className="absolute left-[9px] top-3 bottom-3 w-[1px] bg-stone-150" style={{ backgroundColor: "#e8e5e0" }} />
                      <div className="space-y-0.5">
                        {(() => {
                          // Group consecutive same-type events
                          const grouped: { events: typeof yearEvents; type: string }[] = [];
                          for (const evt of yearEvents) {
                            const last = grouped[grouped.length - 1];
                            if (last && last.type === evt.event_type) {
                              last.events.push(evt);
                            } else {
                              grouped.push({ events: [evt], type: evt.event_type });
                            }
                          }
                          return grouped.map((group, gi) => {
                            if (group.events.length === 1) {
                              // Single event — existing render
                              const event = group.events[0];
                              const Icon = eventTypeIcons[event.event_type] || Activity;
                              const color = EVENT_ICON_COLORS[event.event_type] || "#8b5cf6";
                              const label = eventTypeLabels[event.event_type] || event.event_type;
                              const summary = eventSummary(event);
                              const p = (event.payload || {}) as Record<string, unknown>;
                              const date = typeof p.occurred_at === "string" ? p.occurred_at : formatDateShort(event.created_at);
                              const isExp = expandedEvents.has(event.id);
                              const hasPayload = event.payload && Object.keys(event.payload).length > 0;

                              return (
                                <button
                                  key={event.id}
                                  onClick={() => hasPayload && toggleExpanded(event.id)}
                                  className={`relative flex gap-3 pl-1 py-2.5 w-full text-left rounded-lg transition-colors ${hasPayload ? "hover:bg-stone-50 cursor-pointer" : ""} ${isExp ? "bg-stone-50" : ""}`}
                                >
                                  <div className="relative z-[1] w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: color }}>
                                    <Icon className="h-3 w-3 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-xs font-medium text-foreground">{label}</span>
                                      <span className="text-[10px] text-muted-foreground tabular-nums">{date}</span>
                                        <SignedBadge signatureVerified={event.signature_verified} signatureKeyId={event.signature_key_id} />
                                        {hasPayload && <ChevronDown className={`h-3 w-3 text-muted-foreground/50 transition-transform ${isExp ? "rotate-180" : ""}`} />}
                                    </div>
                                    {summary && <p className="text-xs text-muted-foreground mt-0.5">{summary}</p>}
                                    {isExp && hasPayload && (
                                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                        {Object.entries(event.payload!).filter(([k]) => k !== "source").map(([k, v]) => {
                                          const isCarField = (k === "car" || k === "from_car" || k === "to_car") && typeof v === "string" && isOfficialCarFormat(v);
                                          const isCoordField = k.includes("coordinates") && typeof v === "object" && v !== null && "lat" in (v as Record<string, unknown>) && "lon" in (v as Record<string, unknown>);
                                          return (
                                            <div key={k} className="flex gap-1.5">
                                              <span className="text-muted-foreground shrink-0">{PAYLOAD_KEY_LABELS[k] || k}:</span>
                                              {isCarField ? (
                                                <span
                                                  className="text-primary font-mono truncate"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCarDialogValue(v as string);
                                                    setCarResult(null); setCarError(null);
                                                    setShowCarDialog(true);
                                                    runPublicCarLookup(v as string);
                                                  }}
                                                >{typeof v === "object" ? JSON.stringify(v) : String(v ?? "-")}</span>
                                              ) : isCoordField ? (
                                                <a href={`https://www.google.com/maps?q=${(v as Record<string, unknown>).lat},${(v as Record<string, unknown>).lon}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono truncate" onClick={(e) => e.stopPropagation()}>{`${(v as Record<string, unknown>).lat}, ${(v as Record<string, unknown>).lon}`}</a>
                                              ) : (
                                                <span className="text-foreground font-mono truncate">{typeof v === "object" ? JSON.stringify(v) : String(v ?? "-")}</span>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </button>
                              );
                            } else {
                              // Grouped consecutive same-type events
                              const label = eventTypeLabels[group.type] || group.type;
                              const Icon = eventTypeIcons[group.type] || Activity;
                              const color = EVENT_ICON_COLORS[group.type] || "#8b5cf6";
                              const groupKey = `group-${gi}-${year}`;
                              const isGroupExp = expandedEvents.has(groupKey);
                              const groupHasVerifiedSignature = group.events.some((event) => event.signature_verified === true);
                              const groupHasInvalidSignature = !groupHasVerifiedSignature && group.events.some((event) => event.signature_verified === false);
                              // Range sempre antigo -> recente (independe da ordem de exibição dos eventos)
                              const groupMonths = group.events
                                .map((ev) => {
                                  const ep = (ev.payload || {}) as Record<string, unknown>;
                                  return typeof ep.occurred_at === "string" ? ep.occurred_at.slice(0, 7) : formatDateShort(ev.created_at).slice(0, 7);
                                })
                                .sort((a, b) => a.localeCompare(b));
                              const firstDate = groupMonths[0];
                              const lastDate = groupMonths[groupMonths.length - 1];
                              const dateRange = firstDate === lastDate ? firstDate : `${firstDate} — ${lastDate}`;

                              return (
                                <div key={groupKey}>
                                  <button
                                    onClick={() => toggleExpanded(groupKey)}
                                    className={`relative flex gap-3 pl-1 py-2.5 w-full text-left rounded-lg transition-colors hover:bg-stone-50 cursor-pointer ${isGroupExp ? "bg-stone-50" : ""}`}
                                  >
                                    <div className="relative z-[1] w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: color }}>
                                      <Icon className="h-3 w-3 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-baseline gap-2">
                                        <span className="text-xs font-medium text-foreground">{group.events.length} {label}</span>
                                        <span className="text-[10px] text-muted-foreground tabular-nums">{dateRange}</span>
                                        <SignedBadge
                                          signatureVerified={groupHasVerifiedSignature ? true : groupHasInvalidSignature ? false : null}
                                          size="xs"
                                        />
                                        <ChevronDown className={`h-3 w-3 text-muted-foreground/50 transition-transform ${isGroupExp ? "rotate-180" : ""}`} />
                                      </div>
                                    </div>
                                  </button>
                                  {isGroupExp && (
                                    <div className="ml-8 border-l border-stone-200 pl-3 space-y-1 mb-1">
                                      {group.events.map((event) => {
                                        const evtSummary = eventSummary(event);
                                        const ep = (event.payload || {}) as Record<string, unknown>;
                                        const evtDate = typeof ep.occurred_at === "string" ? ep.occurred_at.slice(0, 10) : formatDateShort(event.created_at);
                                        return (
                                          <button
                                            key={event.id}
                                            onClick={() => event.payload && Object.keys(event.payload).length > 0 && toggleExpanded(event.id)}
                                            className={`relative flex gap-2 py-1.5 w-full text-left rounded transition-colors text-xs ${event.payload && Object.keys(event.payload).length > 0 ? "hover:bg-stone-50 cursor-pointer" : ""} ${expandedEvents.has(event.id) ? "bg-stone-50" : ""}`}
                                          >
                                            <span className="text-foreground">{evtSummary || label}</span>
                                            <span className="text-muted-foreground tabular-nums">· {evtDate}</span>
                                            {event.event_owner_workspace_id && issuerMap[event.event_owner_workspace_id] && (
                                              <span className="text-muted-foreground">
                                                · por {issuerMap[event.event_owner_workspace_id].name}
                                                <span className="text-muted-foreground/70"> ({workspaceTypeLabel(issuerMap[event.event_owner_workspace_id].workspace_type)})</span>
                                              </span>
                                            )}
                                            <SignedBadge signatureVerified={event.signature_verified} signatureKeyId={event.signature_key_id} />
                                            {event.payload && Object.keys(event.payload).length > 0 && (
                                              <ChevronDown className={`h-3 w-3 text-muted-foreground/50 transition-transform ${expandedEvents.has(event.id) ? "rotate-180" : ""}`} />
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            }
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                ));
              })()}
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
            setCarMetaError(null);
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
              {carGeoLoading || carGeojson || carGeoError ? (
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground mb-2">{localized(metadataLocale, "Polígono da propriedade", "Property polygon", "Polígono de la propiedad")}</p>
                  {carGeoLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
                      <Loader2 className="h-4 w-4 animate-spin" /> {localized(metadataLocale, "Carregando mapa...", "Loading map...", "Cargando mapa...")}
                    </div>
                  ) : carGeojson ? (
                    <PropertyMap geojson={carGeojson} className="h-64 w-full" />
                  ) : carGeoError ? (
                    <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200/60 rounded-md px-3 py-4">
                      <AlertTriangle className="h-4 w-4 shrink-0" /> {carGeoError}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* CAR Metadata (public, always shown) */}
              {carMetaLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando dados do CAR...
                </div>
              ) : carMetadata ? (
                <div className="bg-stone-50/80 rounded-lg p-3.5 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-stone-500 font-semibold mb-2">Dados do Cadastro</p>
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
              ) : carMetaError ? (
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200/60 rounded-md px-3 py-3">
                  <AlertTriangle className="h-4 w-4 shrink-0" /> {carMetaError}
                </div>
              ) : null}

              {carLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Consultando compliance...
                </div>
              ) : carResult ? (
                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-stone-500 font-semibold mb-2">Compliance Check</p>
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

      <Dialog open={showEmbedPreview} onOpenChange={setShowEmbedPreview}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Widget Embed</DialogTitle>
            <DialogDescription>Cole este código no seu site para exibir a rastreabilidade deste animal.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-stone-200 overflow-hidden">
              <iframe
                src={`/embed/item/${item?.dfid || ""}`}
                className="w-full border-0"
                style={{ height: "160px" }}
                title="Embed preview"
              />
            </div>
            <div className="rounded-lg bg-stone-50 p-3">
              <p className="text-xs uppercase tracking-wide text-stone-500 font-semibold mb-2">Código HTML</p>
              <pre className="text-xs font-mono text-foreground break-all whitespace-pre-wrap select-all">{`<iframe src="https://defarm.net/embed/item/${item?.dfid || ""}" width="100%" height="160" frameborder="0" style="border-radius:12px;border:1px solid #e5e5e5;"></iframe>`}</pre>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => {
                navigator.clipboard.writeText(`<iframe src="https://defarm.net/embed/item/${item?.dfid || ""}" width="100%" height="160" frameborder="0" style="border-radius:12px;border:1px solid #e5e5e5;"></iframe>`);
                toast({ title: "Código copiado" });
              }}
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Copiar código
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showJourneyDialog} onOpenChange={setShowJourneyDialog}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{localized(metadataLocale, "Jornada do Animal", "Animal Journey", "Recorrido del animal")}</DialogTitle>
            <DialogDescription>
              {localized(metadataLocale, "Mapa com propriedades, deslocamentos e eventos geolocalizados. Clique nos marcadores para ver detalhes.", "Map with properties, movements and geolocated events. Click markers to see details.", "Mapa con propiedades, desplazamientos y eventos geolocalizados. Haz clic en los marcadores para ver detalles.")}
            </DialogDescription>
          </DialogHeader>
          {showJourneyDialog && journeyPoints.length > 0 && (
            <JourneyMapInline points={journeyPoints} locale={metadataLocale} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCircuitsDialog} onOpenChange={setShowCircuitsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{localized(metadataLocale, "Redes de rastreabilidade", "Traceability networks", "Redes de trazabilidad")}</DialogTitle>
            <DialogDescription>
              {localized(metadataLocale, "Se o circuito for privado/seletivo, a página de destino poderá exigir autenticação.", "If the circuit is private/selective, the destination page may require authentication.", "Si el circuito es privado/selectivo, la página de destino puede exigir autenticación.")}
            </DialogDescription>
          </DialogHeader>

          {associatedCircuitIds.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {localized(metadataLocale, "Nenhum circuito associado foi identificado nos eventos públicos deste item.", "No associated circuit was identified in this item public events.", "No se identificó ningún circuito asociado en los eventos públicos de este animal.")}
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
            <DialogTitle>{localized(metadataLocale, "Evolução de peso", "Weight progression", "Evolución de peso")}</DialogTitle>
            <DialogDescription>{localized(metadataLocale, "Histórico de pesagens públicas registradas para este item.", "History of public weighings recorded for this item.", "Historial de pesajes públicos registrados para este animal.")}</DialogDescription>
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
                          ? localized(metadataLocale, " (data inferida)", " (inferred date)", " (fecha inferida)")
                          : "";
                        return [
                          `${Number(value).toFixed(1)} kg · ${src}${inferred}`,
                          localized(metadataLocale, "Peso", "Weight", "Peso"),
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
                  {localized(
                    metadataLocale,
                    "* Não foi informada a data da pesagem. O gráfico usa a data do processamento/envio dos dados.",
                    "* Weighing date was not provided. The chart uses the data processing/submission date.",
                    "* No se informó la fecha de pesaje. El gráfico usa la fecha de procesamiento/envío de los datos."
                  )}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showIdentityDialog} onOpenChange={setShowIdentityDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{localized(metadataLocale, "Identidade e eventos emitidos", "Identity and emitted events", "Identidad y eventos emitidos")}</DialogTitle>
            <DialogDescription>
              {localized(metadataLocale, "Primeiro registro de identidade e emissões on-chain associadas ao conteúdo.", "First identity record and on-chain emissions associated with the content.", "Primer registro de identidad y emisiones on-chain asociadas al contenido.")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            {proofs?.identity_anchor ? (
              <div className="rounded border p-3">
                <p className="text-xs text-muted-foreground">{localized(metadataLocale, "Hash de identidade", "Identity hash", "Hash de identidad")}</p>
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
                    onClick={() => void copyText(
                      proofs.identity_anchor!.transaction_hash,
                      localized(metadataLocale, "Hash de identidade", "Identity hash", "Hash de identidad")
                    )}
                  >
                    {localized(metadataLocale, "Copiar", "Copy", "Copiar")}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">{localized(metadataLocale, "Sem hash de identidade disponível.", "No identity hash available.", "No hay hash de identidad disponible.")}</p>
            )}

            {proofs?.nft_mint_anchor ? (
              <div className="rounded border p-3">
                <p className="text-xs text-muted-foreground">{localized(metadataLocale, "Hash de mint", "Mint hash", "Hash de mint")}</p>
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
              <p className="text-xs text-muted-foreground mb-2">{localized(metadataLocale, "Hashes de eventos emitidos", "Emitted event hashes", "Hashes de eventos emitidos")} ({emittedTxHashes.length})</p>
              {emittedTxHashes.length === 0 ? (
                <p className="text-muted-foreground">{localized(metadataLocale, "Nenhum evento emitido público encontrado.", "No public emitted event found.", "No se encontró ningún evento emitido público.")}</p>
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
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => void copyText(tx, "Hash") }> {localized(metadataLocale, "Copiar", "Copy", "Copiar")}</Button>
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
            <DialogTitle>{localized(metadataLocale, "Versões de CID", "CID versions", "Versiones de CID")}</DialogTitle>
            <DialogDescription>
              {localized(metadataLocale, "Última versão e histórico de CIDs anteriores.", "Latest version and history of previous CIDs.", "Última versión e historial de CIDs anteriores.")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            {latestContentVersion ? (
              <div className="rounded border p-3 space-y-2">
                <p className="text-xs text-muted-foreground">{localized(metadataLocale, "Último CID", "Latest CID", "Último CID")} (v{latestContentVersion.version})</p>
                <p className="font-mono text-xs text-foreground break-all">{latestContentVersion.cid}</p>
                <div className="flex items-center gap-2">
                  <a
                    href={latestContentVersion.gateway_url || `https://gateway.pinata.cloud/ipfs/${latestContentVersion.cid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {localized(metadataLocale, "Ver registro original", "View original record", "Ver registro original")} <ExternalLink className="h-3 w-3" />
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
                    {cidViewLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : localized(metadataLocale, "Visualizar", "View", "Visualizar")}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">{localized(metadataLocale, "Nenhum CID disponível.", "No CID available.", "No hay CID disponible.")}</p>
            )}

            <div className="rounded border p-3">
              <p className="text-xs text-muted-foreground mb-2">{localized(metadataLocale, "CIDs anteriores", "Previous CIDs", "CIDs anteriores")} ({olderContentVersions.length})</p>
              {olderContentVersions.length === 0 ? (
                <p className="text-muted-foreground">{localized(metadataLocale, "Sem versões anteriores.", "No previous versions.", "Sin versiones anteriores.")}</p>
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
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => void copyText(v.cid, "CID") }> {localized(metadataLocale, "Copiar", "Copy", "Copiar")}</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cidViewContent && (
              <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-stone-500 font-semibold">{localized(metadataLocale, "Conteúdo do registro", "Record content", "Contenido del registro")}</p>
                  <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => setCidViewContent(null)}> {localized(metadataLocale, "Fechar", "Close", "Cerrar")}</Button>
                </div>
                {cidViewContent.data.schema_version && (
                  <p className="text-xs text-muted-foreground">Schema v{String(cidViewContent.data.schema_version)}</p>
                )}

                {cidViewContent.data.identity && typeof cidViewContent.data.identity === "object" && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-foreground">{localized(metadataLocale, "Identidade", "Identity", "Identidad")}</p>
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
      {/* Beta tour overlay */}
      <TourOverlay
        step={tourStep}
        steps={tourSteps}
        refs={tourRefs}
        locale={metadataLocale}
        onNext={() => setTourStep((s) => s !== null && s < tourSteps.length - 1 ? s + 1 : null)}
        onPrev={() => setTourStep((s) => s !== null && s > 0 ? s - 1 : s)}
        onClose={() => setTourStep(null)}
      />

      {/* Tour start button — floating, beta only */}
      {isBeta && tourStep === null && (
        <button
          onClick={() => setTourStep(0)}
          className="fixed bottom-6 right-6 z-30 bg-white/90 hover:bg-white text-stone-500 hover:text-stone-700 border border-stone-200 rounded-full px-3 py-2 shadow-md backdrop-blur-sm flex items-center gap-1.5 text-[11px] font-medium transition-all no-print"
        >
          <Info className="h-3.5 w-3.5" />
          Tour
        </button>
      )}
    </Shell>
  );
}

function Shell({
  children,
  isAuthenticated,
  locale = "pt-BR",
}: {
  children: React.ReactNode;
  isAuthenticated: boolean;
  locale?: MetadataLocale;
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
                  {localized(locale, "Login na DeFarm", "Log in to DeFarm", "Iniciar sesión en DeFarm")}
                </Button>
              </Link>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link to="/app">
                  <Button size="sm" variant="outline" className="h-8 px-3 text-xs">
                    {localized(locale, "Abrir app", "Open app", "Abrir app")}
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
