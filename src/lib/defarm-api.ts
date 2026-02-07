// DeFarm API - Auth + Registry re-exports
// Auth endpoints use the connect.defarm.net API
// Registry endpoints use the Item Registry API (see src/lib/api/)

// ==========================================
// Re-export everything from the Registry API
// ==========================================
export * from "./api";

// ==========================================
// Auth types & functions (connect.defarm.net)
// ==========================================
const AUTH_API_BASE = "https://connect.defarm.net/api";
const TOKEN_KEY = "defarm_token";
const USER_KEY = "defarm_user";

export interface LoginRequest {
  username: string;
  password: string;
  workspace_id?: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email: string;
  workspace_name?: string;
}

export interface AuthResponse {
  token: string;
  user_id: string;
  workspace_id: string;
  expires_at: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  workspace_id: string;
}

// Token management
export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function storeAuth(token: string, user: User): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isTokenExpired(expiresAt: number): boolean {
  return Date.now() >= expiresAt * 1000;
}

// Auth API helper
async function authRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${AUTH_API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Auth request failed with status ${response.status}`);
  }

  return response.json();
}

// Auth endpoints
export async function login(data: LoginRequest): Promise<AuthResponse> {
  return authRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  return authRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function logout(): Promise<void> {
  try {
    await authRequest("/auth/logout", { method: "POST" });
  } catch {
    console.log("[DeFarm Auth] Logout endpoint error, clearing local auth");
  } finally {
    clearAuth();
  }
}
