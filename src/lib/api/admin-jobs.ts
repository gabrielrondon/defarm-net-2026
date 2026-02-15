import { registryRequest, buildQueryString } from "./client";

// ── Types ──────────────────────────────────────────────
export interface AdapterJob {
  id: string;
  item_id: string;
  circuit_id: string;
  adapter_type: string;
  status: "pending" | "processing" | "completed" | "failed" | "retrying";
  attempts: number;
  max_attempts: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface JobsSummary {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  retrying: number;
}

export interface JobsListResponse {
  jobs: AdapterJob[];
  total: number;
}

// ── API calls ──────────────────────────────────────────
export async function listAdminJobs(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<JobsListResponse> {
  const qs = buildQueryString(params);
  return registryRequest<JobsListResponse>(`/adapter/admin/jobs${qs}`);
}

export async function getAdminJobsSummary(): Promise<JobsSummary> {
  return registryRequest<JobsSummary>("/adapter/admin/jobs/summary");
}

export async function getAdminJob(jobId: string): Promise<AdapterJob> {
  return registryRequest<AdapterJob>(`/adapter/admin/jobs/${jobId}`);
}

export async function retryAdminJob(jobId: string): Promise<void> {
  return registryRequest<void>(`/adapter/admin/jobs/${jobId}/retry`, {
    method: "POST",
  });
}
