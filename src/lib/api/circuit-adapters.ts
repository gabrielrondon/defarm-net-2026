import { registryRequest } from "./client";
import type {
  CircuitAdapter,
  AddCircuitAdapterRequest,
  UpdateCircuitAdapterRequest,
} from "./types";

export interface PendingTokenizationResponse {
  circuit_id: string;
  pending_items: number;
}

export interface TokenizePendingResponse {
  circuit_id: string;
  pending_items_before: number;
  enqueued_jobs: number;
  adapters: string[];
}

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

export async function getPendingTokenizationCount(
  circuitId: string
): Promise<PendingTokenizationResponse> {
  return registryRequest<PendingTokenizationResponse>(
    `/circuits/${circuitId}/adapters/pending-tokenization`
  );
}

export async function tokenizePendingItems(
  circuitId: string,
  params?: { limit?: number; priority?: number }
): Promise<TokenizePendingResponse> {
  const search = new URLSearchParams();
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.priority) search.set("priority", String(params.priority));
  const query = search.toString();
  return registryRequest<TokenizePendingResponse>(
    `/circuits/${circuitId}/adapters/tokenize-pending${query ? `?${query}` : ""}`,
    { method: "POST" }
  );
}
