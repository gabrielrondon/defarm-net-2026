// DeFarm API Client - via Gateway
// All frontend requests go through the API Gateway
// Uses VITE_API_BASE_URL env var with production fallback
const GATEWAY_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "https://gateway-service-production-f54d.up.railway.app";

// Registry endpoints are prefixed with /api on the gateway
export const REGISTRY_API_BASE = `${GATEWAY_BASE}/api`;

// Auth endpoints live at the gateway root
export const AUTH_API_BASE = GATEWAY_BASE;

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Build query string from params object
export function buildQueryString(params?: Record<string, any>): string {
  if (!params) return "";
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (entries.length === 0) return "";
  const qs = entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return `?${qs}`;
}

// Token storage keys
const ACCESS_TOKEN_KEY = "defarm_token";
const REFRESH_TOKEN_KEY = "defarm_refresh_token";

// Get stored access token
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

// Get stored refresh token
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

// Store tokens
export function storeTokens(accessToken: string, refreshToken?: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

// Clear tokens
export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// Refresh the access token using the refresh token
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${AUTH_API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      clearTokens();
      return null;
    }

    const data = await response.json();
    storeTokens(data.access_token, data.refresh_token);
    return data.access_token;
  } catch {
    clearTokens();
    return null;
  }
}

// Generic API request helper for the Registry API (via Gateway)
// Automatically attaches Bearer token and handles 401 with refresh
export async function registryRequest<T>(
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

  const url = `${REGISTRY_API_BASE}${endpoint}`;
  console.log(`[DeFarm API] ${options.method || "GET"} ${url}`);

  try {
    let response = await fetch(url, { ...options, headers });

    // If 401, try to refresh token and retry once
    if (response.status === 401 && token) {
      console.log("[DeFarm API] Token expired, attempting refresh...");
      const newToken = await refreshAccessToken();
      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`;
        response = await fetch(url, { ...options, headers });
      }
    }

    console.log(`[DeFarm API] Response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[DeFarm API] Error:`, errorData);
      throw new ApiError(
        response.status,
        errorData.error || "UNKNOWN_ERROR",
        errorData.message || `Request failed with status ${response.status}`
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error(`[DeFarm API] Network error:`, error);
    throw error;
  }
}

// Auth API request helper (no /api prefix, no auto-auth)
export async function authRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${AUTH_API_BASE}${endpoint}`;
  console.log(`[DeFarm Auth] ${options.method || "GET"} ${url}`);

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      errorData.error || "AUTH_ERROR",
      errorData.message || `Auth request failed with status ${response.status}`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}
