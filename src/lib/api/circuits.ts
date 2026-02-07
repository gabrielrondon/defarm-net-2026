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
  CircuitFilters,
} from "./types";

// Circuit CRUD
export async function getCircuits(params?: CircuitFilters): Promise<ListCircuitsResponse> {
  return registryRequest<ListCircuitsResponse>(`/circuits${buildQueryString(params)}`);
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
