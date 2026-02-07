// ==========================================
// Types from DeFarm Item Registry OpenAPI 3.0
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
  updated_at: string;
  circuit_id?: string | null;
  metadata?: Record<string, unknown> | null;
  owner_id?: string | null;
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
  owner_id?: string | null;
  user_id?: string | null;
}

export interface UpdateItemRequest {
  metadata: Record<string, unknown>;
  user_id?: string | null;
}

export interface UpdateItemStatusRequest {
  status: string;
  user_id?: string | null;
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
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  organization_id?: string | null;
  settings?: Record<string, unknown> | null;
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
}

export interface UpdateCircuitRequest {
  name?: string | null;
  description?: string | null;
  status?: string | null;
  visibility?: string | null;
  metadata?: Record<string, unknown> | null;
  settings?: Record<string, unknown> | null;
}

// --- Circuit Members ---

export interface CircuitMember {
  circuit_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  updated_at: string;
  permissions?: Record<string, unknown> | null;
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
  circuit_id?: string | null;
  error_message?: string | null;
  item_id?: string | null;
  metadata?: Record<string, unknown> | null;
  processed_at?: string | null;
  user_id?: string | null;
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
}

export interface ListAuditLogsResponse {
  logs: AuditLog[];
  count: number;
}

// --- Health ---

export interface HealthResponse {
  status: string;
  database: { connected: boolean; latency_ms: number };
  redis: { connected: boolean; latency_ms: number };
  timestamp: string;
}

// --- Workflows ---

export interface MergeItemsRequest {
  secondary_dfid: string;
  strategy: string;
  user_id?: string | null;
}

export interface SplitItemRequest {
  value_chain: string;
  country: string;
  year: number;
  metadata: Record<string, unknown>;
  user_id?: string | null;
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
  owner_id?: string;
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
