import { checkRequest } from "./client";

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

export async function getCarMetadata(carNumber: string): Promise<CarMetadata> {
  return checkRequest<CarMetadata>(`/car/${encodeURIComponent(carNumber)}`);
}

export async function getCarGeoJSON(carNumber: string): Promise<CarGeoJSON> {
  return checkRequest<CarGeoJSON>(`/car/${encodeURIComponent(carNumber)}/geojson`);
}

export async function batchQueryCars(carNumbers: string[]): Promise<CarMetadata[]> {
  return checkRequest<CarMetadata[]>("/car/batch", {
    method: "POST",
    body: JSON.stringify({ carNumbers }),
  });
}
