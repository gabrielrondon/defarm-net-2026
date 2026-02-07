// DeFarm Item Registry API Client
// Base URL for the Item Registry service
export const REGISTRY_API_BASE = "https://item-registry-production.up.railway.app";

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
export function buildQueryString(params?: Record<string, unknown>): string {
  if (!params) return "";
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (entries.length === 0) return "";
  const qs = entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
  return `?${qs}`;
}

// Generic API request helper for the Registry API
export async function registryRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const url = `${REGISTRY_API_BASE}${endpoint}`;
  console.log(`[Registry API] ${options.method || "GET"} ${url}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log(`[Registry API] Response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[Registry API] Error:`, errorData);
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
    console.error(`[Registry API] Network error:`, error);
    throw error;
  }
}
