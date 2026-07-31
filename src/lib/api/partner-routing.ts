import { buildQueryString, registryFileRequest, registryPublicRequest, registryRequest } from "./client";
import type { Circuit } from "./types";

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
  created_by?: string | null;
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
  /** Cursor da próxima página (created_at do último item). Ausente/null = fim. */
  next_cursor?: string | null;
}

export interface PublicRawPayloadReceiptResponse {
  verified: boolean;
  verification_method: string;
  payload: {
    id: string;
    workspace_id: string;
    file_name?: string | null;
    status: string;
    payload_size_bytes: number;
    payload_sha256: string;
    created_at: string;
    processed_at?: string | null;
  };
  result: {
    total_rows?: number | null;
    processed_rows?: number | null;
    items_returned: number;
    items_created?: number | null;
    items_enriched?: number | null;
    routes?: number | null;
    errors: number;
  };
  items: Array<{
    dfid?: string | null;
    url?: string | null;
    resolution_result?: string | null;
    matched_existing_item?: boolean | null;
  }>;
  errors: Array<{
    reason_code?: string | null;
    message?: string | null;
  }>;
}

export interface IntakeBatchResult {
  identifier_type: string;
  identifier_value: string;
  circuit_id?: string | null;
  rows: number;
  receipt_id?: string | null;
  status: string;
  error_message?: string | null;
}

export interface PartnerIntakeResponse {
  dry_run?: boolean | null;
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
    events_detected?: number | null;
    partner_reference?: {
      field: string;
      value: string;
    } | null;
    warnings?: string[];
  };
  items: {
    dfid?: string | null;
    url?: string | null;
    partner_reference?: string | null;
    asset_reference?: {
      identifier_type: string;
      value: string;
    } | null;
    url_refs?: Record<string, string> | null;
    would_create?: boolean | null;
    events_preview?:
      | {
          event_type: string;
          payload: unknown;
        }[]
      | null;
    routes: {
      route_type: string;
      route_value: string;
      circuit_id?: string | null;
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
    circuit_id?: string | null;
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
  /** Escopo explícito de DFIDs — obrigatório e não-vazio no backend: o link só
   *  expõe estes itens (por design, não dá pra usá-lo pra contar o rebanho). */
  item_ids: string[];
  expires_in_minutes?: number;
  /** Rótulo pro trilho de auditoria (ex.: "Frigorífico X"). */
  audience?: string | null;
}

export interface CreateEmbedTokenResponse {
  id: string;
  /** Mostrado uma única vez — o servidor guarda só o hash. */
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

export interface DefaultCircuitResponse {
  circuit_id: string;
  name: string;
  is_staging: boolean;
  // Backend serializa em snake_case; mantemos string ampla por robustez.
  source: "api_key_metadata" | "partner_staging_flag" | "fallback" | "workspace_setting" | string;
  workspace_id: string;
  changed: boolean;
}

export async function getPartnerDefaultCircuit(): Promise<DefaultCircuitResponse> {
  return registryRequest<DefaultCircuitResponse>("/partner/default-circuit");
}

export async function updatePartnerDefaultCircuit(circuitId: string): Promise<DefaultCircuitResponse> {
  return registryRequest<DefaultCircuitResponse>("/partner/default-circuit", {
    method: "PUT",
    body: JSON.stringify({ circuit_id: circuitId }),
  });
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
  workspaceId?: string,
  before?: string
): Promise<ListRawPayloadsResponse> {
  return registryRequest<ListRawPayloadsResponse>(
    `/partner/ingestions/raw${buildQueryString({ limit, workspace_id: workspaceId, before })}`
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

function buildJsonIntakeBody(
  payload: unknown,
  options?: {
    sourceCircuitId?: string;
    autoCreateCircuit?: boolean;
    templateId?: string;
    inlineMapping?: Record<string, unknown>;
  }
): unknown {
  const autoCreate = options?.autoCreateCircuit ?? true;
  const base =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? { ...(payload as Record<string, unknown>) }
      : { items: Array.isArray(payload) ? payload : [] };

  if (options?.sourceCircuitId) {
    base.source_circuit_id = options.sourceCircuitId;
  }
  base.auto_create_circuit = autoCreate;
  if (options?.templateId) {
    base.template_id = options.templateId;
  }
  if (options?.inlineMapping && Object.keys(options.inlineMapping).length > 0) {
    base.mapping = options.inlineMapping;
  }
  return base;
}

export async function partnerIntakeJson(
  payload: unknown,
  options?: {
    sourceCircuitId?: string;
    autoCreateCircuit?: boolean;
    templateId?: string;
    inlineMapping?: Record<string, unknown>;
  }
): Promise<PartnerIntakeResponse> {
  return registryRequest<PartnerIntakeResponse>("/partner/ingestions", {
    method: "POST",
    body: JSON.stringify(buildJsonIntakeBody(payload, options)),
  });
}

export async function partnerIntakePreview(
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

  return registryRequest<PartnerIntakeResponse>("/partner/ingestions/preview", {
    method: "POST",
    headers: {},
    body: formData as unknown as BodyInit,
  });
}

export async function partnerIntakePreviewJson(
  payload: unknown,
  options?: {
    sourceCircuitId?: string;
    autoCreateCircuit?: boolean;
    templateId?: string;
    inlineMapping?: Record<string, unknown>;
  }
): Promise<PartnerIntakeResponse> {
  return registryRequest<PartnerIntakeResponse>("/partner/ingestions/preview", {
    method: "POST",
    body: JSON.stringify(buildJsonIntakeBody(payload, options)),
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
  const fileNameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
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

export async function getPublicRawPayloadReceipt(
  id: string,
  sha256: string
): Promise<PublicRawPayloadReceiptResponse> {
  return registryPublicRequest<PublicRawPayloadReceiptResponse>(
    `/partner/ingestions/raw/${encodeURIComponent(id)}/receipt/public${buildQueryString({ sha256 })}`
  );
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

export async function revokeEmbedToken(id: string): Promise<void> {
  return registryRequest<void>(`/embed/tokens/${id}/revoke`, { method: "POST" });
}

export async function getEmbedPortfolio(token: string): Promise<EmbedPortfolioResponse> {
  return registryPublicRequest<EmbedPortfolioResponse>(`/embed/portfolio${buildQueryString({ token })}`);
}
