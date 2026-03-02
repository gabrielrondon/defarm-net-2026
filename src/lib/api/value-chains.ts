import { buildQueryString, registryRequest } from "./client";
import type {
  CreateValueChainPolicyRequest,
  UpdateValueChainPolicyRequest,
  ValueChainPolicy,
} from "./types";

export async function listValueChainPolicies(activeOnly = false): Promise<ValueChainPolicy[]> {
  const query = buildQueryString({ active_only: activeOnly });
  return registryRequest<ValueChainPolicy[]>(`/admin/value-chains${query}`);
}

export async function createValueChainPolicy(
  payload: CreateValueChainPolicyRequest
): Promise<ValueChainPolicy> {
  return registryRequest<ValueChainPolicy>("/admin/value-chains", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateValueChainPolicy(
  id: string,
  payload: UpdateValueChainPolicyRequest
): Promise<ValueChainPolicy> {
  return registryRequest<ValueChainPolicy>(`/admin/value-chains/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteValueChainPolicy(id: string): Promise<void> {
  await registryRequest<void>(`/admin/value-chains/${id}`, {
    method: "DELETE",
  });
}

