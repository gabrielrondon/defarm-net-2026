import { financeRequest } from "./client";
import type { SourceCatalogResponse } from "./types";

export async function listActivities(): Promise<{ data: string[] }> {
  return financeRequest("/api/v1/metadata/activities");
}

export async function listStates(): Promise<{ data: string[] }> {
  return financeRequest("/api/v1/metadata/states");
}

export async function listSources(country?: string): Promise<SourceCatalogResponse> {
  const suffix = country ? `?country=${encodeURIComponent(country)}` : "";
  return financeRequest(`/api/v1/metadata/sources${suffix}`);
}
