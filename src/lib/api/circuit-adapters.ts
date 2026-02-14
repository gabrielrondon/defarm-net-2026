import { registryRequest } from "./client";
import type {
  CircuitAdapter,
  AddCircuitAdapterRequest,
  UpdateCircuitAdapterRequest,
} from "./types";

export async function listCircuitAdapters(
  circuitId: string
): Promise<CircuitAdapter[]> {
  return registryRequest<CircuitAdapter[]>(`/circuits/${circuitId}/adapters`);
}

export async function addCircuitAdapter(
  circuitId: string,
  data: AddCircuitAdapterRequest
): Promise<CircuitAdapter> {
  return registryRequest<CircuitAdapter>(`/circuits/${circuitId}/adapters`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function setupDefaultAdapters(
  circuitId: string
): Promise<CircuitAdapter[]> {
  return registryRequest<CircuitAdapter[]>(
    `/circuits/${circuitId}/adapters/setup-defaults`,
    { method: "POST" }
  );
}

export async function updateCircuitAdapter(
  circuitId: string,
  adapterId: string,
  data: UpdateCircuitAdapterRequest
): Promise<CircuitAdapter> {
  return registryRequest<CircuitAdapter>(
    `/circuits/${circuitId}/adapters/${adapterId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}

export async function deleteCircuitAdapter(
  circuitId: string,
  adapterId: string
): Promise<void> {
  await registryRequest(`/circuits/${circuitId}/adapters/${adapterId}`, {
    method: "DELETE",
  });
}
