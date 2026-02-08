import { registryRequest } from "./client";
import type { HealthResponse } from "./types";

export async function checkHealth(): Promise<HealthResponse> {
  return registryRequest<HealthResponse>("/health");
}
