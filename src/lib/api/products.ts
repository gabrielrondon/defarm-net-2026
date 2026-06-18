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

// "Minhas DDS" (fase 2): consultar emissões já feitas é GRÁTIS.
export interface EudrEmissionSummary {
  id: string;
  dfid: string;
  eudr_ready: boolean;
  charged_credits: number;
  emitted_at: string;
}
export interface EudrEmissionDetail extends EudrEmissionSummary {
  statement: EudrStatement;
}
export function listEudrEmissions(): Promise<EudrEmissionSummary[]> {
  return registryRequest<EudrEmissionSummary[]>("/eudr/emissions");
}
export function getEudrEmission(id: string): Promise<EudrEmissionDetail> {
  return registryRequest<EudrEmissionDetail>(`/eudr/emissions/${encodeURIComponent(id)}`);
}

// Export PLENO (Fase 2): identidade CRUA do operador, pro documento formal (TRACES).
// O backend só devolve cru a admin/autoridade/enriquecedor (senão 403). operator_full
// vem null quando o snapshot não tem operador resolvido.
export interface EudrRawParty {
  identifier_type: string;
  identifier: string;
  role: string;
  car: string | null;
}
export interface EudrFullExport {
  id: string;
  dfid: string;
  emitted_at: string;
  eudr_ready: boolean;
  statement: EudrStatement;
  operator_full: EudrRawParty | null;
  previous_parties_full: EudrRawParty[];
  authorized_level: string;
}
export function getEudrEmissionFull(id: string): Promise<EudrFullExport> {
  return registryRequest<EudrFullExport>(`/eudr/emissions/${encodeURIComponent(id)}/full`);
}

// Saldo de créditos do workspace logado (GET /partner/usage) — pro chip de saldo.
export interface PartnerUsage {
  balance_remaining: number;
  tokenizations_total: number;
  tokenizations_today: number;
  tokenizations_month: number;
  holds_pending: number;
}
export function getPartnerUsage(): Promise<PartnerUsage> {
  return registryRequest<PartnerUsage>("/partner/usage");
}

// Verificação PÚBLICA da DDS (sem login): terceiro confere a última emissão por DFID.
export interface EudrPublicVerify {
  dfid: string;
  found: boolean;
  emitted_at: string | null;
  eudr_ready: boolean;
  statement: EudrStatement | null; // snapshot datado (operador já mascarado)
}
export function verifyEudrPublic(dfid: string): Promise<EudrPublicVerify> {
  return registryPublicRequest<EudrPublicVerify>(`/eudr/verify/${encodeURIComponent(dfid)}`);
}
