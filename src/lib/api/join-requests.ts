import { registryRequest, buildQueryString } from "./client";
import type { JoinRequest, ListJoinRequestsResponse, CreateJoinRequestRequest, UpdateJoinRequestRequest } from "./types";

// Public endpoints (no auth required for discovery)
export async function getPublicCircuits(): Promise<any[]> {
  const response = await registryRequest<{ circuits: any[] }>("/circuits/public");
  return response.circuits;
}

export async function getPublicCircuit(id: string): Promise<any> {
  return registryRequest<any>(`/circuits/${id}/public`);
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
  const response = await registryRequest<ListJoinRequestsResponse>(
    `/circuits/${circuitId}/join-requests${qs}`
  );
  return response.requests;
}

// Admin: approve/reject join request
export async function updateJoinRequest(
  circuitId: string,
  requestId: string,
  data: UpdateJoinRequestRequest
): Promise<JoinRequest> {
  return registryRequest<JoinRequest>(
    `/circuits/${circuitId}/join-requests/${requestId}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
}
