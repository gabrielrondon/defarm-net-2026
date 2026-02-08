import { registryRequest } from "./client";
import type { CreateApiKeyRequest, CreateApiKeyResponse } from "./types";

export async function createApiKey(data: CreateApiKeyRequest): Promise<CreateApiKeyResponse> {
  return registryRequest<CreateApiKeyResponse>("/admin/api-keys", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listApiKeys(circuitId: string) {
  return registryRequest(`/admin/api-keys/${circuitId}`);
}
