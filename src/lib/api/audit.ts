import { registryRequest, buildQueryString } from "./client";
import type {
  AuditLog,
  ListAuditLogsResponse,
  HashChainVerificationResponse,
  AuditFilters,
} from "./types";

export async function getAuditLogs(params?: AuditFilters): Promise<AuditLog[]> {
  const response = await registryRequest<ListAuditLogsResponse>(
    `/audit${buildQueryString(params as Record<string, any>)}`
  );
  return response.logs;
}

export async function getAuditLog(id: string): Promise<AuditLog> {
  return registryRequest<AuditLog>(`/audit/${id}`);
}

export async function verifyHashChain(limit?: number): Promise<HashChainVerificationResponse> {
  const qs = limit ? `?limit=${limit}` : "";
  return registryRequest<HashChainVerificationResponse>(`/audit/verify${qs}`);
}
