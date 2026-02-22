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
  getRefreshToken,
} from "./api/client";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  workspace_slug?: string;
  workspace_name?: string;
  workspace_type?: "partner" | "producer" | "processor" | "certifier";
}

export interface AuthUser {
  id: string;
  email: string;
  email_verified?: boolean;
  pending_email?: string | null;
  full_name?: string | null;
  is_admin?: boolean;
  is_active?: boolean;
  workspace: {
    id: string;
    name: string;
    slug: string;
    tier: string;
    workspace_type: "partner" | "producer" | "processor" | "certifier";
    role: string;
  };
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
  // Legacy flat fields (backward compat)
  user_id?: string;
  workspace_id?: string;
  expires_at?: number;
}

export interface LoginChallengeResponse {
  requires_2fa: true;
  twofa_token: string;
  message: string;
}

export type LoginResponse = AuthResponse | LoginChallengeResponse;

export interface User {
  id: string;
  username: string;
  email: string;
  email_verified?: boolean;
  pending_email?: string | null;
  full_name?: string;
  avatar_url?: string | null;
  workspace_id: string;
  workspace_name?: string;
  workspace_slug?: string;
  workspace_type?: "partner" | "producer" | "processor" | "certifier";
  role?: string;
  is_admin?: boolean;
  is_active?: boolean;
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

export function setStoredUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// Auth endpoints (via Gateway)
export async function login(data: LoginRequest): Promise<LoginResponse> {
  return authRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function verifyLogin2FA(twofa_token: string, code: string): Promise<AuthResponse> {
  return authRequest<AuthResponse>("/auth/login/2fa", {
    method: "POST",
    body: JSON.stringify({ twofa_token, code }),
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
    const refresh = getRefreshToken();
    await authRequest("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refresh }),
    });
  } catch {
    console.log("[DeFarm Auth] Logout endpoint error, clearing local auth");
  } finally {
    clearAuth();
  }
}

export interface UpdateProfileRequest {
  full_name?: string;
  avatar_url?: string;
}

export interface ChangeEmailRequest {
  new_email: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface MessageResponse {
  message: string;
}

export interface UserWorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  tier: string;
  workspace_type: "partner" | "producer" | "processor" | "certifier";
  role: string;
  is_default: boolean;
}

export interface WorkspaceMemberInfo {
  user_id: string;
  email: string;
  full_name?: string | null;
  role: "owner" | "admin" | "member";
  is_admin: boolean;
  is_active: boolean;
  joined_at: string;
}

export interface WorkspaceMembersResponse {
  members: WorkspaceMemberInfo[];
  count: number;
}

export interface AddWorkspaceMemberRequest {
  email: string;
  role: "admin" | "member";
}

export interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  circuit_updates: boolean;
  item_alerts: boolean;
}

export interface TwoFaStatusResponse {
  enabled: boolean;
  recovery_codes_remaining: number;
}

export interface TwoFaSetupResponse {
  secret: string;
  otpauth_url: string;
}

export interface RecoveryCodesResponse {
  recovery_codes: string[];
}

export interface UserWorkspaceListResponse {
  workspaces: UserWorkspaceSummary[];
  count: number;
}

export interface AuthSession {
  id: string;
  user_id: string;
  started_at: string;
  last_activity_at: string;
  is_active: boolean;
  ended_at?: string | null;
  ip_address?: string | null;
  session_token?: string | null;
  user_agent?: string | null;
}

export interface AuthSessionsResponse {
  sessions: AuthSession[];
  count: number;
}

export async function getMe(): Promise<AuthUser> {
  return authRequest<AuthUser>("/auth/me");
}

export async function updateProfile(data: UpdateProfileRequest): Promise<AuthUser> {
  return authRequest<AuthUser>("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function requestEmailChange(data: ChangeEmailRequest): Promise<MessageResponse> {
  return authRequest<MessageResponse>("/auth/email/change/request", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function confirmEmailChange(token: string): Promise<MessageResponse> {
  return authRequest<MessageResponse>("/auth/email/change/confirm", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function changePassword(data: ChangePasswordRequest): Promise<MessageResponse> {
  return authRequest<MessageResponse>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function forgotPassword(data: ForgotPasswordRequest): Promise<MessageResponse> {
  return authRequest<MessageResponse>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function resetPassword(data: ResetPasswordRequest): Promise<MessageResponse> {
  return authRequest<MessageResponse>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function requestEmailVerification(): Promise<MessageResponse> {
  return authRequest<MessageResponse>("/auth/verify-email/request", {
    method: "POST",
  });
}

export async function verifyEmail(token: string): Promise<MessageResponse> {
  return authRequest<MessageResponse>("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function listMyWorkspaces(): Promise<UserWorkspaceListResponse> {
  return authRequest<UserWorkspaceListResponse>("/auth/workspaces");
}

export async function switchWorkspace(workspace_id: string): Promise<AuthResponse> {
  return authRequest<AuthResponse>("/auth/workspace/switch", {
    method: "POST",
    body: JSON.stringify({ workspace_id }),
  });
}

export async function listMySessions(): Promise<AuthSessionsResponse> {
  return authRequest<AuthSessionsResponse>("/auth/sessions");
}

export async function listWorkspaceMembers(): Promise<WorkspaceMembersResponse> {
  return authRequest<WorkspaceMembersResponse>("/auth/workspace/members");
}

export async function addWorkspaceMember(data: AddWorkspaceMemberRequest): Promise<WorkspaceMemberInfo> {
  return authRequest<WorkspaceMemberInfo>("/auth/workspace/members", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateWorkspaceMemberRole(
  memberUserId: string,
  role: "owner" | "admin" | "member"
): Promise<MessageResponse> {
  return authRequest<MessageResponse>(`/auth/workspace/members/${memberUserId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function removeWorkspaceMember(memberUserId: string): Promise<void> {
  return authRequest<void>(`/auth/workspace/members/${memberUserId}`, {
    method: "DELETE",
  });
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  return authRequest<NotificationPreferences>("/auth/notification-preferences");
}

export async function updateNotificationPreferences(
  data: NotificationPreferences
): Promise<NotificationPreferences> {
  return authRequest<NotificationPreferences>("/auth/notification-preferences", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function getTwoFaStatus(): Promise<TwoFaStatusResponse> {
  return authRequest<TwoFaStatusResponse>("/auth/2fa/status");
}

export async function setupTwoFa(): Promise<TwoFaSetupResponse> {
  return authRequest<TwoFaSetupResponse>("/auth/2fa/setup", {
    method: "POST",
  });
}

export async function enableTwoFa(code: string): Promise<RecoveryCodesResponse> {
  return authRequest<RecoveryCodesResponse>("/auth/2fa/enable", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function disableTwoFa(current_password: string): Promise<MessageResponse> {
  return authRequest<MessageResponse>("/auth/2fa/disable", {
    method: "POST",
    body: JSON.stringify({ current_password }),
  });
}

export async function regenerateRecoveryCodes(current_password: string): Promise<RecoveryCodesResponse> {
  return authRequest<RecoveryCodesResponse>("/auth/2fa/recovery-codes/regenerate", {
    method: "POST",
    body: JSON.stringify({ current_password }),
  });
}

export async function revokeMySession(sessionId: string): Promise<void> {
  return authRequest<void>(`/auth/sessions/${sessionId}`, {
    method: "DELETE",
  });
}

export async function revokeAllMySessions(): Promise<void> {
  return authRequest<void>("/auth/sessions", {
    method: "DELETE",
  });
}
