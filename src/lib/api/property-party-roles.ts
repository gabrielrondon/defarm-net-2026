import { buildQueryString, registryRequest } from "./client";

export interface CreatePropertyPartyRoleRequest {
  party_identifier_type: "cpf" | "cnpj";
  party_identifier_value: string;
  role: "owner" | "operator" | "manager";
  property_identifier_type?: string;
  property_identifier_value?: string;
  valid_from?: string;
  notes?: string;
  evidence_source?: string;
  evidence_ref?: string;
  metadata?: Record<string, unknown>;
}

export interface ReviewPropertyPartyRoleRequest {
  notes?: string;
  rejection_reason?: string;
}

export interface PropertyPartyRole {
  id: string;
  workspace_id: string;
  property_dfid: string;
  property_identifier_type?: string | null;
  property_identifier_value?: string | null;
  party_identifier_type: "cpf" | "cnpj";
  party_identifier_value: string;
  role: "owner" | "operator" | "manager";
  status: "pending" | "verified" | "rejected" | "ended";
  valid_from: string;
  valid_to?: string | null;
  evidence_source?: string | null;
  evidence_ref?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  submitted_by?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  ended_by?: string | null;
  ended_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListPropertyPartyRolesResponse {
  rows: PropertyPartyRole[];
  count: number;
}

export interface ListPropertyPartyRolesParams {
  status?: string;
  role?: string;
  property_dfid?: string;
  active_only?: boolean;
  limit?: number;
  offset?: number;
}

export async function createPropertyPartyRole(
  property_dfid: string,
  data: CreatePropertyPartyRoleRequest,
): Promise<PropertyPartyRole> {
  return registryRequest<PropertyPartyRole>(`/properties/${encodeURIComponent(property_dfid)}/parties`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listPropertyPartyRoles(
  property_dfid: string,
  params?: ListPropertyPartyRolesParams,
): Promise<ListPropertyPartyRolesResponse> {
  return registryRequest<ListPropertyPartyRolesResponse>(
    `/properties/${encodeURIComponent(property_dfid)}/parties${buildQueryString(params as Record<string, any>)}`
  );
}

export async function listMyPropertyPartyRoles(params?: ListPropertyPartyRolesParams): Promise<ListPropertyPartyRolesResponse> {
  return registryRequest<ListPropertyPartyRolesResponse>(
    `/property-party-roles/my${buildQueryString(params as Record<string, any>)}`
  );
}

export async function adminListPropertyPartyRoles(params?: ListPropertyPartyRolesParams): Promise<ListPropertyPartyRolesResponse> {
  return registryRequest<ListPropertyPartyRolesResponse>(
    `/admin/property-party-roles${buildQueryString(params as Record<string, any>)}`
  );
}

export async function adminVerifyPropertyPartyRole(id: string, data?: ReviewPropertyPartyRoleRequest): Promise<PropertyPartyRole> {
  return registryRequest<PropertyPartyRole>(`/admin/property-party-roles/${id}/verify`, {
    method: "PUT",
    body: JSON.stringify(data || {}),
  });
}

export async function adminRejectPropertyPartyRole(id: string, data?: ReviewPropertyPartyRoleRequest): Promise<PropertyPartyRole> {
  return registryRequest<PropertyPartyRole>(`/admin/property-party-roles/${id}/reject`, {
    method: "PUT",
    body: JSON.stringify(data || {}),
  });
}

export async function endPropertyPartyRole(
  property_dfid: string,
  id: string,
  data?: ReviewPropertyPartyRoleRequest,
): Promise<PropertyPartyRole> {
  return registryRequest<PropertyPartyRole>(
    `/properties/${encodeURIComponent(property_dfid)}/parties/${id}/end`,
    {
      method: "PUT",
      body: JSON.stringify(data || {}),
    }
  );
}
