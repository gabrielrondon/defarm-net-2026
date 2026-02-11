// DeFarm Finance API Client
// Separate service from Registry - different base URL

export const FINANCE_BASE = "https://finance-go-production.up.railway.app";

export class FinanceApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "FinanceApiError";
  }
}

export function buildFinanceQS(params?: Record<string, any>): string {
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

export async function financeRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  const url = `${FINANCE_BASE}${endpoint}`;
  console.log(`[DeFarm Finance] ${options.method || "GET"} ${url}`);

  try {
    const response = await fetch(url, { ...options, headers });
    console.log(`[DeFarm Finance] Response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[DeFarm Finance] Error:`, errorData);
      throw new FinanceApiError(
        response.status,
        errorData.error || "UNKNOWN_ERROR",
        errorData.message || errorData.error || `Request failed with status ${response.status}`
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  } catch (error) {
    if (error instanceof FinanceApiError) throw error;
    console.error(`[DeFarm Finance] Network error:`, error);
    throw error;
  }
}
