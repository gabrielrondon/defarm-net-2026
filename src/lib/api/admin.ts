import { registryRequest } from "./client";
import type {
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  CreatePartnerApiKeyRequest,
  CreatePartnerApiKeyResponse,
  IntegrationKeyResponse,
  EditPartnerApiKeyRequest,
  PartnerApiKeyResponse,
  ApiKeyMetricsResponse,
  SwitchPartnerStagingCircuitResponse,
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

/**
 * Mint da chave de integração em 1 chamada, zero decisões (#336/#350): o scope
 * `workspace_ingestion` e o circuito de staging são resolvidos no servidor — nada de
 * circuito/scope na tela. Requer JWT (é a porta de entrada). `api_key` vem só aqui.
 */
export async function createIntegrationKey(
  data: { key_name?: string; description?: string; expires_in_days?: number } = {}
): Promise<IntegrationKeyResponse> {
  return registryRequest<IntegrationKeyResponse>("/partner/integration-key", {
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

export async function editPartnerApiKey(
  keyId: string,
  data: EditPartnerApiKeyRequest
): Promise<PartnerApiKeyResponse> {
  return registryRequest<PartnerApiKeyResponse>(`/partner/api-keys/${keyId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function getPartnerApiKeyMetrics(
  keyId: string
): Promise<ApiKeyMetricsResponse> {
  return registryRequest<ApiKeyMetricsResponse>(
    `/partner/api-keys/${keyId}/metrics`
  );
}

/**
 * Repontar o circuito-alvo (staging) das chaves `workspace_ingestion`. O inbox é
 * determinístico: isto move TODAS as chaves workspace_ingestion do workspace para o
 * novo circuito (`updated_keys` na resposta). Aponte para um circuito público+staging
 * para que a ingestão por X-API-Key alcance as rotas públicas (/public, /verify).
 */
export async function switchPartnerApiKeyStagingCircuit(
  keyId: string,
  stagingCircuitId: string
): Promise<SwitchPartnerStagingCircuitResponse> {
  return registryRequest<SwitchPartnerStagingCircuitResponse>(
    `/partner/api-keys/${keyId}/staging-circuit`,
    {
      method: "PUT",
      body: JSON.stringify({ staging_circuit_id: stagingCircuitId }),
    }
  );
}
