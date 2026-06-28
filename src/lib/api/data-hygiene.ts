import { authRequest, buildQueryString } from "./client";

// --- Data hygiene (admin): test-data candidates + logical deprecation ---
// Backend: GET /api/admin/data-hygiene/test-candidates, POST /api/admin/data-hygiene/deprecations

export interface HygieneCandidate {
  entity_type: string; // "item" | "circuit"
  id: string;
  label: string;
  created_at: string;
  reason: string;
}

export interface TestCandidatesResponse {
  days: number;
  count: number;
  candidates: HygieneCandidate[];
}

export interface DeprecateDataRequest {
  target_type: "item" | "storage_ref" | "blockchain_anchor";
  dfid?: string;
  storage_ref_id?: string;
  blockchain_anchor_id?: string;
  reason: string;
  metadata?: Record<string, unknown>;
  deprecate_related_storage_refs?: boolean;
  deprecate_related_anchors?: boolean;
}

export interface DeprecationResult {
  target_type: string;
  item_id?: string | null;
  item_dfid?: string | null;
  deprecated_storage_refs: number;
  deprecated_anchors: number;
  inserted_records: number;
}

export interface DeprecationResponse {
  message: string;
  result: DeprecationResult;
}

export async function listTestCandidates(
  params?: { days?: number; limit?: number }
): Promise<TestCandidatesResponse> {
  return authRequest<TestCandidatesResponse>(
    `/api/admin/data-hygiene/test-candidates${buildQueryString({ days: params?.days, limit: params?.limit })}`
  );
}

export async function deprecateData(body: DeprecateDataRequest): Promise<DeprecationResponse> {
  return authRequest<DeprecationResponse>("/api/admin/data-hygiene/deprecations", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
