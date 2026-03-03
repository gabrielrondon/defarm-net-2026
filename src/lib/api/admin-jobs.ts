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
  created_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
}

export interface JobsListResponse {
  data: AdapterJob[];
  limit: number;
  offset: number;
}

export interface JobsSummary {
  pending: number;
  scheduled: number;
  processing: number;
  failed: number;
  completed: number;
  due_retries: number;
}

export interface JobsSummaryResponse {
  summary: JobsSummary;
}

export interface RetryBatchRequest {
  filter: {
    status?: string;
    adapter?: string;
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
}

export async function listAdminJobs(params?: {
  status?: string;
  adapter?: string;
  item_id?: string;
  circuit_id?: string;
  priority?: number;
  limit?: number;
  offset?: number;
}): Promise<JobsListResponse> {
  const qs = buildQueryString(params);
  return registryRequest<JobsListResponse>(`/adapter/admin/jobs${qs}`);
}

export async function getAdminJobsSummary(): Promise<JobsSummary> {
  const resp = await registryRequest<JobsSummaryResponse>(
    "/adapter/admin/jobs/summary"
  );
  return resp.summary;
}

export async function getAdminJob(jobId: string): Promise<AdapterJob> {
  return registryRequest<AdapterJob>(`/adapter/admin/jobs/${jobId}`);
}

export async function retryAdminJob(jobId: string): Promise<void> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 30000);
  try {
    await registryRequest<void>(`/adapter/admin/jobs/${jobId}/retry`, {
      method: "POST",
      signal: controller.signal,
    });
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
