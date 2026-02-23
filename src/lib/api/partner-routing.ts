import { buildQueryString, registryPublicRequest, registryRequest } from "./client";

export interface RoutingRule {
  id: string;
  workspace_id: string;
  identifier_type: string;
  identifier_value: string;
  identifier_value_normalized: string;
  circuit_id: string;
  is_active: boolean;
  auto_created: boolean;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertRoutingRuleRequest {
  identifier_type: "car" | "cnpj" | "cpf" | "incra" | "nirf" | "land_dfid";
  identifier_value: string;
  circuit_id: string;
  notes?: string;
}

export interface RawPayloadSummary {
  id: string;
  workspace_id: string;
  source_circuit_id?: string | null;
  intake_mode: string;
  content_type?: string | null;
  file_name?: string | null;
  payload_size_bytes: number;
  payload_sha256: string;
  status: string;
  error_message?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  processed_at?: string | null;
}

export interface ListRawPayloadsResponse {
  rows: RawPayloadSummary[];
  count: number;
}

export interface IntakeBatchResult {
  identifier_type: string;
  identifier_value: string;
  circuit_id: string;
  rows: number;
  receipt_id?: string | null;
  status: string;
  error_message?: string | null;
}

export interface PartnerIntakeResponse {
  raw_payload_id: string;
  source_circuit_id: string;
  workspace_id: string;
  total_rows: number;
  routed_batches: IntakeBatchResult[];
  unresolved_rows: number;
  created_circuits: string[];
  status: string;
}

export interface CreateEmbedTokenRequest {
  circuit_id: string;
  expires_in_minutes?: number;
}

export interface CreateEmbedTokenResponse {
  token: string;
  expires_at: string;
  embed_url: string;
}

export interface EmbedEventProof {
  id: string;
  event_type: string;
  item_id?: string | null;
  created_at: string;
  stellar_tx_hash?: string | null;
  ipfs_cid?: string | null;
}

export interface EmbedPortfolioResponse {
  portfolio: {
    circuit: Record<string, unknown>;
    stats: Record<string, unknown>;
    recent_items: Record<string, unknown>[];
  };
  recent_event_proofs: EmbedEventProof[];
}

export async function listRoutingRules(identifierType?: string): Promise<RoutingRule[]> {
  const query = buildQueryString(identifierType ? { identifier_type: identifierType } : undefined);
  return registryRequest<RoutingRule[]>(`/partner/routing-rules${query}`);
}

export async function upsertRoutingRule(data: UpsertRoutingRuleRequest): Promise<RoutingRule> {
  return registryRequest<RoutingRule>("/partner/routing-rules", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteRoutingRule(id: string): Promise<void> {
  await registryRequest<void>(`/partner/routing-rules/${id}`, {
    method: "DELETE",
  });
}

export async function listRawPayloads(limit = 50): Promise<ListRawPayloadsResponse> {
  return registryRequest<ListRawPayloadsResponse>(`/partner/ingestion/raw${buildQueryString({ limit })}`);
}

export async function partnerIntake(
  file: File,
  sourceCircuitId: string,
  autoCreateCircuit = true
): Promise<PartnerIntakeResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("source_circuit_id", sourceCircuitId);
  formData.append("auto_create_circuit", autoCreateCircuit ? "true" : "false");

  return registryRequest<PartnerIntakeResponse>("/partner/ingestion/intake", {
    method: "POST",
    headers: {},
    body: formData as unknown as BodyInit,
  });
}

export async function createEmbedToken(
  data: CreateEmbedTokenRequest
): Promise<CreateEmbedTokenResponse> {
  return registryRequest<CreateEmbedTokenResponse>("/embed/tokens", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getEmbedPortfolio(token: string): Promise<EmbedPortfolioResponse> {
  return registryPublicRequest<EmbedPortfolioResponse>(`/embed/portfolio${buildQueryString({ token })}`);
}
