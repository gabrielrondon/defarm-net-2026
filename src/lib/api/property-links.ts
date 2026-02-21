import { buildQueryString, registryRequest } from "./client";
import type { AddPropertyLinkRequest, ListPropertyLinksResponse, PropertyLink } from "./types";

export async function addItemPropertyLink(itemId: string, data: AddPropertyLinkRequest): Promise<PropertyLink> {
  return registryRequest<PropertyLink>(`/items/${itemId}/properties`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listItemPropertyLinks(
  itemId: string,
  params?: { active_only?: boolean; is_transfer?: boolean; limit?: number; offset?: number }
): Promise<ListPropertyLinksResponse> {
  return registryRequest<ListPropertyLinksResponse>(
    `/items/${itemId}/properties${buildQueryString(params as Record<string, any>)}`
  );
}

export async function unlinkItemProperty(itemId: string, linkId: string): Promise<PropertyLink> {
  return registryRequest<PropertyLink>(`/items/${itemId}/properties/${linkId}`, {
    method: "DELETE",
  });
}

export async function listPropertyItems(
  propertyDfid: string,
  params?: { active_only?: boolean; limit?: number; offset?: number }
): Promise<ListPropertyLinksResponse> {
  return registryRequest<ListPropertyLinksResponse>(
    `/properties/${encodeURIComponent(propertyDfid)}/items${buildQueryString(params as Record<string, any>)}`
  );
}
