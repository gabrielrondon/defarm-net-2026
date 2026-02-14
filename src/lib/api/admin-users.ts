import { authRequest } from "./client";

// --- Admin User Management (via Gateway /api/admin/*) ---

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  workspace_id: string;
  workspace_name?: string;
  created_at: string;
  updated_at?: string;
  last_login_at?: string | null;
}

// Response can be array or { users: [] }
export type ListAdminUsersResponse = { users: AdminUser[]; count?: number } | AdminUser[];

export interface CreateAdminUserRequest {
  email: string;
  password: string;
  full_name: string;
  role: string;
  workspace_slug?: string;
}

export interface UpdateUserRoleRequest {
  role: string;
}

export interface UpdateUserStatusRequest {
  is_active: boolean;
}

// --- Adapter Stats ---

export interface AdapterStatsResponse {
  jobs: {
    completed: number;
    failed: number;
    total: number;
    success_rate: number;
  };
  queue: {
    depth: number;
    active_workers: number;
  };
  adapters: Record<string, { success: number; failed: number; success_rate: number }>;
  costs: {
    stellar_xlm: number;
    stellar_usd: number;
    ipfs_storage_bytes: number;
    ipfs_storage_gb: number;
  };
  rate_limits: {
    rejections: number;
  };
}

// User Management endpoints
export async function listAdminUsers(): Promise<AdminUser[]> {
  const res = await authRequest<ListAdminUsersResponse>("/api/admin/users");
  return Array.isArray(res) ? res : res.users || [];
}

export async function createAdminUser(data: CreateAdminUserRequest): Promise<AdminUser> {
  return authRequest<AdminUser>("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteAdminUser(userId: string): Promise<void> {
  return authRequest<void>(`/api/admin/users/${userId}`, {
    method: "DELETE",
  });
}

export async function updateUserRole(userId: string, data: UpdateUserRoleRequest): Promise<AdminUser> {
  return authRequest<AdminUser>(`/api/admin/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function updateUserStatus(userId: string, data: UpdateUserStatusRequest): Promise<AdminUser> {
  return authRequest<AdminUser>(`/api/admin/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// Adapter Stats endpoint
export async function getAdapterStats(): Promise<AdapterStatsResponse> {
  return authRequest<AdapterStatsResponse>("/api/admin/adapter/stats");
}
