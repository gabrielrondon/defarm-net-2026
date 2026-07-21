import type { EudrOrigin } from "@/lib/api/products";
import { checkRequest } from "./client";

// Same-origin Netlify Function. It injects the private Hetzner proxy token
// server-side, so the browser never receives Check API credentials.
const CHECK_API_PUBLIC_PROXY = "/api/check";

// Timeout for public CAR lookups. Without it, a slow/down backend leaves the
// request pending until the browser default (minutes), freezing the UI spinner.
const PUBLIC_FETCH_TIMEOUT_MS = 12_000;

async function publicFetch<T>(endpoint: string): Promise<T> {
  const url = `${CHECK_API_PUBLIC_PROXY}${endpoint}`;
  console.log(`[DeFarm Check Proxy] GET ${url}`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PUBLIC_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`Tempo limite (${PUBLIC_FETCH_TIMEOUT_MS / 1000}s) ao consultar o serviço de CAR.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export interface CarMetadata {
  carNumber: string;
  status: string;
  municipality: string;
  state: string;
  area: number;
  biome: string;
  polygon?: {
    type: string;
    coordinates: number[][][];
  };
}

export interface CarGeometry {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
}

export interface CarGeoJSON {
  type: "Feature";
  properties: Record<string, any>;
  geometry: CarGeometry;
}

export function carGeoJSONFromEudrOrigin(origin: EudrOrigin | null | undefined): CarGeoJSON | null {
  const polygon = origin?.polygon;
  if (!polygon || (polygon.type !== "Polygon" && polygon.type !== "MultiPolygon") || !polygon.coordinates) {
    return null;
  }

  return {
    type: "Feature",
    properties: {
      carNumber: origin.car,
      source: origin.polygon_source,
      areaHa: origin.area_ha,
    },
    geometry: polygon as CarGeometry,
  };
}

export async function getCarMetadata(carNumber: string, { skipAuth = false } = {}): Promise<CarMetadata> {
  if (skipAuth) {
    // Use same-origin server-side proxy for public pages. The Hetzner API is
    // not directly callable without the proxy token.
    return publicFetch<CarMetadata>(`/car/${encodeURIComponent(carNumber)}`);
  }
  return checkRequest<CarMetadata>(`/car/${encodeURIComponent(carNumber)}`, {}, { skipAuth });
}

export async function getCarGeoJSON(carNumber: string, { skipAuth = false } = {}): Promise<CarGeoJSON> {
  let geometry: CarGeometry;

  if (skipAuth) {
    // Use same-origin server-side proxy to avoid exposing Hetzner directly.
    geometry = await publicFetch<CarGeometry>(`/car/${encodeURIComponent(carNumber)}/geojson`);
  } else {
    geometry = await checkRequest<CarGeometry>(`/car/${encodeURIComponent(carNumber)}/geojson`, {}, { skipAuth });
  }

  return {
    type: "Feature",
    properties: {},
    geometry,
  };
}

// Metadados do CAR (inclui areaHa) lidos via proxy server-side, com timeout.
// Usado pra exibir área/UF/município reais da fonte (SICAR) sem depender de
// valores hardcoded.
export interface CarPublicMeta {
  carNumber: string;
  status: string | null;
  propertyName: string | null;
  ownerName: string | null;
  state: string | null;
  municipality: string | null;
  source: string | null;
  areaHa: number | null;
}

export async function getCarPublicMeta(carNumber: string): Promise<CarPublicMeta> {
  const res = await publicFetch<{ properties?: Partial<CarPublicMeta> }>(
    `/car/${encodeURIComponent(carNumber)}/geojson`,
  );
  const p = res.properties ?? {};
  return {
    carNumber: p.carNumber ?? carNumber,
    status: p.status ?? null,
    propertyName: p.propertyName ?? null,
    ownerName: p.ownerName ?? null,
    state: p.state ?? null,
    municipality: p.municipality ?? null,
    source: p.source ?? null,
    areaHa: typeof p.areaHa === "number" ? p.areaHa : null,
  };
}

export async function batchQueryCars(carNumbers: string[]): Promise<CarMetadata[]> {
  return checkRequest<CarMetadata[]>("/car/batch", {
    method: "POST",
    body: JSON.stringify({ carNumbers }),
  });
}

// --- Sample CARs for demo ---

export interface CarSample {
  carNumber: string;
  status: string;
  statusDescription: string;
  areaHa: number;
  municipality: string;
  state: string;
}

// Hardcoded fallback of known REAL CARs (verified against the Check API)
const FALLBACK_CARS: string[] = [
  "PR-4111506-1B80A47993684BEE9908ED4468199BF8",
  "MT-5103403-FFE614F3F24B4122B7EA454CCB29C355",
  "PA-1500602-ABBC0B0F9FDD4D30B8E7F1CE9E9AB4AA",
  "GO-5208707-80F0EAAA63D94E058FCE04F46FAC14CC",
  "BA-2903201-3A4F1C8DEF1349238E6AA07E8FA3E04B",
];

let cachedSamples: string[] | null = null;

export async function getSampleCarNumbers(): Promise<string[]> {
  if (cachedSamples) return cachedSamples;

  try {
    const data = await publicFetch<{ samples: CarSample[] }>("/samples/car");
    if (data.samples?.length > 0) {
      cachedSamples = data.samples.map(s => s.carNumber);
      return cachedSamples;
    }
  } catch (err) {
    console.warn("[DeFarm Check] Failed to fetch CAR samples, using fallback:", err);
  }

  return FALLBACK_CARS;
}

export function getRandomSampleCar(samples: string[]): string {
  return samples[Math.floor(Math.random() * samples.length)];
}
