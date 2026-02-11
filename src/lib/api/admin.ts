import { registryRequest } from "./client";
import type {
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  CreatePartnerApiKeyRequest,
  CreatePartnerApiKeyResponse,
  PartnerApiKeyResponse,
  ApiKeyMetricsResponse,
} from "./types";

// --- Admin API Keys (requires x-admin-key) ---

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
  return registryRequest(`/admin/api-keys/${circuitId}`, { headers });
}

export async function getApiKeyMetrics(
  keyId: string,
  adminKey?: string
): Promise<ApiKeyMetricsResponse> {
  const headers = adminKey ? { "x-admin-key": adminKey } : {};
  return registryRequest<ApiKeyMetricsResponse>(
    `/admin/api-keys/${keyId}/metrics`,
    { headers }
  );
}

// --- Partner API Keys (JWT auth) ---

export async function createPartnerApiKey(
  data: CreatePartnerApiKeyRequest
): Promise<CreatePartnerApiKeyResponse> {
  return registryRequest<CreatePartnerApiKeyResponse>("/partner/api-keys", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listPartnerApiKeys(): Promise<PartnerApiKeyResponse[]> {
  return registryRequest<PartnerApiKeyResponse[]>("/partner/api-keys");
}

export async function revokePartnerApiKey(keyId: string): Promise<void> {
  return registryRequest<void>(`/partner/api-keys/${keyId}`, {
    method: "DELETE",
  });
}

export async function getPartnerApiKeyMetrics(
  keyId: string
): Promise<ApiKeyMetricsResponse> {
  return registryRequest<ApiKeyMetricsResponse>(
    `/partner/api-keys/${keyId}/metrics`
  );
}
