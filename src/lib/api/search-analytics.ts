import { buildQueryString, registryRequest } from "./client";
import type {
  AnalyticsKpisResponse,
  BlockchainMetricsResponse,
  IdentifierSearchResponse,
  SearchRequest,
  SearchResponse,
} from "./types";

export async function searchItems(payload: SearchRequest): Promise<SearchResponse> {
  return registryRequest<SearchResponse>("/search", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function searchByIdentifier(
  identifierType: string,
  value: string,
  circuitId?: string
): Promise<IdentifierSearchResponse[]> {
  const qs = buildQueryString({
    identifier_type: identifierType,
    value,
    circuit_id: circuitId,
  });
  return registryRequest<IdentifierSearchResponse[]>(`/search/identifier${qs}`);
}

export async function getAnalyticsKpis(): Promise<AnalyticsKpisResponse> {
  return registryRequest<AnalyticsKpisResponse>("/analytics/kpis");
}

export async function getBlockchainMetrics(params?: {
  circuit_id?: string;
  days?: number;
}): Promise<BlockchainMetricsResponse> {
  return registryRequest<BlockchainMetricsResponse>(
    `/analytics/blockchain/metrics${buildQueryString(params as Record<string, any>)}`
  );
}
