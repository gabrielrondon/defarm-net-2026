import { registryRequest, buildQueryString } from "./client";
import type {
  JoinRequest,
  CreateJoinRequestRequest,
  ReviewJoinRequestInput,
  PublicCircuitsResponse,
  PublicCircuitPortfolio,
} from "./types";

// Public endpoints (no auth required for discovery)
export async function getPublicCircuits(params?: {
  search?: string;
  circuit_type?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
}): Promise<PublicCircuitsResponse> {
  return registryRequest<PublicCircuitsResponse>(
    `/circuits/public${buildQueryString(params as Record<string, any>)}`
  );
}

export async function getPublicCircuit(id: string): Promise<PublicCircuitPortfolio> {
  return registryRequest<PublicCircuitPortfolio>(`/circuits/${id}/public`);
}

// Public item endpoints (no auth required)
export async function getPublicItem(dfid: string): Promise<any> {
  return registryRequest<any>(`/items/${dfid}/public`);
}

export async function getPublicItemEvents(
  dfid: string,
  params?: { event_type?: string; limit?: number; offset?: number }
): Promise<any[]> {
  return registryRequest<any[]>(
    `/items/${dfid}/events/public${buildQueryString(params as Record<string, any>)}`
  );
}

// Join Requests (JWT required)
export async function createJoinRequest(
  circuitId: string,
  data?: CreateJoinRequestRequest
): Promise<JoinRequest> {
  return registryRequest<JoinRequest>(`/circuits/${circuitId}/join-requests`, {
    method: "POST",
    body: JSON.stringify(data || {}),
  });
}

// Admin: list join requests
export async function getJoinRequests(
  circuitId: string,
  status?: string
): Promise<JoinRequest[]> {
  const qs = status ? buildQueryString({ status }) : "";
  return registryRequest<JoinRequest[]>(
    `/circuits/${circuitId}/join-requests${qs}`
  );
}

// Admin: approve/reject join request
export async function reviewJoinRequest(
  circuitId: string,
  requestId: string,
  data: ReviewJoinRequestInput
): Promise<JoinRequest> {
  return registryRequest<JoinRequest>(
    `/circuits/${circuitId}/join-requests/${requestId}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
}

// Remove item from circuit (N:N)
export async function removeItemFromCircuit(
  circuitId: string,
  itemId: string
): Promise<void> {
  await registryRequest(`/circuits/${circuitId}/items/${itemId}`, {
    method: "DELETE",
  });
}
