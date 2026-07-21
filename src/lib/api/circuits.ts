import { registryRequest, buildQueryString } from "./client";
import type {
  Circuit,
  ListCircuitsResponse,
  CreateCircuitRequest,
  UpdateCircuitRequest,
  CircuitMember,
  ListMembersResponse,
  AddMemberRequest,
  UpdateMemberRequest,
  AddItemToCircuitRequest,
  AddItemsToCircuitBulkRequest,
  CircuitFilters,
  CircuitTerm,
  CircuitTermAcceptance,
  CircuitTermStatusResponse,
  PublishCircuitTermRequest,
  CircuitInvitation,
  CreateCircuitInvitationRequest,
  AcceptCircuitInvitationRequest,
  MyCircuitInvitation,
} from "./types";

// Circuit CRUD
export async function getCircuits(params?: CircuitFilters): Promise<Circuit[]> {
  const response = await registryRequest<ListCircuitsResponse>(
    `/circuits${buildQueryString(params as Record<string, any>)}`
  );
  return response.circuits;
}

export async function getCircuit(id: string): Promise<Circuit> {
  return registryRequest<Circuit>(`/circuits/${id}`);
}

export async function createCircuit(data: CreateCircuitRequest): Promise<Circuit> {
  return registryRequest<Circuit>("/circuits", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCircuit(id: string, data: UpdateCircuitRequest): Promise<Circuit> {
  return registryRequest<Circuit>(`/circuits/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteCircuit(id: string): Promise<void> {
  await registryRequest(`/circuits/${id}`, { method: "DELETE" });
}

export async function getCircuitTerm(id: string): Promise<CircuitTerm> {
  return registryRequest<CircuitTerm>(`/circuits/${id}/terms`);
}

export async function getCircuitTermStatus(id: string): Promise<CircuitTermStatusResponse> {
  return registryRequest<CircuitTermStatusResponse>(`/circuits/${id}/terms/status`);
}

export async function publishCircuitTerm(
  id: string,
  data: PublishCircuitTermRequest
): Promise<CircuitTerm> {
  return registryRequest<CircuitTerm>(`/circuits/${id}/terms`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function acceptCircuitTerm(
  id: string,
  termId: string
): Promise<CircuitTermAcceptance> {
  return registryRequest<CircuitTermAcceptance>(`/circuits/${id}/terms/accept`, {
    method: "POST",
    body: JSON.stringify({ term_id: termId }),
  });
}

export async function createCircuitInvitation(
  circuitId: string,
  data: CreateCircuitInvitationRequest
): Promise<CircuitInvitation> {
  return registryRequest<CircuitInvitation>(`/circuits/${circuitId}/invitations`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getCircuitInvitations(circuitId: string): Promise<CircuitInvitation[]> {
  return registryRequest<CircuitInvitation[]>(`/circuits/${circuitId}/invitations`);
}

export async function getMyCircuitInvitations(): Promise<MyCircuitInvitation[]> {
  return registryRequest<MyCircuitInvitation[]>("/invitations/mine");
}

export async function acceptCircuitInvitation(
  invitationId: string,
  data: AcceptCircuitInvitationRequest = {}
): Promise<CircuitInvitation> {
  return registryRequest<CircuitInvitation>(`/invitations/${invitationId}/accept`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function declineCircuitInvitation(invitationId: string): Promise<CircuitInvitation> {
  return registryRequest<CircuitInvitation>(`/invitations/${invitationId}/decline`, {
    method: "POST",
  });
}

export async function cancelCircuitInvitation(invitationId: string): Promise<void> {
  await registryRequest(`/invitations/${invitationId}/cancel`, {
    method: "POST",
  });
}

/** Admin: lista TODOS os circuitos (pra encontrar e conceder o selo). Busca por nome no client. */
export async function adminListCircuits(params?: { limit?: number; offset?: number }): Promise<Circuit[]> {
  return registryRequest<Circuit[]>(
    `/admin/circuits${buildQueryString(params as Record<string, any>)}`
  );
}

/** Admin: concede/remove o selo "Verificado pela DeFarm" (metadata.verified). */
export async function setCircuitVerified(id: string, verified: boolean): Promise<Circuit> {
  return registryRequest<Circuit>(`/admin/circuits/${id}/verify`, {
    method: "POST",
    body: JSON.stringify({ verified }),
  });
}

// Circuit Members
export async function getCircuitMembers(circuitId: string): Promise<ListMembersResponse> {
  return registryRequest<ListMembersResponse>(`/circuits/${circuitId}/members`);
}

export async function addCircuitMember(
  circuitId: string,
  data: AddMemberRequest
): Promise<CircuitMember> {
  return registryRequest<CircuitMember>(`/circuits/${circuitId}/members`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getCircuitMember(
  circuitId: string,
  userId: string
): Promise<CircuitMember> {
  return registryRequest<CircuitMember>(`/circuits/${circuitId}/members/${userId}`);
}

export async function updateCircuitMember(
  circuitId: string,
  userId: string,
  data: UpdateMemberRequest
): Promise<CircuitMember> {
  return registryRequest<CircuitMember>(`/circuits/${circuitId}/members/${userId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function removeCircuitMember(
  circuitId: string,
  userId: string,
  removedBy?: string
): Promise<void> {
  const qs = removedBy ? `?removed_by=${removedBy}` : "";
  await registryRequest(`/circuits/${circuitId}/members/${userId}${qs}`, {
    method: "DELETE",
  });
}

// Circuit item transfer endpoints
export async function addItemToCircuit(
  circuitId: string,
  itemId: string,
  data?: AddItemToCircuitRequest
): Promise<void> {
  await registryRequest(`/circuits/${circuitId}/items/${itemId}`, {
    method: "POST",
    body: JSON.stringify(data || {}),
  });
}

export async function bulkAddItemsToCircuit(
  circuitId: string,
  data: AddItemsToCircuitBulkRequest
): Promise<void> {
  await registryRequest(`/circuits/${circuitId}/items/bulk`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
