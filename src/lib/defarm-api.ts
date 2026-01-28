// DeFarm API Client
// Base URL for all API calls
const API_BASE_URL = "https://connect.defarm.net/api";

// Auth token storage
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

export interface Circuit {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  status: "Active" | "Inactive";
  members?: CircuitMember[];
  permissions?: CircuitPermissions;
  adapter_config?: AdapterConfig;
}

export interface CircuitMember {
  user_id: string;
  role: "Owner" | "Admin" | "Member" | "Viewer";
  joined_at: string;
}

export interface CircuitPermissions {
  allow_public_visibility: boolean;
  require_approval_for_push: boolean;
  require_approval_for_pull: boolean;
  allow_member_invite: boolean;
}

export interface AdapterConfig {
  adapter_type: "none" | "StellarTestnetIpfs" | "StellarMainnetIpfs";
  requires_approval: boolean;
  auto_migrate_existing: boolean;
}

export interface CreateCircuitRequest {
  name: string;
  description: string;
  adapter_config?: AdapterConfig;
  allow_public_visibility?: boolean;
}

export interface Item {
  dfid: string;
  local_id: string;
  identifiers: Identifier[];
  enriched_data?: Record<string, unknown>;
  creation_timestamp: string;
  last_modified: string;
  status: "Active" | "Deprecated" | "Merged" | "Split";
  confidence_score?: number;
}

export interface Identifier {
  namespace?: string;
  key: string;
  value: string;
  id_type?: "Canonical" | "Contextual";
  scope?: string;
  verified?: boolean;
}

export interface CreateItemRequest {
  identifiers: Identifier[];
  enriched_data?: Record<string, unknown>;
}

export interface Event {
  id: string;
  event_type: string;
  dfid: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  visibility: "Public" | "Private" | "CircuitOnly";
  is_encrypted: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  description?: string;
  created_at: string;
  tier: "Free" | "Starter" | "Professional" | "Enterprise";
}

// Error handling
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

// API request helper
async function apiRequest<T>(
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
  
  console.log(`[DeFarm API] ${options.method || 'GET'} ${API_BASE_URL}${endpoint}`);
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
    
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
    
    return response.json();
  } catch (error) {
    console.error(`[DeFarm API] Network error:`, error);
    throw error;
  }
}

// Auth endpoints
export async function login(data: LoginRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function logout(): Promise<void> {
  try {
    await apiRequest("/auth/logout", { method: "POST" });
  } finally {
    clearAuth();
  }
}

// Workspace endpoints
export async function getWorkspace(workspaceId: string): Promise<Workspace> {
  return apiRequest<Workspace>(`/workspaces/${workspaceId}`);
}

export async function getMyWorkspaces(): Promise<Workspace[]> {
  return apiRequest<Workspace[]>("/workspaces");
}

// Circuit endpoints
export async function getCircuits(): Promise<Circuit[]> {
  return apiRequest<Circuit[]>("/circuits");
}

export async function getCircuit(circuitId: string): Promise<Circuit> {
  return apiRequest<Circuit>(`/circuits/${circuitId}`);
}

export async function createCircuit(data: CreateCircuitRequest): Promise<Circuit> {
  return apiRequest<Circuit>("/circuits", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCircuit(circuitId: string, data: Partial<CreateCircuitRequest>): Promise<Circuit> {
  return apiRequest<Circuit>(`/circuits/${circuitId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteCircuit(circuitId: string): Promise<void> {
  await apiRequest(`/circuits/${circuitId}`, { method: "DELETE" });
}

// Circuit items
export async function getCircuitItems(circuitId: string): Promise<Item[]> {
  return apiRequest<Item[]>(`/circuits/${circuitId}/items`);
}

export async function pushItemToCircuit(circuitId: string, localId: string): Promise<Item> {
  return apiRequest<Item>(`/circuits/${circuitId}/push`, {
    method: "POST",
    body: JSON.stringify({ local_id: localId }),
  });
}

// Item endpoints
export async function getItems(): Promise<Item[]> {
  return apiRequest<Item[]>("/items");
}

export async function getItem(itemId: string): Promise<Item> {
  return apiRequest<Item>(`/items/${itemId}`);
}

export async function createItem(data: CreateItemRequest): Promise<Item> {
  return apiRequest<Item>("/items", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getItemEvents(itemId: string): Promise<Event[]> {
  return apiRequest<Event[]>(`/items/${itemId}/events`);
}

// Events endpoints
export async function getEvents(circuitId?: string): Promise<Event[]> {
  const endpoint = circuitId ? `/circuits/${circuitId}/events` : "/events";
  return apiRequest<Event[]>(endpoint);
}

// Stats (workspace-level)
export async function getWorkspaceStats(): Promise<{
  total_items: number;
  total_circuits: number;
  total_events: number;
  items_this_month: number;
}> {
  return apiRequest("/workspaces/stats");
}
