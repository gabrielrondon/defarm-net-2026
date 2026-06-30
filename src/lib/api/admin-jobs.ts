import { buildQueryString, registryRequest } from "./client";

export type AdapterJobStatus =
  | "pending"
  | "scheduled"
  | "processing"
  | "completed"
  | "failed"
  | "retrying";

export interface AdapterJob {
  id: string;
  item_id: string;
  circuit_id: string;
  adapters: string[];
  priority: number | null;
  status: AdapterJobStatus | null;
  retry_count: number | null;
  max_retries: number | null;
  next_retry_at: string | null;
  error_message: string | null;
  result: {
    blockchain_anchors?: Array<Record<string, any>>;
    storage_refs?: Array<Record<string, any>>;
    errors?: string[];
    [k: string]: any;
  } | null;
  created_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
}

export interface JobsListResponse {
  data: AdapterJob[];
  total: number;
  limit: number;
  offset: number;
}

export interface JobsSummary {
  pending: number;
  scheduled: number;
  processing: number;
  failed: number;
  completed: number;
  completed_clean: number;
  completed_with_errors: number;
  due_retries: number;
}

export interface JobsSummaryResponse {
  summary: JobsSummary;
  by_value_chain?: Record<
    string,
    {
      total_items: number;
      with_stellar: number;
      with_ipfs: number;
    }
  >;
}

export interface RetryBatchRequest {
  filter: {
    status?: string;
    adapter?: string;
    has_errors?: boolean;
    item_ids?: string[];
    missing_stellar?: boolean;
    missing_ipfs?: boolean;
  };
  priority?: number;
  limit?: number;
}

export interface RetryBatchResponse {
  queued: number;
  queue: string;
  priority: number;
}

export interface QueueStatusResponse {
  queue_depths: {
    p1: number;
    p2: number;
    p3: number;
    p4: number;
    total: number;
  };
  xlm_balance: number | null;
  xlm_low_balance_threshold: number;
  low_xlm_mode: boolean;
  active_queues: string[];
  /** G-address pública da carteira p/ top-up (admin). Null se não derivou. */
  stellar_source_account?: string | null;
}

export interface ReanchorStatusResponse {
  enabled: boolean;
  pilot_active: boolean;
  max_attempts: number;
  batch: number;
  spacing_secs: number;
  xlm_min: number;
  confirmed: number;
  failed_total: number;
  eligible: number;
  maxed: number;
  pending_inflight: number;
  reanchored_last_hour: number;
  last_reanchor_at: string | null;
}

export interface TokenizationHealthResponse {
  total_items: number;
  by_value_chain: Record<
    string,
    {
      total: number;
      stellar_anchored: number;
      ipfs_pinned: number;
      fully_tokenized: number;
      missing_stellar: number;
      missing_ipfs: number;
    }
  >;
  xlm_balance: number | null;
  xlm_threshold: number;
  low_xlm_mode: boolean;
  queue_depths: {
    p1: number;
    p2: number;
    p3: number;
    p4: number;
    total: number;
  };
}

export interface PipelineStatusResponse {
  pipeline: {
    ingested: { total: number; by_value_chain: Record<string, number> };
    dfid_assigned: { total: number };
    ipfs_pinned: { total: number; by_status: Record<string, number> };
    stellar_anchored: { total: number; by_status: Record<string, number> };
    fully_tokenized: { total: number; by_value_chain: Record<string, number> };
    stuck: { missing_stellar: number; pending_confirmation: number };
  };
  queue: {
    p1: number;
    p2: number;
    p3: number;
    p4: number;
    total: number;
  };
  xlm: {
    balance: number | null;
    threshold: number;
    low_mode: boolean;
  };
  errors: {
    top: Array<{ error: string; count: number }>;
  };
}

export interface IngestionsSummaryResponse {
  total_ingestions: number;
  total_rows_processed: number;
  total_items_created: number;
  total_items_updated: number;
  total_events_created: number;
  by_status: Record<string, number>;
  recent: Array<{
    id: string;
    status: string;
    rows_total: number;
    items_created: number;
    items_updated: number;
    events_created: number;
    created_at: string;
    completed_at: string | null;
  }>;
}

export interface ItemPipelineDetailResponse {
  item_id: string;
  dfid: string;
  value_chain: string;
  stages: {
    created: { status: string; at: string | null };
    dfid: { status: string; value: string };
    ipfs: {
      status: string;
      cid: string | null;
      gateway_url: string | null;
      uploaded_at: string | null;
    };
    stellar: {
      status: string;
      tx_hash: string | null;
      explorer_url: string | null;
      anchored_at: string | null;
    };
    fully_tokenized: boolean;
  };
  jobs: AdapterJob[];
}

export async function listAdminJobs(params?: {
  status?: string;
  adapter?: string;
  item_id?: string;
  circuit_id?: string;
  priority?: number;
  has_errors?: boolean;
  missing_stellar?: boolean;
  missing_ipfs?: boolean;
  error_contains?: string;
  limit?: number;
  offset?: number;
}): Promise<JobsListResponse> {
  const qs = buildQueryString(params);
  return registryRequest<JobsListResponse>(`/adapter/admin/jobs${qs}`);
}

export async function getAdminJobsSummary(): Promise<JobsSummaryResponse> {
  return registryRequest<JobsSummaryResponse>("/adapter/admin/jobs/summary");
}

export async function getAdminJob(jobId: string): Promise<AdapterJob> {
  return registryRequest<AdapterJob>(`/adapter/admin/jobs/${jobId}`);
}

export async function retryAdminJob(jobId: string, force = false): Promise<void> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 30000);
  try {
    await registryRequest<void>(
      `/adapter/admin/jobs/${jobId}/retry${force ? "?force=true" : ""}`,
      {
      method: "POST",
      signal: controller.signal,
      }
    );
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function retryAdminJobsBatch(
  body: RetryBatchRequest
): Promise<RetryBatchResponse> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 30000);
  try {
    return await registryRequest<RetryBatchResponse>(
      "/adapter/admin/jobs/retry-batch",
      {
        method: "POST",
        body: JSON.stringify(body),
        signal: controller.signal,
      }
    );
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function getAdminQueueStatus(): Promise<QueueStatusResponse> {
  return registryRequest<QueueStatusResponse>("/adapter/admin/queues");
}

export async function getAdminReanchorStatus(): Promise<ReanchorStatusResponse> {
  return registryRequest<ReanchorStatusResponse>("/adapter/admin/reanchor-status");
}

export async function getAdminTokenizationHealth(): Promise<TokenizationHealthResponse> {
  return registryRequest<TokenizationHealthResponse>(
    "/adapter/admin/tokenization-health"
  );
}

export async function getAdminPipelineStatus(): Promise<PipelineStatusResponse> {
  return registryRequest<PipelineStatusResponse>("/adapter/admin/pipeline-status");
}

export async function getAdminIngestionsSummary(): Promise<IngestionsSummaryResponse> {
  return registryRequest<IngestionsSummaryResponse>("/adapter/admin/ingestions/summary");
}

export async function getAdminItemPipelineDetail(
  itemId: string
): Promise<ItemPipelineDetailResponse> {
  return registryRequest<ItemPipelineDetailResponse>(
    `/adapter/admin/items/pipeline/${itemId}`
  );
}
