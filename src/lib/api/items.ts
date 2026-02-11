import { registryRequest, buildQueryString } from "./client";
import type {
  Item,
  ListItemsResponse,
  CreateItemRequest,
  UpdateItemRequest,
  UpdateItemStatusRequest,
  ItemFilters,
  MergeItemsRequest,
  MergeItemsResponse,
  SplitItemRequest,
  SplitItemResponse,
  UnmergeItemRequest,
  UnmergeItemResponse,
  IngestionReceipt,
} from "./types";

export async function getItems(params?: ItemFilters): Promise<Item[]> {
  const response = await registryRequest<ListItemsResponse>(
    `/items${buildQueryString(params as Record<string, any>)}`
  );
  return response.items;
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

// Convenience: get items in a specific circuit
export async function getCircuitItems(circuitId: string): Promise<Item[]> {
  return getItems({ circuit_id: circuitId });
}

// Convenience: associate an item with a circuit
export async function pushItemToCircuit(
  circuitId: string,
  itemId: string
): Promise<Item> {
  // Note: circuit_id is immutable on items; this only tags metadata.
  return updateItem(itemId, { metadata: { circuit_id: circuitId } });
}

// Bulk import (CSV or JSON)
export async function bulkIngestItems(
  file: File,
  circuitId: string
): Promise<IngestionReceipt> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("circuit_id", circuitId);

  // Don't set Content-Type header - browser will set it with boundary for multipart
  return registryRequest<IngestionReceipt>("/items/bulk", {
    method: "POST",
    headers: {},
    body: formData as unknown as BodyInit,
  });
}

// Workflow: Merge items
export async function mergeItems(
  primaryDfid: string,
  data: MergeItemsRequest
): Promise<MergeItemsResponse> {
  return registryRequest<MergeItemsResponse>(`/items/${primaryDfid}/merge`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Workflow: Split item
export async function splitItem(
  dfid: string,
  data: SplitItemRequest
): Promise<SplitItemResponse> {
  return registryRequest<SplitItemResponse>(`/items/${dfid}/split`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Workflow: Unmerge item
export async function unmergeItem(
  dfid: string,
  data: UnmergeItemRequest
): Promise<UnmergeItemResponse> {
  return registryRequest<UnmergeItemResponse>(`/items/${dfid}/unmerge`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Get item relationships
export async function getItemRelationships(dfid: string) {
  return registryRequest(`/items/${dfid}/relationships`);
}
