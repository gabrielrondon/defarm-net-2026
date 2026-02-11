import { AUTH_API_BASE, ApiError } from "./client";
import type { HealthResponse } from "./types";

export async function checkHealth(): Promise<HealthResponse> {
  const response = await fetch(`${AUTH_API_BASE}/health`);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      "HEALTH_ERROR",
      `Health request failed with status ${response.status}`
    );
  }
  return response.json();
}
