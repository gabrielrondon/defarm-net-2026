import { registryRequest, GATEWAY_BASE } from "./client";
import type {
  AdapterAnchorsResponse,
  TimelineResponse,
} from "./types";

// Get blockchain anchors (Stellar NFT + IPFS CIDs) for an item
// Endpoint: GET /api/adapter/items/{item_id}/anchors (via Gateway)
export async function getItemAnchors(itemId: string): Promise<AdapterAnchorsResponse> {
  const token = localStorage.getItem("defarm_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${GATEWAY_BASE}/api/adapter/items/${itemId}/anchors`;
  console.log(`[DeFarm API] GET ${url}`);

  try {
    const response = await fetch(url, { headers });
    console.log(`[DeFarm API] Anchors response status: ${response.status}`);
    
    if (!response.ok) {
      // Return empty anchors if endpoint not available yet
      if (response.status === 404) {
        return { item_id: itemId, blockchain_anchors: [], storage_refs: [] };
      }
      throw new Error(`Anchors request failed: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.warn("[DeFarm API] Anchors endpoint not available:", error);
    return { item_id: itemId, blockchain_anchors: [], storage_refs: [] };
  }
}

// Get item timeline
// Endpoint: GET /items/{id}/timeline (via Registry)
export async function getItemTimeline(itemId: string): Promise<TimelineResponse> {
  try {
    return await registryRequest<TimelineResponse>(`/items/${itemId}/timeline`);
  } catch (error) {
    console.warn("[DeFarm API] Timeline endpoint not available:", error);
    return { item_id: itemId, events: [] };
  }
}

// Get circuit timeline
export async function getCircuitTimeline(circuitId: string): Promise<TimelineResponse> {
  try {
    return await registryRequest<TimelineResponse>(`/circuits/${circuitId}/timeline`);
  } catch (error) {
    console.warn("[DeFarm API] Circuit timeline endpoint not available:", error);
    return { item_id: circuitId, events: [] };
  }
}
