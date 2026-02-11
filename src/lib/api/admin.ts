import { registryRequest } from "./client";
import type { CreateApiKeyRequest, CreateApiKeyResponse } from "./types";

export async function createApiKey(
  data: CreateApiKeyRequest,
  adminKey?: string
): Promise<CreateApiKeyResponse> {
  const headers = adminKey ? { "x-admin-key": adminKey } : {};
  return registryRequest<CreateApiKeyResponse>("/admin/api-keys", {
    method: "POST",
    body: JSON.stringify(data),
    headers,
  });
}

export async function listApiKeys(circuitId: string, adminKey?: string) {
  const headers = adminKey ? { "x-admin-key": adminKey } : {};
  return registryRequest(`/admin/api-keys?circuit_id=${circuitId}`, { headers });
}
