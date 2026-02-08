// DeFarm API - Unified entry point
// All requests go through the API Gateway at:
// https://gateway-service-production-f54d.up.railway.app
//
// Auth endpoints: /auth/*
// Registry endpoints: /api/*

// ==========================================
// Re-export everything from the Registry API
// ==========================================
export * from "./api";

// Re-export token utilities from client
export {
  getAccessToken,
  getRefreshToken,
  storeTokens,
  clearTokens,
} from "./api/client";

// ==========================================
// Auth types & functions (via Gateway)
// ==========================================
import {
  authRequest,
  storeTokens,
  clearTokens,
  getAccessToken,
} from "./api/client";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  workspace_slug: string;
  workspace_name?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user_id: string;
  workspace_id: string;
  expires_at?: number;
  token_type?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  workspace_id: string;
}

// User storage
const USER_KEY = "defarm_user";

export function getStoredToken(): string | null {
  return getAccessToken();
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

export function storeAuth(accessToken: string, user: User, refreshToken?: string): void {
  storeTokens(accessToken, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  clearTokens();
  localStorage.removeItem(USER_KEY);
}

// Auth endpoints (via Gateway)
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

export async function refreshToken(refresh_token: string): Promise<AuthResponse> {
  return authRequest<AuthResponse>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token }),
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
