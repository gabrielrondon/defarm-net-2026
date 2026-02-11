// DeFarm Check API Client (Compliance)
// Separate service from Registry and Finance

export const CHECK_BASE = "https://defarm-check-api-production.up.railway.app";

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
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  const url = `${CHECK_BASE}${endpoint}`;
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
