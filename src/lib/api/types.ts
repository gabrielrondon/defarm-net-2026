// ==========================================
// Types from DeFarm Item Registry OpenAPI 3.0
// Via Gateway: gateway-service-production-f54d.up.railway.app
// ==========================================

// --- Items ---

export interface Item {
  id: string;
  dfid: string;
  value_chain: string;
  /** O que o DFID representa (animal | commodity | lot | property | ...). Exposto
   *  pelo engine (ItemResponse.artifact_type); guia o render-by-type. Pode ser null
   *  em itens antigos não classificados. */
  artifact_type?: string | null;
  country: string;
  year: number;
  status: string;
  registered_at: string;
  last_updated_at: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown> | null;
  local_id?: string | null;
  merged_into?: string | null;
  split_from?: string | null;
  archived_at?: string | null;
}

export interface ListItemsResponse {
  items: Item[];
  count: number;
}

export interface CreateItemRequest {
  value_chain: string;
  country: string;
  year: number;
  circuit_id?: string | null;
  metadata?: Record<string, unknown> | null;
  identifiers?: IdentifierInput[] | null;
  user_id?: string | null;
  ip_address?: string | null;
}

export interface IdentifierInput {
  identifier_type: string;
  value: string;
  is_canonical?: boolean | null;
}

export interface IdentifierResponse {
  identifier_type: string;
  value: string;
  is_canonical: boolean;
}

/**
 * T3 (esqueleto×carne): per-field provenance of the composed item metadata,
 * returned only when the item is fetched with `?include=provenance`. Keyed by the
 * SAME field names as `item.metadata`; each value names the contribution that won
 * that field. `origin: "legacy"` for the unprovenanced legacy blob; otherwise the
 * winning layer's author/trust/visibility. Resolve `source_workspace_id` to a name
 * via `getPublicWorkspace` (never show the raw UUID).
 */
export interface FieldProvenance {
  origin?: "legacy";
  source_workspace_id?: string;
  source_circuit_id?: string;
  trust_level?: string | null;
  visibility?: string;
  via?: "own" | "public" | "feed";
  updated_at?: string;
}

export interface ItemDetailsResponse {
  item: Item;
  identifiers: IdentifierResponse[];
  canonical_identifier?: IdentifierResponse | null;
  events: Event[];
  /** Present only when fetched with `?include=provenance`. */
  provenance?: Record<string, FieldProvenance> | null;
}

export interface CreateItemResponse {
  item: Item;
  identifiers: IdentifierResponse[];
  canonical_identifier?: IdentifierResponse | null;
  events: Event[];
  was_deduplicated: boolean;
}

export interface UpdateItemRequest {
  metadata: Record<string, unknown>;
  circuit_id?: string;
  user_id?: string | null;
  ip_address?: string | null;
}

export interface UpdateItemStatusRequest {
  status: string;
  circuit_id?: string;
  user_id?: string | null;
  ip_address?: string | null;
}

// --- Circuits ---

export interface Circuit {
  id: string;
  name: string;
  circuit_type: string;
  visibility: string;
  owner_id: string;
  status: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  is_published: boolean;
  discovery_enabled: boolean;
  searchable: boolean;
  featured: boolean;
  view_count: number;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  organization_id?: string | null;
  settings?: Record<string, unknown> | null;
  slug?: string | null;
  archived_at?: string | null;
  published_at?: string | null;
  published_by?: string | null;
  unpublished_at?: string | null;
  public_banner_url?: string | null;
  public_contact_email?: string | null;
  public_description?: string | null;
  public_logo_url?: string | null;
  public_slug?: string | null;
  public_website?: string | null;
  allow_join_requests?: boolean | null;
  requires_terms_acceptance?: boolean;
}

export interface ListCircuitsResponse {
  circuits: Circuit[];
  count: number;
}

export interface CreateCircuitRequest {
  name: string;
  circuit_type: string;
  visibility: string;
  owner_id: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  settings?: Record<string, unknown> | null;
  organization_id?: string | null;
  discovery_enabled?: boolean | null;
  searchable?: boolean | null;
  allow_join_requests?: boolean | null;
  public_slug?: string | null;
  public_description?: string | null;
  public_contact_email?: string | null;
  public_website?: string | null;
  public_logo_url?: string | null;
  public_banner_url?: string | null;
  user_id?: string | null;
  ip_address?: string | null;
}

export interface CircuitTerm {
  id: string;
  circuit_id?: string | null;
  version: number;
  title: string;
  body: string;
  body_hash: string;
  policy_version?: string | null;
  material: boolean;
  is_current: boolean;
  created_by?: string | null;
  created_at: string;
  superseded_at?: string | null;
}

export interface PublishCircuitTermRequest {
  title: string;
  body: string;
  policy_version?: string | null;
  material: boolean;
}

export interface CircuitTermAcceptance {
  id: string;
  circuit_id: string;
  user_id: string;
  term_id: string;
  term_version: number;
  term_hash: string;
  accepted_at: string;
  accepted_via: string;
  invitation_id?: string | null;
  join_request_id?: string | null;
}

export interface UpdateCircuitRequest {
  name?: string | null;
  description?: string | null;
  status?: string | null;
  visibility?: string | null;
  metadata?: Record<string, unknown> | null;
  settings?: Record<string, unknown> | null;
  discovery_enabled?: boolean | null;
  searchable?: boolean | null;
  allow_join_requests?: boolean | null;
  public_slug?: string | null;
  public_description?: string | null;
  public_contact_email?: string | null;
  public_website?: string | null;
  public_logo_url?: string | null;
  public_banner_url?: string | null;
  requires_terms_acceptance?: boolean | null;
  user_id?: string | null;
  ip_address?: string | null;
}

export interface AddItemToCircuitRequest {
  role?: string;
  added_by?: string | null;
  circuit_metadata?: Record<string, unknown> | null;
}

export interface AddItemsToCircuitBulkRequest {
  item_ids: string[];
  role?: string;
  added_by?: string | null;
  circuit_metadata?: Record<string, unknown> | null;
}

// --- Circuit Members ---

export interface CircuitMember {
  id?: string;
  circuit_id: string;
  user_id: string;
  role: string;
  status?: string;
  joined_at: string;
  created_at?: string;
  updated_at: string;
  permissions?: Record<string, unknown> | null;
  custom_permissions?: Record<string, unknown> | null;
  removed_at?: string | null;
}

export interface AddMemberRequest {
  user_id: string;
  role: string;
  added_by?: string | null;
  permissions?: Record<string, unknown> | null;
}

export interface UpdateMemberRequest {
  role?: string | null;
  permissions?: Record<string, unknown> | null;
  updated_by?: string | null;
}

export interface ListMembersResponse {
  members: CircuitMember[];
  count: number;
}

// --- Events ---

export interface Event {
  id: string;
  event_type: string;
  source_type: string;
  source_id: string;
  payload: Record<string, unknown>;
  status: string;
  created_at: string;
  visibility?: string;
  is_duplicate?: boolean;
  circuit_id?: string | null;
  error_message?: string | null;
  item_id?: string | null;
  metadata?: Record<string, unknown> | null;
  processed_at?: string | null;
  user_id?: string | null;
  content_hash?: string | null;
  original_event_id?: string | null;
  visible_to_roles?: Record<string, unknown> | null;
  event_owner_workspace_id?: string | null;
  event_owner_user_id?: string | null;
  trust_score?: number;
  trust_level?: "low" | "medium" | "high" | string;
  trust_factors?: Record<string, unknown> | null;
  trust_model_version?: string | null;
}

export interface ListEventsResponse {
  events: Event[];
  count: number;
}

export interface UpdateEventStatusRequest {
  status: string;
  error_message?: string | null;
}

export interface UpdateEventVisibilityRequest {
  visibility: "public" | "private" | "circuit_only" | "selective" | string;
  visible_to_roles?: string[] | null;
}

export interface GrantEventDelegationRequest {
  delegate_workspace_id: string;
  can_manage_visibility?: boolean;
  can_manage_disclosure?: boolean;
  notes?: string | null;
  expires_at?: string | null;
}

export interface EventDelegation {
  id: string;
  event_id: string;
  owner_workspace_id: string;
  delegate_workspace_id: string;
  granted_by_user_id?: string | null;
  can_manage_visibility: boolean;
  can_manage_disclosure: boolean;
  notes?: string | null;
  created_at: string;
  expires_at?: string | null;
  revoked_at?: string | null;
  revoked_by_user_id?: string | null;
}

export interface EventGovernanceResponse {
  event_id: string;
  event_owner_workspace_id?: string | null;
  event_owner_user_id?: string | null;
  caller_can_manage_visibility: boolean;
  caller_can_manage_disclosure: boolean;
  delegations: EventDelegation[];
}

// --- Activity ---

export interface ActivityFeed {
  id: string;
  actor_id: string;
  action: string;
  resource_type: string;
  description: string;
  is_public: boolean;
  created_at: string;
  actor_name?: string | null;
  circuit_id?: string | null;
  metadata?: Record<string, unknown> | null;
  resource_id?: string | null;
  resource_name?: string | null;
}

export interface RecentActivity {
  id: string;
  user_id: string;
  activity_type: string;
  activity_count: number;
  last_activity_at: string;
  created_at: string;
  circuit_id?: string | null;
}

export interface ActivitySummary {
  id: string;
  summary_date: string;
  summary_type: string;
  action_counts: Record<string, unknown>;
  resource_counts: Record<string, unknown>;
  created_at: string;
  circuit_id?: string | null;
  user_id?: string | null;
}

export interface CreateActivityInput {
  actor_id: string;
  action: string;
  resource_type: string;
  description: string;
  is_public?: boolean;
  actor_name?: string | null;
  circuit_id?: string | null;
  metadata?: Record<string, unknown> | null;
  resource_id?: string | null;
  resource_name?: string | null;
}

// --- Audit ---

export interface AuditLog {
  id: string;
  action: string;
  resource_type: string;
  created_at: string;
  changes?: Record<string, unknown> | null;
  circuit_id?: string | null;
  hash?: string | null;
  metadata?: Record<string, unknown> | null;
  previous_hash?: string | null;
  resource_id?: string | null;
  user_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

export interface ListAuditLogsResponse {
  logs: AuditLog[];
  count: number;
}

export interface HashChainVerificationResponse {
  valid: boolean;
  logs_checked: number;
  message: string;
}

// --- Webhooks ---

export interface Webhook {
  id: string;
  circuit_id: string;
  name: string;
  url: string;
  events: unknown;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  headers?: Record<string, unknown> | null;
  retry_config?: WebhookRetryConfig | null;
  secret?: string | null;
}

export interface CreateWebhookInput {
  circuit_id: string;
  name: string;
  url: string;
  events: string[];
  created_by: string;
  headers?: Record<string, unknown> | null;
  retry_config?: WebhookRetryConfig | null;
  secret?: string | null;
}

export interface UpdateWebhookInput {
  name?: string | null;
  url?: string | null;
  events?: string[] | null;
  is_active?: boolean | null;
  headers?: Record<string, unknown> | null;
  retry_config?: WebhookRetryConfig | null;
  secret?: string | null;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_id: string;
  attempt_number: number;
  status: string;
  request_body: unknown;
  created_at: string;
  delivered_at?: string | null;
  error_message?: string | null;
  next_retry_at?: string | null;
  request_headers?: Record<string, unknown> | null;
  response_body?: string | null;
  response_headers?: Record<string, unknown> | null;
  response_status_code?: number | null;
}

export interface WebhookRetryConfig {
  max_retries: number;
  retry_delay: number;
}

export interface WebhookStats {
  webhook_id: string;
  total_deliveries: number;
  successful_deliveries: number;
  failed_deliveries: number;
  updated_at: string;
  average_response_time_ms?: number | null;
  last_delivery_at?: string | null;
  last_failure_at?: string | null;
  last_success_at?: string | null;
}

// --- Snapshots ---

export interface Snapshot {
  id: string;
  snapshot_type: string;
  resource_type: string;
  snapshot_name: string;
  snapshot_data: unknown;
  created_by: string;
  created_at: string;
  is_archived: boolean;
  checksum: string;
  description?: string | null;
  circuit_id?: string | null;
  resource_id?: string | null;
  metadata?: Record<string, unknown> | null;
  archived_at?: string | null;
  expires_at?: string | null;
}

export interface ListSnapshotsResponse {
  snapshots: Snapshot[];
  count: number;
}

export interface CreateSnapshotRequest {
  snapshot_type: string;
  resource_type: string;
  snapshot_name: string;
  snapshot_data: unknown;
  created_by: string;
  description?: string | null;
  circuit_id?: string | null;
  resource_id?: string | null;
  metadata?: Record<string, unknown> | null;
  expires_at?: string | null;
}

export interface ComparisonResponse {
  id: string;
  snapshot_a_id: string;
  snapshot_b_id: string;
  comparison_type: string;
  diff_data: unknown;
  created_at: string;
  summary?: unknown | null;
}

export interface CreateComparisonRequest {
  snapshot_b_id: string;
  comparison_type: string;
}

export interface RestorationResponse {
  id: string;
  snapshot_id: string;
  restored_by: string;
  restoration_type: string;
  status: string;
  created_at: string;
  completed_at?: string | null;
  error_message?: string | null;
  pre_restore_snapshot_id?: string | null;
  restore_metadata?: unknown | null;
  target_resource_id?: string | null;
}

export interface CreateRestorationRequest {
  restored_by: string;
  restoration_type: string;
  pre_restore_snapshot_id?: string | null;
  restore_metadata?: unknown | null;
  target_resource_id?: string | null;
}

export interface UpdateRestorationStatusRequest {
  status: string;
  error_message?: string | null;
}

export interface RetentionPolicyResponse {
  id: string;
  snapshot_type: string;
  retention_days: number;
  auto_archive: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  circuit_id?: string | null;
  max_snapshots?: number | null;
  resource_type?: string | null;
}

export interface ApplyRetentionResponse {
  policy_id: string;
  snapshots_affected: number;
}

// --- Merkle Trees ---

export interface MerkleTree {
  id: string;
  tree_type: string;
  resource_type: string;
  root_hash: string;
  height: number;
  leaf_count: number;
  hash_algorithm: string;
  created_at: string;
  updated_at: string;
  circuit_id?: string | null;
  resource_id?: string | null;
  snapshot_id?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface MerkleNode {
  id: string;
  tree_id: string;
  node_hash: string;
  position: number;
  level: number;
  is_leaf: boolean;
  created_at: string;
  data_hash?: string | null;
  left_child_id?: string | null;
  right_child_id?: string | null;
  parent_id?: string | null;
}

export interface ListMerkleTreesResponse {
  trees: MerkleTree[];
  count: number;
}

export interface CreateMerkleTreeRequest {
  tree_type: string;
  resource_type: string;
  leaf_data: unknown[];
  circuit_id?: string | null;
  resource_id?: string | null;
  snapshot_id?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface MerkleProof {
  id: string;
  tree_id: string;
  leaf_hash: string;
  leaf_data: unknown;
  proof_path: unknown;
  proof_positions: unknown;
  root_hash: string;
  is_valid: boolean;
  created_at: string;
  verified_at?: string | null;
}

export interface GenerateProofRequest {
  leaf_data: unknown;
}

export interface VerificationResponse {
  is_valid: boolean;
  computed_root: string;
  expected_root: string;
}

export interface VerifyProofRequest {
  leaf_hash: string;
  proof_path: string[];
  proof_positions: number[];
  expected_root: string;
}

export interface MerkleVerification {
  id: string;
  tree_id: string;
  verification_type: string;
  leaf_hash: string;
  expected_root: string;
  actual_root: string;
  is_valid: boolean;
  created_at: string;
  error_message?: string | null;
  proof_id?: string | null;
  verification_time_ms?: number | null;
  verified_by?: string | null;
}

export interface VerificationHistoryResponse {
  verifications: MerkleVerification[];
  count: number;
}

// --- Sessions ---

export interface UserSession {
  id: string;
  user_id: string;
  started_at: string;
  last_activity_at: string;
  is_active: boolean;
  ended_at?: string | null;
  ip_address?: string | null;
  session_token?: string | null;
  user_agent?: string | null;
}

// --- Bulk Ingestion ---

export interface IngestionReceipt {
  receipt_id: string;
  status: string;
  processing_time_ms: number;
  summary: IngestionSummary;
  quality?: IngestionQualityReport | null;
  template_id?: string | null;
  idempotency_replay?: boolean | null;
  error_message?: string | null;
}

export interface IngestionQualityReport {
  score: number;
  severity: string;
  warnings: string[];
}

export interface IngestionTemplate {
  id: string;
  workspace_id: string;
  name: string;
  source_hint?: string | null;
  canonical_type?: string | null;
  canonical_column?: string | null;
  mapping: Record<string, unknown>;
  is_default: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface IngestionTemplateUpsertRequest {
  name: string;
  source_hint?: string;
  canonical_type?: string;
  canonical_column?: string;
  mapping: Record<string, unknown>;
  is_default?: boolean;
}

export interface IngestionSummary {
  rows_total: number;
  rows_processed: number;
  rows_failed: number;
  items_created: number;
  items_updated: number;
  events_created: number;
  identifiers_resolved: Record<string, number>;
  unclassified_fields: string[];
}

// --- Circuit Adapters ---

export interface CircuitAdapter {
  id: string;
  circuit_id: string;
  adapter_config_id: string;
  adapter_name: string;
  adapter_type: 'stellar' | 'ipfs' | 'nft';
  is_enabled: boolean;
  auto_publish: boolean;
  trigger_events: string[];
  rate_limit_per_hour?: number | null;
  rate_limit_per_day?: number | null;
}

export interface AddCircuitAdapterRequest {
  adapter_config_id: string;
  auto_publish?: boolean;
  trigger_events?: string[];
  rate_limit_per_hour?: number | null;
  rate_limit_per_day?: number | null;
}

export interface UpdateCircuitAdapterRequest {
  is_enabled?: boolean;
  auto_publish?: boolean;
  trigger_events?: string[];
  rate_limit_per_hour?: number;
  rate_limit_per_day?: number;
}

// --- Admin Canonical Identifiers ---

export interface CanonicalIdentifierResponse {
  id: string;
  value_chain: string;
  identifier_type: string;
  is_active: boolean;
  created_at: string;
}

export interface ValueChainPolicy {
  id: string;
  code: string;
  display_name: string;
  is_active: boolean;
  is_test_only: boolean;
  /** Tipo de artefato padrão da cadeia (animal | commodity | ...). Opcional até o
   *  engine #188 entrar em produção (antes disso o endpoint não retorna o campo). */
  primary_artifact_type?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateValueChainPolicyRequest {
  code: string;
  display_name: string;
  is_active?: boolean;
  is_test_only?: boolean;
}

export interface UpdateValueChainPolicyRequest {
  display_name?: string;
  is_active?: boolean;
  is_test_only?: boolean;
}

export interface CreateCanonicalIdentifierRequest {
  value_chain: string;
  identifier_type: string;
}

export interface UpdateCanonicalIdentifierRequest {
  is_active: boolean;
}

export type TrustLevel = "verified" | "self_reported" | "unverified";

// --- Workflows ---

export interface MergeItemsRequest {
  secondary_dfid: string;
  strategy: string;
  user_id?: string | null;
}

export interface MergeItemsResponse {
  merged_item: Item;
  message: string;
}

export interface SplitItemRequest {
  value_chain: string;
  country: string;
  year: number;
  metadata: Record<string, unknown>;
  user_id?: string | null;
}

export interface SplitItemResponse {
  source_item: Item;
  new_item: Item;
  message: string;
}

export interface UnmergeItemRequest {
  user_id?: string | null;
}

export interface UnmergeItemResponse {
  restored_item: Item;
  message: string;
}

// --- Admin ---

export interface CreateApiKeyRequest {
  key_name: string;
  circuit_id: string;
  description?: string | null;
  expires_in_days?: number | null;
}

export interface CreateApiKeyResponse {
  id: string;
  key_name: string;
  circuit_id: string;
  api_key: string;
  created_at: string;
  message: string;
  expires_at?: string | null;
}

// --- Partner API Keys ---

export type PartnerApiKeyScope = "circuit" | "circuits" | "workspace" | "workspace_ingestion";

export interface PartnerApiKeyResponse {
  id: string;
  key_name: string;
  scope: PartnerApiKeyScope;
  workspace_id?: string | null;
  circuit_id?: string | null;
  /** Conjunto de circuitos (scope='circuits'). Onda G. */
  circuit_ids?: string[] | null;
  staging_circuit_id?: string | null;
  is_active: boolean;
  created_at: string;
  api_key?: string | null;
  description?: string | null;
  rate_limit_per_minute?: number | null;
  rate_limit_per_day?: number | null;
  last_used_at?: string | null;
  expires_at?: string | null;
}

export interface CreatePartnerApiKeyRequest {
  key_name: string;
  scope?: PartnerApiKeyScope;
  circuit_id?: string | null;
  circuit_ids?: string[] | null;
  staging_circuit_id?: string | null;
  description?: string | null;
  expires_in_days?: number | null;
}

export interface CreatePartnerApiKeyResponse {
  key: PartnerApiKeyResponse;
  message: string;
}

/** Edição de api-key. Metadados + (Onda G) scope editável. Campos ausentes não mudam. */
export interface EditPartnerApiKeyRequest {
  key_name?: string;
  description?: string;
  rate_limit_per_minute?: number;
  rate_limit_per_day?: number;
  expires_in_days?: number;
  /** Novo scope (Onda G). Ausente = não altera. */
  scope?: PartnerApiKeyScope;
  circuit_id?: string | null;
  circuit_ids?: string[] | null;
}

export interface ApiKeyMetricsResponse {
  api_key_id: string;
  requests_total: number;
  requests_last_24h: number;
  errors_last_24h: number;
  last_used_at?: string | null;
  rate_limit_per_minute?: number | null;
  rate_limit_per_day?: number | null;
}

// --- Health ---

export interface HealthResponse {
  status: string;
  database: { connected: boolean; latency_ms: number };
  redis: { connected: boolean; latency_ms: number };
  timestamp: string;
}

// --- Error ---

export interface ErrorResponse {
  error: string;
  message: string;
  details?: string | null;
}

// --- Filter params ---

export interface ItemFilters {
  value_chain?: string;
  country?: string;
  year?: number;
  status?: string;
  circuit_id?: string;
  limit?: number;
  offset?: number;
}

export interface CircuitFilters {
  owner_id?: string;
  organization_id?: string;
  circuit_type?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface EventFilters {
  event_type?: string;
  source_type?: string;
  circuit_id?: string;
  item_id?: string;
  user_id?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface AuditFilters {
  user_id?: string;
  action?: string;
  resource_type?: string;
  resource_id?: string;
  circuit_id?: string;
  limit?: number;
  offset?: number;
}

export interface SnapshotFilters {
  resource_type?: string;
  resource_id?: string;
  circuit_id?: string;
  snapshot_type?: string;
  created_by?: string;
  is_archived?: boolean;
  limit?: number;
  offset?: number;
}

export interface MerkleTreeFilters {
  tree_type?: string;
  resource_type?: string;
  resource_id?: string;
  circuit_id?: string;
  snapshot_id?: string;
  limit?: number;
  offset?: number;
}

// --- Join Requests ---

export interface JoinRequest {
  id: string;
  circuit_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  message?: string | null;
  user_metadata?: Record<string, unknown> | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListJoinRequestsResponse {
  requests: JoinRequest[];
  count: number;
}

export interface CreateJoinRequestRequest {
  message?: string | null;
  user_metadata?: Record<string, unknown> | null;
}

export interface ReviewJoinRequestInput {
  action: 'approve' | 'reject';
  role?: string;
  rejection_reason?: string;
}

// --- Public Circuit Types ---

export interface PublicCircuitInfo {
  id: string;
  name: string;
  circuit_type: string;
  visibility: string;
  member_count: number;
  item_count: number;
  featured: boolean;
  searchable: boolean;
  discovery_enabled: boolean;
  allow_join_requests: boolean;
  created_at: string;
  description?: string | null;
  public_slug?: string | null;
  public_description?: string | null;
  public_banner_url?: string | null;
  public_logo_url?: string | null;
  public_contact_email?: string | null;
  public_website?: string | null;
}

export interface CircuitStats {
  total_items: number;
  active_items: number;
  value_chains: string[];
  countries: string[];
  recent_activity_count: number;
}

export interface ItemSummary {
  id: string;
  dfid: string;
  value_chain: string;
  country: string;
  year: number;
  status: string;
  registered_at: string;
}

export interface PublicCircuitPortfolio {
  circuit: PublicCircuitInfo;
  stats: CircuitStats;
  recent_items: ItemSummary[];
}

export interface PublicCircuitsResponse {
  circuits: PublicCircuitInfo[];
  total: number;
  limit: number;
  offset: number;
}

export interface PublicItem {
  id: string;
  dfid: string;
  value_chain: string;
  country: string;
  year: number;
  status: string;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

export interface PublicCanonicalIdentifier {
  identifier_type: string;
  value: string;
}

export interface PublicIdentityAnchor {
  transaction_hash: string;
  chain_type: string;
  anchor_type: string;
  status: string;
  anchored_at: string;
}

export interface PublicContentVersion {
  version: number;
  cid: string;
  status: string;
  uploaded_at: string;
  gateway_url: string;
  is_latest: boolean;
}

export interface PublicItemProofs {
  dfid: string;
  item_id: string;
  identity_anchor?: PublicIdentityAnchor | null;
  nft_mint_anchor?: PublicIdentityAnchor | null;
  content_versions: PublicContentVersion[];
  cid_update_events_count: number;
}

export interface PublicItemEvent {
  id: string;
  event_type: string;
  item_id: string;
  circuit_id: string;
  payload?: Record<string, unknown> | null;
  created_at: string;
  trust_score?: number | null;
  trust_level?: "low" | "medium" | "high" | string | null;
  trust_factors?: Record<string, unknown> | null;
  trust_model_version?: string | null;
  // Provenance: which workspace issued this event (resolve to a name/type via
  // getPublicWorkspace). source_type mirrors the issuer's workspace_type.
  event_owner_workspace_id?: string | null;
  source_type?: string | null;
  // Cryptographic attribution, re-verified at read time on the backend (same check as
  // /api/verify). null/undefined = unsigned; true = signature verified against the
  // issuer's key valid at signing time; false = a signature was present but did not verify.
  signature_verified?: boolean | null;
  signature_key_id?: string | null;
}

/// Minimal public workspace fields for provenance resolution (the moat).
export interface PublicWorkspace {
  id: string;
  name: string;
  slug: string;
  workspace_type: string;
}

export interface SearchRequest {
  query: string;
  circuit_id?: string | null;
  filters?: Record<string, unknown> | null;
  page?: number;
  page_size?: number;
}

export interface SearchResultItem extends Item {
  rank?: number;
}

export interface SearchResponse {
  results: SearchResultItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface IdentifierSearchResponse {
  item: Item;
  identifier_type: string;
  identifier_value: string;
  is_canonical: boolean;
}

export interface AnalyticsKpisResponse {
  active_items: number;
  items_24h: number;
  active_circuits: number;
  events_1h: number;
  pending_anchors: number;
  avg_confirmations: number;
}

export interface BlockchainMetricsResponse {
  total_anchors: number;
  confirmed_anchors: number;
  failed_anchors: number;
  pending_anchors: number;
  avg_confirmations: number;
  success_rate: number;
}

// --- Item Relationships ---

export interface ItemRelationshipRecord {
  id: string;
  primary_item_id: string;
  related_item_id: string;
  relationship_type: 'duplicate' | 'derived' | 'related';
  confidence_score?: number | null;
  created_at: string;
}

// --- Adapter Anchors (Tokenization) ---

export interface AdapterBlockchainAnchor {
  id?: string;
  adapter_type?: string; // "stellar"
  chain_type?: string; // "stellar" | "stellar_nft"
  network?: string; // "mainnet" | "testnet"
  transaction_hash?: string;
  asset_code?: string | null;
  asset_issuer?: string | null;
  memo?: string | null;
  stellar_url?: string | null;
  ledger_number?: number | null;
  status?: string; // "confirmed"
  anchored_at?: string;
  adapter_name?: string;
  created_at?: string;
  metadata?: Record<string, unknown> | null;
}

export interface AdapterStorageRef {
  id?: string;
  adapter_type?: string; // "ipfs"
  storage_type?: string; // "ipfs"
  cid?: string; // IPFS Content ID
  content_id?: string; // alternative field name for CID
  gateway_url?: string | null;
  pin_status?: string | null;
  is_pinned?: boolean;
  is_latest?: boolean;
  version?: number;
  size_bytes?: number | null;
  uploaded_at?: string;
  adapter_name?: string;
  created_at?: string;
  metadata?: Record<string, unknown> | null;
}

export interface AdapterAnchorsResponse {
  item_id: string;
  blockchain_anchors: AdapterBlockchainAnchor[];
  storage_refs: AdapterStorageRef[];
}

// --- Timeline ---

export interface TimelineEvent {
  id: string;
  event_type: string;
  source: "event" | "blockchain" | "storage" | string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown> | null;
  status: string;
  timestamp: string;
  user_id?: string | null;
  circuit_id?: string | null;
  item_id?: string | null;
  entity_type: string;
  entity_id: string;
  trust_score?: number | null;
  trust_level?: "low" | "medium" | "high" | string | null;
  trust_factors?: Record<string, unknown> | null;
  trust_model_version?: string | null;
}

export interface TimelineResponse {
  events: TimelineEvent[];
  total_events: number;
  sources: string[];
}

// --- Property Links ---

export interface AddPropertyLinkRequest {
  property_dfid: string;
  is_transfer: boolean;
  gta_number?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface PropertyLink {
  id: string;
  item_id: string;
  property_dfid: string;
  is_transfer: boolean;
  gta_number?: string | null;
  linked_at: string;
  linked_by?: string | null;
  unlinked_at?: string | null;
  notes?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ListPropertyLinksResponse {
  links: PropertyLink[];
  count: number;
}

// --- Property Compliance ---

export interface PropertyCompliance {
  property_dfid: string;
  car?: string | null;
  status: "ok" | "warning" | "blocked" | "unknown" | string;
  score?: number | null;
  summary?: string | null;
  details_json?: Record<string, unknown> | null;
  checked_at?: string | null;
  expires_at?: string | null;
  source: string;
}

export interface CircuitComplianceListResponse {
  circuit_id: string;
  count: number;
  properties: PropertyCompliance[];
}

// --- Ownership Claims ---

export interface SubmitClaimRequest {
  identifier_type:
    | "land_dfid"
    | "car"
    | "ccir"
    | "incra"
    | "nirf"
    | "cib"
    | "matricula"
    | "georef"
    | "inscricao_estadual"
    | "cnpj"
    | "cpf";
  identifier_value: string;
  notes?: string | null;
  claim_details?: ClaimDetails | null;
}

export interface ClaimDetails {
  farm_name?: string | null;
  municipio?: string | null;
  uf?: string | null;
  area_hectares?: number | null;
  role_no_imovel?: "proprietario" | "arrendatario" | "gestor" | null;
  telefone_contato?: string | null;
  documento_comprovante_url?: string | null;
}

export interface OwnershipClaim {
  id: string;
  user_id: string;
  workspace_id: string;
  identifier_type: string;
  identifier_value: string;
  status: "pending" | "verified" | "rejected";
  verified_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  notes?: string | null;
  claim_details?: ClaimDetails | null;
  circuit_id?: string | null;
  items_surfaced: number;
  created_at: string;
}

export interface ListClaimsResponse {
  claims: OwnershipClaim[];
  count: number;
}
