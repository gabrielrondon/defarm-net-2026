import { buildQueryString, registryRequest } from "./client";
import type { ListClaimsResponse, OwnershipClaim, SubmitClaimRequest } from "./types";

export async function submitOwnershipClaim(data: SubmitClaimRequest): Promise<OwnershipClaim> {
  return registryRequest<OwnershipClaim>("/claims", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listMyOwnershipClaims(params?: {
  status?: string;
  identifier_type?: string;
  limit?: number;
  offset?: number;
}): Promise<ListClaimsResponse> {
  return registryRequest<ListClaimsResponse>(`/claims${buildQueryString(params as Record<string, any>)}`);
}

export async function adminListOwnershipClaims(params?: {
  status?: string;
  identifier_type?: string;
  limit?: number;
  offset?: number;
}): Promise<ListClaimsResponse> {
  return registryRequest<ListClaimsResponse>(`/admin/claims${buildQueryString(params as Record<string, any>)}`);
}

export async function adminVerifyOwnershipClaim(id: string): Promise<any> {
  return registryRequest(`/admin/claims/${id}/verify`, {
    method: "PUT",
    body: JSON.stringify({}),
  });
}

export async function adminRejectOwnershipClaim(id: string, reason?: string): Promise<OwnershipClaim> {
  return registryRequest<OwnershipClaim>(`/admin/claims/${id}/reject`, {
    method: "PUT",
    body: JSON.stringify({ reason: reason || null }),
  });
}
