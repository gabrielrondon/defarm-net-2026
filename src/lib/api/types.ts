// ==========================================
// Types from DeFarm Item Registry OpenAPI 3.0
// Via Gateway: gateway-service-production-f54d.up.railway.app
// ==========================================

// --- Items ---

export interface Item {
  id: string;
  dfid: string;
  value_chain: string;
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

export interface ItemDetailsResponse {
  item: Item;
  identifiers: IdentifierResponse[];
  canonical_identifier?: IdentifierResponse | null;
  events: Event[];
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
  user_id?: string | null;
  ip_address?: string | null;
}

export interface UpdateItemStatusRequest {
  status: string;
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
  public_website?: string | null;
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
  user_id?: string | null;
  ip_address?: string | null;
}

export interface UpdateCircuitRequest {
  name?: string | null;
  description?: string | null;
  status?: string | null;
  visibility?: string | null;
  metadata?: Record<string, unknown> | null;
  settings?: Record<string, unknown> | null;
  user_id?: string | null;
  ip_address?: string | null;
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
}

export interface ListEventsResponse {
  events: Event[];
  count: number;
}

export interface UpdateEventStatusRequest {
  status: string;
  error_message?: string | null;
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
}

export interface IngestionSummary {
  rows_total: number;
  items_created: number;
  items_updated: number;
  events_created: number;
  identifiers_resolved: Record<string, number>;
  unclassified_fields: string[];
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

export interface PartnerApiKeyResponse {
  id: string;
  key_name: string;
  circuit_id: string;
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
  circuit_id: string;
  description?: string | null;
  expires_in_days?: number | null;
}

export interface CreatePartnerApiKeyResponse {
  key: PartnerApiKeyResponse;
  message: string;
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
  public_banner_url?: string | null;
  public_logo_url?: string | null;
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

// --- Item Relationships ---

export interface ItemRelationshipRecord {
  id: string;
  primary_item_id: string;
  related_item_id: string;
  relationship_type: 'duplicate' | 'derived' | 'related';
  confidence_score?: number | null;
  created_at: string;
}
