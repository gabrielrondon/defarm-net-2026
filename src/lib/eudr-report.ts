// Normalização + helpers do report EUDR (C5). Transforma o JSON cru do /check
// (via proxy /eudr/polygon-report) no contrato EudrReportData do spec
// (docs/eudr-report-react-spec.md). Copy de domínio (verdict/status/labels) vive
// aqui como mapa bilíngue — é o que o spec prescreve como dado.
import type { CheckReportRaw, CheckSourceRaw } from "@/lib/api/products";

export type Verdict = "COMPLIANT" | "PARTIAL" | "NON_COMPLIANT";
export type SourceStatus = "PASS" | "WARNING" | "FAIL" | "NOT_APPLICABLE" | "ERROR";
export type Severity = "LOW" | "MEDIUM" | "HIGH";
export type Locale = "pt-BR" | "en";

export function coerceLocale(lang?: string): Locale {
  return lang && lang.toLowerCase().startsWith("en") ? "en" : "pt-BR";
}

export interface SourceDetails {
  tree_cover_loss_ha?: number;
  loss_post_2020_ha?: number;
  total_loss_ha?: number;
  by_year?: Record<string, number>;
  alerts_high?: number;
  alerts_nominal?: number;
  alerts_high_area_ha?: number;
  total_area_ha?: number;
  by_confidence?: Record<string, { area_ha: number; count?: number }>;
  de_minimis_ha?: number;
  prodes_intersection_ha?: number;
  cars_matched?: number;
  [k: string]: unknown;
}

export interface EudrEvidence {
  dataSource?: string;
  url?: string;
  lastUpdate?: string;
}

export interface EudrSourceN {
  key: string;
  name: string;
  status: SourceStatus;
  severity?: Severity;
  category?: string;
  message: string;
  details: SourceDetails;
  evidence: EudrEvidence;
}

export interface EudrReportData {
  verdict: Verdict;
  score: number;
  sources: EudrSourceN[];
  metadata: {
    checkId: string;
    country: string;
    areaHa: number;
    generatedAt: string;
    geometry: unknown;
  };
}

// ── Tokens (reaproveitados do sample/spec) ───────────────────────────────
export const VERDICT: Record<Verdict, { color: string; bg: string; label: Record<Locale, string> }> = {
  COMPLIANT: { color: "#1e6b46", bg: "#eef7f1", label: { "pt-BR": "Conforme (EUDR)", en: "Compliant (EUDR)" } },
  PARTIAL: { color: "#b45309", bg: "#fdf6e7", label: { "pt-BR": "Atenção — revisar", en: "Attention — review" } },
  NON_COMPLIANT: { color: "#b42318", bg: "#fdf0ee", label: { "pt-BR": "Não conforme (EUDR)", en: "Non-compliant (EUDR)" } },
};

export const STATUS: Record<SourceStatus, { color: string; bg: string; label: Record<Locale, string> }> = {
  PASS: { color: "#1e6b46", bg: "#eef7f1", label: { "pt-BR": "OK", en: "PASS" } },
  WARNING: { color: "#b45309", bg: "#fdf6e7", label: { "pt-BR": "Atenção", en: "WARNING" } },
  FAIL: { color: "#b42318", bg: "#fdf0ee", label: { "pt-BR": "Reprovado", en: "FAIL" } },
  NOT_APPLICABLE: { color: "#6b7280", bg: "#f3f4f6", label: { "pt-BR": "N/A", en: "N/A" } },
  ERROR: { color: "#6b7280", bg: "#f3f4f6", label: { "pt-BR": "Indisponível", en: "Unavailable" } },
};

const LABELS: Record<string, Record<Locale, string>> = {
  tree_cover_loss_ha: { "pt-BR": "Perda de cobertura florestal (total)", en: "Tree cover loss (total)" },
  loss_post_2020_ha: { "pt-BR": "Perda de cobertura florestal pós-2020", en: "Forest loss after 2020" },
  total_loss_ha: { "pt-BR": "Perda total acumulada", en: "Total accumulated loss" },
  alerts_high: { "pt-BR": "Alertas de alta confiança", en: "High-confidence alerts" },
  alerts_nominal: { "pt-BR": "Alertas nominais", en: "Nominal alerts" },
  alerts_high_area_ha: { "pt-BR": "Área dos alertas de alta confiança", en: "High-confidence alert area" },
  total_area_ha: { "pt-BR": "Área total alertada", en: "Total alerted area" },
  by_year: { "pt-BR": "Por ano", en: "By year" },
  by_confidence: { "pt-BR": "Por confiança", en: "By confidence" },
  de_minimis_ha: { "pt-BR": "Limiar de minimis", en: "De minimis threshold" },
  prodes_intersection_ha: { "pt-BR": "Interseção com PRODES", en: "PRODES intersection" },
  cars_matched: { "pt-BR": "CARs sobrepostos", en: "Matching CARs" },
};

export function labelOf(key: string, locale: Locale): string {
  return LABELS[key]?.[locale] ?? key;
}

// pt-BR: 1.425,54 ha · en: 1,425.54 ha. <1 → 2 casas; >=1000 → 0; senão 1.
export function formatHa(n: number, locale: Locale): string {
  const abs = Math.abs(n);
  const digits = abs < 1 ? 2 : abs >= 1000 ? 0 : 1;
  const loc = locale === "en" ? "en-US" : "pt-BR";
  return `${n.toLocaleString(loc, { minimumFractionDigits: digits, maximumFractionDigits: digits })} ha`;
}

export function formatCount(n: number, locale: Locale): string {
  return n.toLocaleString(locale === "en" ? "en-US" : "pt-BR");
}

// ── Área geodésica do polígono (ha) ──────────────────────────────────────
const EARTH_R = 6378137;
const toRad = (d: number) => (d * Math.PI) / 180;
function ringAreaSqm(ring: number[][]): number {
  const n = ring.length;
  if (n < 3) return 0;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const [lon1, lat1] = ring[i];
    const [lon2, lat2] = ring[(i + 1) % n];
    total += toRad(lon2 - lon1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)));
  }
  return Math.abs((total * EARTH_R * EARTH_R) / 2);
}
export function areaHaOf(geometry: any): number {
  if (!geometry || typeof geometry !== "object") return 0;
  let sqm = 0;
  if (geometry.type === "Polygon") {
    const rings: number[][][] = geometry.coordinates ?? [];
    rings.forEach((r, i) => (sqm += i === 0 ? ringAreaSqm(r) : -ringAreaSqm(r)));
  } else if (geometry.type === "MultiPolygon") {
    (geometry.coordinates ?? []).forEach((poly: number[][][]) =>
      poly.forEach((r, i) => (sqm += i === 0 ? ringAreaSqm(r) : -ringAreaSqm(r)))
    );
  }
  return Math.max(0, sqm) / 10000;
}

// ── Normalização raw /check -> EudrReportData ────────────────────────────
function normalizeStatus(s?: string): SourceStatus {
  const up = (s ?? "").toUpperCase();
  if (up === "PASS" || up === "FAIL" || up === "WARNING" || up === "ERROR") return up;
  if (up === "NOT_APPLICABLE" || up === "N/A" || up === "NA") return "NOT_APPLICABLE";
  return "ERROR";
}

function keyOf(name?: string): string {
  const n = (name ?? "").toLowerCase();
  if (n.includes("hansen")) return "hansen";
  if (n.includes("integrated")) return "gfw_integrated";
  if (n.includes("prodes")) return "car_prodes";
  if (n.includes("car match") || n.includes("polygon to car")) return "polygon_car_match";
  return n.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "source";
}

function normalizeSource(s: CheckSourceRaw): EudrSourceN {
  const sev = (s.severity ?? "").toUpperCase();
  return {
    key: keyOf(s.name),
    name: s.name ?? "—",
    status: normalizeStatus(s.status),
    severity: sev === "LOW" || sev === "MEDIUM" || sev === "HIGH" ? (sev as Severity) : undefined,
    category: s.category ?? undefined,
    message: s.message ?? "",
    details: (s.details ?? {}) as SourceDetails,
    evidence: {
      dataSource: s.evidence?.dataSource,
      url: s.evidence?.url,
      lastUpdate: s.evidence?.lastUpdate,
    },
  };
}

export function normalizeCheckReport(
  report: CheckReportRaw,
  geometry: unknown,
  country: string
): EudrReportData {
  const verdictRaw = (report.verdict ?? "").toUpperCase();
  const verdict: Verdict =
    verdictRaw === "COMPLIANT" || verdictRaw === "PARTIAL" || verdictRaw === "NON_COMPLIANT"
      ? (verdictRaw as Verdict)
      : "NON_COMPLIANT";
  const sources = (report.sources ?? []).map(normalizeSource);
  const meta = (report.metadata ?? {}) as Record<string, unknown>;
  return {
    verdict,
    score: typeof report.score === "number" ? report.score : 0,
    sources,
    metadata: {
      checkId: report.checkId ?? "",
      country,
      areaHa: areaHaOf(geometry),
      generatedAt: report.timestamp ?? (meta.timestamp as string) ?? "",
      geometry,
    },
  };
}

// ── Frase humana do banner ───────────────────────────────────────────────
export function verdictPhrase(data: EudrReportData, locale: Locale): string {
  const area = formatHa(data.metadata.areaHa, locale);
  const fails = data.sources.filter((s) => s.status === "FAIL");
  const warns = data.sources.filter((s) => s.status === "WARNING");
  const considered = data.sources.filter((s) => s.status !== "NOT_APPLICABLE" && s.status !== "ERROR").length;
  const sumHa = (arr: EudrSourceN[]) =>
    arr.reduce((acc, s) => acc + (s.details.loss_post_2020_ha ?? s.details.alerts_high_area_ha ?? 0), 0);

  if (data.verdict === "COMPLIANT") {
    return locale === "en"
      ? `No relevant deforestation after 2020 in the checked sources. Area: ${area}.`
      : `Sem desmate relevante após 2020 nas fontes consultadas. Área: ${area}.`;
  }
  if (data.verdict === "PARTIAL") {
    const w = warns[0];
    const dem = w?.details.de_minimis_ha ?? 1;
    const ha = formatHa(sumHa(warns), locale);
    return locale === "en"
      ? `Alerts below the ${dem} ha threshold (${ha}) — possible noise; review. Area: ${area}.`
      : `Alertas abaixo do limiar de ${dem} ha (${ha}) — possível ruído; revisar. Área: ${area}.`;
  }
  const ha = formatHa(sumHa(fails), locale);
  return locale === "en"
    ? `Post-2020 deforestation detected: ${ha} in ${fails.length} of ${considered} sources. Area: ${area}.`
    : `Desmate pós-2020 detectado: ${ha} em ${fails.length} de ${considered} fontes. Área: ${area}.`;
}

// Mensagem humanizada do card (aplica a regra do de minimis no WARNING).
export function sourceMessage(s: EudrSourceN, locale: Locale): string {
  if (s.status === "WARNING" && typeof s.details.alerts_high_area_ha === "number" && s.details.de_minimis_ha) {
    const dem = s.details.de_minimis_ha;
    const ha = formatHa(s.details.alerts_high_area_ha, locale);
    return locale === "en"
      ? `Alerts below the de minimis threshold (${dem} ha): ${ha} confirmed — likely noise/disturbance; manual review.`
      : `Alertas abaixo do limiar de minimis (${dem} ha): ${ha} confirmados — provável ruído/perturbação; revisar manualmente.`;
  }
  return s.message;
}
