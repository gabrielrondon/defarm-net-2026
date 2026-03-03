import { authRequest } from "./client";

export type WorkspaceSourceType =
  | "government"
  | "sanitary_agency"
  | "authority"
  | "certifier"
  | "partner"
  | "producer"
  | "processor"
  | "integration"
  | "manual"
  | "system";

export interface WorkspaceTrustProfile {
  workspace_id: string;
  source_type: WorkspaceSourceType;
  notes?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export async function listWorkspaceTrustProfiles(workspaceId?: string): Promise<WorkspaceTrustProfile[]> {
  const query = workspaceId ? `?workspace_id=${encodeURIComponent(workspaceId)}` : "";
  return authRequest<WorkspaceTrustProfile[]>(`/api/admin/workspace-trust-profiles${query}`);
}

export async function upsertWorkspaceTrustProfile(
  workspaceId: string,
  sourceType: WorkspaceSourceType,
  notes?: string
): Promise<WorkspaceTrustProfile> {
  return authRequest<WorkspaceTrustProfile>(`/api/admin/workspace-trust-profiles/${workspaceId}`, {
    method: "PUT",
    body: JSON.stringify({
      source_type: sourceType,
      notes: notes || undefined,
    }),
  });
}

export async function deleteWorkspaceTrustProfile(workspaceId: string): Promise<void> {
  return authRequest<void>(`/api/admin/workspace-trust-profiles/${workspaceId}`, {
    method: "DELETE",
  });
}
