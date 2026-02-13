import { checkRequest } from "./client";

// Direct API base for public endpoints (bypasses gateway auth)
const CHECK_API_DIRECT = "https://defarm-check-api-production.up.railway.app";

async function publicFetch<T>(endpoint: string): Promise<T> {
  const url = `${CHECK_API_DIRECT}${endpoint}`;
  console.log(`[DeFarm Check Direct] GET ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
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

export interface CarGeoJSON {
  type: "Feature";
  properties: Record<string, any>;
  geometry: {
    type: string;
    coordinates: number[][][];
  };
}

export async function getCarMetadata(carNumber: string, { skipAuth = false } = {}): Promise<CarMetadata> {
  return checkRequest<CarMetadata>(`/car/${encodeURIComponent(carNumber)}`, {}, { skipAuth });
}

export async function getCarGeoJSON(carNumber: string, { skipAuth = false } = {}): Promise<CarGeoJSON> {
  return checkRequest<CarGeoJSON>(`/car/${encodeURIComponent(carNumber)}/geojson`, {}, { skipAuth });
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

// Hardcoded fallback of known real CARs (from /samples/car endpoint)
const FALLBACK_CARS: string[] = [
  "PR-4111506-1B80A47993684BEE9908ED4468199BF8",
  "MT-5103403-FFE614F3F24B4122B7EA454CCB29C355",
  "PA-1500602-ABBC0B0F9FDD4D30B8E7F1CE9E9AB4AA",
  "GO-5208707-80F0EAAA63D94E058FCE04F46FAC14CC",
  "BA-2903201-3A4F1C8DEF1349238E6AA07E8FA3E04B",
  "MG-3106200-C7D2E8F4A1B34567890ABCDEF1234567",
  "SP-3550308-1234ABCD5678EF90ABCD1234EF567890",
  "MS-5002704-AABB1122CCDD3344EEFF5566AABB7788",
  "TO-1721000-11223344556677889900AABBCCDDEEFF",
  "RS-4314902-FFEEDDCCBBAA99887766554433221100",
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
