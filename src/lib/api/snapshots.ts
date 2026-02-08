import { registryRequest, buildQueryString } from "./client";
import type {
  Snapshot,
  ListSnapshotsResponse,
  CreateSnapshotRequest,
  ComparisonResponse,
  CreateComparisonRequest,
  RestorationResponse,
  CreateRestorationRequest,
  UpdateRestorationStatusRequest,
  RetentionPolicyResponse,
  ApplyRetentionResponse,
  SnapshotFilters,
} from "./types";

// Snapshot CRUD
export async function getSnapshots(params?: SnapshotFilters): Promise<Snapshot[]> {
  const response = await registryRequest<ListSnapshotsResponse>(
    `/snapshots${buildQueryString(params as Record<string, any>)}`
  );
  return response.snapshots;
}

export async function getSnapshot(id: string): Promise<Snapshot> {
  return registryRequest<Snapshot>(`/snapshots/${id}`);
}

export async function createSnapshot(data: CreateSnapshotRequest): Promise<Snapshot> {
  return registryRequest<Snapshot>("/snapshots", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteSnapshot(id: string): Promise<void> {
  await registryRequest(`/snapshots/${id}`, { method: "DELETE" });
}

export async function archiveSnapshot(id: string): Promise<Snapshot> {
  return registryRequest<Snapshot>(`/snapshots/${id}/archive`, {
    method: "POST",
  });
}

// Comparisons
export async function createComparison(
  snapshotId: string,
  data: CreateComparisonRequest
): Promise<ComparisonResponse> {
  return registryRequest<ComparisonResponse>(`/snapshots/${snapshotId}/compare`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getComparison(id: string): Promise<ComparisonResponse> {
  return registryRequest<ComparisonResponse>(`/snapshots/comparisons/${id}`);
}

// Restorations
export async function createRestoration(
  snapshotId: string,
  data: CreateRestorationRequest
): Promise<RestorationResponse> {
  return registryRequest<RestorationResponse>(`/snapshots/${snapshotId}/restore`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateRestorationStatus(
  id: string,
  data: UpdateRestorationStatusRequest
): Promise<RestorationResponse> {
  return registryRequest<RestorationResponse>(`/snapshots/restorations/${id}/status`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// Retention policies
export async function getRetentionPolicies(
  circuitId?: string
): Promise<RetentionPolicyResponse[]> {
  const qs = circuitId ? `?circuit_id=${circuitId}` : "";
  return registryRequest<RetentionPolicyResponse[]>(
    `/snapshots/retention-policies${qs}`
  );
}

export async function applyRetentionPolicy(id: string): Promise<ApplyRetentionResponse> {
  return registryRequest<ApplyRetentionResponse>(
    `/snapshots/retention-policies/${id}/apply`,
    { method: "POST" }
  );
}
