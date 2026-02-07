import { registryRequest, buildQueryString } from "./client";
import type {
  Item,
  ListItemsResponse,
  CreateItemRequest,
  UpdateItemRequest,
  UpdateItemStatusRequest,
  ItemFilters,
} from "./types";

export async function getItems(params?: ItemFilters): Promise<ListItemsResponse> {
  return registryRequest<ListItemsResponse>(`/items${buildQueryString(params)}`);
}

export async function getItem(id: string): Promise<Item> {
  return registryRequest<Item>(`/items/${id}`);
}

export async function createItem(data: CreateItemRequest): Promise<Item> {
  return registryRequest<Item>("/items", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateItem(id: string, data: UpdateItemRequest): Promise<Item> {
  return registryRequest<Item>(`/items/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteItem(id: string, userId?: string): Promise<void> {
  const qs = userId ? `?user_id=${userId}` : "";
  await registryRequest(`/items/${id}${qs}`, { method: "DELETE" });
}

export async function updateItemStatus(
  id: string,
  data: UpdateItemStatusRequest
): Promise<Item> {
  return registryRequest<Item>(`/items/${id}/status`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// Workflow endpoints
export async function mergeItems(
  primaryDfid: string,
  secondaryDfid: string,
  strategy: string,
  userId?: string
) {
  return registryRequest(`/items/${primaryDfid}/merge`, {
    method: "POST",
    body: JSON.stringify({ secondary_dfid: secondaryDfid, strategy, user_id: userId }),
  });
}

export async function splitItem(
  dfid: string,
  data: { value_chain: string; country: string; year: number; metadata: Record<string, unknown>; user_id?: string }
) {
  return registryRequest(`/items/${dfid}/split`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getItemRelationships(dfid: string) {
  return registryRequest(`/items/${dfid}/relationships`);
}
