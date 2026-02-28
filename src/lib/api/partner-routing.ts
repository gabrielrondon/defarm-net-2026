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
  identifier_type:
    | "car"
    | "ccir"
    | "incra"
    | "nirf"
    | "cib"
    | "matricula"
    | "georef"
    | "land_dfid"
    | "inscricao_estadual"
    | "cnpj"
    | "cpf";
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
  summary: {
    status: string;
    total_rows: number;
    processed_rows: number;
    unresolved_rows: number;
    routes: number;
    items: number;
    created_circuits: number;
    impacted_circuits: number;
    items_created: number;
    items_enriched: number;
    partner_reference?: {
      field: string;
      value: string;
    } | null;
    warnings?: string[];
  };
  items: {
    dfid: string;
    url: string;
    partner_reference?: string | null;
    asset_reference?: {
      identifier_type: string;
      value: string;
    } | null;
    url_refs?: Record<string, string> | null;
    routes: {
      route_type: string;
      route_value: string;
      circuit_id: string;
    }[];
  }[];
  errors: {
    row_index?: number | null;
    partner_reference?: string | null;
    reason_code: string;
    message: string;
    value_chain?: string | null;
    identifier_type?: string | null;
    identifier_value?: string | null;
  }[];
  routes: {
    route_type: string;
    route_value: string;
    circuit_id: string;
    rows: number;
    status: string;
    items: number;
  }[];
  verbose?: {
    raw_payload_id: string;
    source_circuit_id?: string | null;
    workspace_id: string;
    total_rows: number;
    unresolved_rows: number;
    routed_batches: IntakeBatchResult[];
    created_circuits: string[];
    circuit_links?: {
      circuit_id: string;
      app_url: string;
      public_url: string;
      is_public?: boolean;
    }[];
    status: string;
  } | null;
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

export interface RoutingIssueItem {
  id: string;
  workspace_id: string;
  raw_payload_id?: string | null;
  source_circuit_id?: string | null;
  identifier_type: string;
  identifier_value: string;
  reason: string;
  severity: "low" | "medium" | "high";
  status: "open" | "in_review" | "resolved" | "rejected";
  occurrences: number;
  reported_by?: string | null;
  assigned_to?: string | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
  resolution_action?: string | null;
  resolution_notes?: string | null;
  resolved_rule_id?: string | null;
  first_seen_at: string;
  last_seen_at: string;
  updated_at: string;
  can_resolve: boolean;
}

export interface RoutingIssueItemsResponse {
  issues: RoutingIssueItem[];
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

export async function listRawPayloads(
  limit = 50,
  workspaceId?: string
): Promise<ListRawPayloadsResponse> {
  return registryRequest<ListRawPayloadsResponse>(
    `/partner/ingestions/raw${buildQueryString({ limit, workspace_id: workspaceId })}`
  );
}

export async function partnerIntake(
  file: File,
  sourceCircuitId?: string,
  autoCreateCircuit = true,
  templateId?: string,
  inlineMapping?: Record<string, unknown>
): Promise<PartnerIntakeResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (sourceCircuitId) {
    formData.append("source_circuit_id", sourceCircuitId);
  }
  formData.append("auto_create_circuit", autoCreateCircuit ? "true" : "false");
  if (templateId) {
    formData.append("template_id", templateId);
  }
  if (inlineMapping && Object.keys(inlineMapping).length > 0) {
    formData.append("mapping", JSON.stringify(inlineMapping));
  }

  return registryRequest<PartnerIntakeResponse>("/partner/ingestions", {
    method: "POST",
    headers: {},
    body: formData as unknown as BodyInit,
  });
}

export async function partnerIntakePreview(
  file: File,
  sourceCircuitId?: string,
  autoCreateCircuit = true,
  templateId?: string,
  inlineMapping?: Record<string, unknown>
): Promise<PartnerIntakePreviewResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (sourceCircuitId) {
    formData.append("source_circuit_id", sourceCircuitId);
  }
  formData.append("auto_create_circuit", autoCreateCircuit ? "true" : "false");
  if (templateId) {
    formData.append("template_id", templateId);
  }
  if (inlineMapping && Object.keys(inlineMapping).length > 0) {
    formData.append("mapping", JSON.stringify(inlineMapping));
  }

  return registryRequest<PartnerIntakePreviewResponse>("/partner/ingestions/preview", {
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
  const response = await registryFileRequest(`/partner/ingestions/raw/${id}/download`);
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
  return registryRequest<RoutingIssuesResponse>("/partner/ingestions/issues");
}

export async function listRoutingIssueItems(params?: {
  status?: string;
  assigned_to_me?: boolean;
  limit?: number;
}): Promise<RoutingIssueItemsResponse> {
  const query = buildQueryString(params);
  return registryRequest<RoutingIssueItemsResponse>(`/partner/ingestions/issues/items${query}`);
}

export async function assignRoutingIssue(
  issueId: string,
  payload?: { assigned_to_user_id?: string | null }
): Promise<{ message: string; issue_id: string; status: string }> {
  return registryRequest(`/partner/ingestions/issues/${issueId}/assign`, {
    method: "PATCH",
    body: JSON.stringify(payload ?? {}),
  });
}

export async function resolveRoutingIssue(
  issueId: string,
  payload: {
    resolution_action: string;
    resolution_notes?: string;
    create_rule?: boolean;
    circuit_id?: string;
  }
): Promise<{ message: string; issue_id: string; status: string }> {
  return registryRequest(`/partner/ingestions/issues/${issueId}/resolve`, {
    method: "PUT",
    body: JSON.stringify(payload),
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
