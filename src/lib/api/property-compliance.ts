import { registryRequest, buildQueryString } from "./client";
import type { CircuitComplianceListResponse, PropertyCompliance } from "./types";

export async function getPropertyCompliance(propertyDfid: string): Promise<PropertyCompliance> {
  return registryRequest<PropertyCompliance>(
    `/properties/${encodeURIComponent(propertyDfid)}/compliance`
  );
}

export async function refreshPropertyCompliance(
  propertyDfid: string,
  force = true
): Promise<PropertyCompliance> {
  return registryRequest<PropertyCompliance>(
    `/properties/${encodeURIComponent(propertyDfid)}/compliance/refresh`,
    {
      method: "POST",
      body: JSON.stringify({ force }),
    }
  );
}

export async function getCircuitPropertyCompliance(
  circuitId: string,
  params?: { active_only?: boolean }
): Promise<CircuitComplianceListResponse> {
  return registryRequest<CircuitComplianceListResponse>(
    `/circuits/${circuitId}/properties/compliance${buildQueryString(params as Record<string, unknown>)}`
  );
}

export async function getPublicCircuitPropertyCompliance(
  circuitId: string
): Promise<CircuitComplianceListResponse> {
  return registryRequest<CircuitComplianceListResponse>(
    `/circuits/${circuitId}/properties/compliance/public`
  );
}
