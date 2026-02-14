import { authRequest } from "./client";

// --- Admin User Management (via Gateway /api/admin/*) ---

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  workspace_id: string;
  created_at: string;
  last_login_at?: string | null;
}

export interface ListAdminUsersResponse {
  users: AdminUser[];
  count: number;
}

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
  status: string;
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
export async function listAdminUsers(): Promise<ListAdminUsersResponse> {
  return authRequest<ListAdminUsersResponse>("/api/admin/users");
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
