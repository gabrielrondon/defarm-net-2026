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
// Trilho de due diligence real (DeFarm Check API) — uma linha por fonte verificada.
export interface EudrCheck {
  source: string;
  category: string | null;
  status: string; // PASS | FAIL | WARNING | ERROR | NOT_APPLICABLE | UNKNOWN
  severity: string | null;
  message: string | null;
  data_source: string | null;
  url: string | null;
  last_update: string | null;
}
export interface EudrDueDiligence {
  identifier_type: string; // CAR | CNPJ | CPF
  identifier: string;
  verdict: string | null; // COMPLIANT | NON_COMPLIANT | PARTIAL | UNKNOWN
  score: number | null;
  checks: EudrCheck[];
  queried_at: string;
  error: string | null;
}
export interface EudrOperator {
  identifier_type: string; // cnpj | cpf
  identifier: string;
  role: string; // operator | owner
}
export interface EudrStatement {
  dfid: string;
  identity: EudrIdentity;
  origin: EudrOrigin[];
  operator: EudrOperator | null;
  due_diligence: EudrDueDiligence[];
  due_diligence_available: boolean;
  due_diligence_note: string;
  immutability: EudrImmutability;
  eudr_ready: boolean;
  generated_at: string;
  note: string;
}

export function getEudrStatement(dfid: string): Promise<EudrStatement> {
  return registryRequest<EudrStatement>(`/eudr/statement${buildQueryString({ dfid })}`);
}

// Emitir DDS EUDR (produto pago, T2 fase 1): POST /eudr/emit consome créditos do
// workspace e persiste a emissão datada. emitted=false quando sem saldo / não
// provisionado / inativo → frontend mostra o funil de créditos.
export interface EudrEmitResponse {
  emitted: boolean;
  reason: string | null; // insufficient_credits | not_provisioned | inactive
  charged_credits: number;
  balance_remaining: number | null;
  emission_id: string | null;
  emitted_at: string | null;
  statement: EudrStatement | null;
}
export function emitEudr(dfid: string): Promise<EudrEmitResponse> {
  return registryRequest<EudrEmitResponse>(`/eudr/emit${buildQueryString({ dfid })}`, { method: "POST" });
}
