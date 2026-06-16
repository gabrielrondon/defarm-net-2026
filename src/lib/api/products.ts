import { registryRequest, registryPublicRequest, buildQueryString } from "./client";

// Contadores públicos da rede (home / TrustModel) — GET /api/stats (sem auth, cacheado no backend).
export interface NetworkStats {
  dfids: number;
  events: number;
  anchors_confirmed: number;
}
export function getNetworkStats(): Promise<NetworkStats> {
  return registryPublicRequest<NetworkStats>("/stats");
}

// Produtos-API do #112 (consumidos pelas telas Score e EUDR). Ambos exigem JWT
// (registryRequest adiciona o Bearer); o gateway normaliza /v1 -> /api.

export interface ScoreFactors {
  items_count: number;
  attestations: number;
  seals: number;
  movements: number;
  avg_trust: number;
}
export interface ScoreResponse {
  query_type: string;
  query_value: string;
  factors: ScoreFactors;
  score: number;
  band: string;
  note: string;
}

export function getScore(params: { dfid?: string; cpf?: string; ccir?: string }): Promise<ScoreResponse> {
  return registryRequest<ScoreResponse>(`/score${buildQueryString(params)}`);
}

export interface EudrCompliance {
  status: string;
  score: number | null;
  summary?: string | null;
}
export interface EudrOrigin {
  car: string;
  compliance: EudrCompliance | null;
  polygon: { type?: string; coordinates?: number[][][] } | null;
  polygon_source: string | null;
  area_ha: number | null;
}
export interface EudrImmutability {
  latest_cid: string | null;
  anchor_tx: string | null;
  anchor_status: string | null;
  chain: string | null;
}
export interface EudrIdentity {
  value_chain: string;
  country: string;
  year: number;
  status: string;
}
export interface EudrStatement {
  dfid: string;
  identity: EudrIdentity;
  origin: EudrOrigin[];
  immutability: EudrImmutability;
  eudr_ready: boolean;
  generated_at: string;
  note: string;
}

export function getEudrStatement(dfid: string): Promise<EudrStatement> {
  return registryRequest<EudrStatement>(`/eudr/statement${buildQueryString({ dfid })}`);
}
