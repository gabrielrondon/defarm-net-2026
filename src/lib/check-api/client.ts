// DeFarm Check API Client (Compliance)
// Proxied through Gateway → /api/compliance/*
// Gateway injects X-API-Key server-side

import { GATEWAY_BASE, getAccessToken } from "@/lib/api/client";

export const CHECK_API_BASE = `${GATEWAY_BASE}/api/compliance`;

export class CheckApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "CheckApiError";
  }
}

export async function checkRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${CHECK_API_BASE}${endpoint}`;
  console.log(`[DeFarm Check] ${options.method || "GET"} ${url}`);

  try {
    const response = await fetch(url, { ...options, headers });
    console.log(`[DeFarm Check] Response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[DeFarm Check] Error:`, errorData);
      throw new CheckApiError(
        response.status,
        errorData.error || "UNKNOWN_ERROR",
        errorData.message || `Request failed with status ${response.status}`
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  } catch (error) {
    if (error instanceof CheckApiError) throw error;
    console.error(`[DeFarm Check] Network error:`, error);
    throw error;
  }
}
