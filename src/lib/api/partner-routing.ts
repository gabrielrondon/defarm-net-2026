import { buildQueryString, registryFileRequest, registryPublicRequest, registryRequest } from "./client";

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
  item_links?: {
    item_id: string;
    dfid: string;
    circuit_id: string;
    app_url: string;
    public_url: string;
    identifiers: {
      identifier_type: string;
      value: string;
      is_canonical: boolean;
    }[];
    input_references: {
      field: string;
      value: string;
    }[];
  }[];
}

export interface PartnerIntakeResponse {
  raw_payload_id: string;
  source_circuit_id?: string | null;
  workspace_id: string;
  total_rows: number;
  routed_batches: IntakeBatchResult[];
  unresolved_rows: number;
  created_circuits: string[];
  circuit_links?: {
    circuit_id: string;
    app_url: string;
    public_url: string;
  }[];
  status: string;
}

export interface PartnerIntakePreviewPlanItem {
  identifier_type: string;
  identifier_value: string;
  identifier_value_normalized: string;
  rows: number;
  circuit_id?: string | null;
  status: "routed_existing" | "would_auto_create" | "unresolved";
  reason?: string | null;
}

export interface PartnerIntakePreviewResponse {
  source_circuit_id: string;
  workspace_id: string;
  total_rows: number;
  resolvable_rows: number;
  unresolved_rows: number;
  matched_rows: number;
  would_auto_create_rows: number;
  unresolved_identifiers: {
    identifier_type: string;
    identifier_value: string;
    reason: string;
  }[];
  routing_plan: PartnerIntakePreviewPlanItem[];
}

export interface RoutingIssueSummary {
  identifier_type: string;
  identifier_value: string;
  occurrences: number;
}

export interface RoutingIssuesResponse {
  issues: RoutingIssueSummary[];
  count: number;
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
  sourceCircuitId?: string,
  autoCreateCircuit = true
): Promise<PartnerIntakeResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (sourceCircuitId) {
    formData.append("source_circuit_id", sourceCircuitId);
  }
  formData.append("auto_create_circuit", autoCreateCircuit ? "true" : "false");

  return registryRequest<PartnerIntakeResponse>("/partner/upload", {
    method: "POST",
    headers: {},
    body: formData as unknown as BodyInit,
  });
}

export async function partnerIntakePreview(
  file: File,
  sourceCircuitId?: string,
  autoCreateCircuit = true
): Promise<PartnerIntakePreviewResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (sourceCircuitId) {
    formData.append("source_circuit_id", sourceCircuitId);
  }
  formData.append("auto_create_circuit", autoCreateCircuit ? "true" : "false");

  return registryRequest<PartnerIntakePreviewResponse>("/partner/upload/preview", {
    method: "POST",
    headers: {},
    body: formData as unknown as BodyInit,
  });
}

function inferExtension(contentType?: string, blobType?: string): string {
  const ct = (contentType || blobType || "").toLowerCase();
  if (ct.includes("json")) return "json";
  if (ct.includes("csv")) return "csv";
  return "txt";
}

export async function downloadRawPayload(
  id: string,
  options?: { suggestedFileName?: string | null; contentType?: string | null }
): Promise<{ blob: Blob; fileName: string }> {
  const response = await registryFileRequest(`/partner/ingestion/raw/${id}/download`);
  const blob = await response.blob();
  const contentDisposition = response.headers.get("content-disposition") || "";
  const fileNameMatch = contentDisposition.match(/filename=\"?([^\";]+)\"?/i);
  const fallbackExt = inferExtension(options?.contentType || undefined, blob.type);
  const fallbackName =
    options?.suggestedFileName && options.suggestedFileName.trim().length > 0
      ? options.suggestedFileName
      : `payload-${id}.${fallbackExt}`;

  return {
    blob,
    fileName: fileNameMatch?.[1] || fallbackName,
  };
}

export async function listRoutingIssues(): Promise<RoutingIssuesResponse> {
  return registryRequest<RoutingIssuesResponse>("/partner/ingestion/issues");
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
