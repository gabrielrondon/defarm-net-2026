import { registryRequest } from "./client";

// Artifact-model Track B: feed entre circuitos (auto-publish com consentimento).
export interface CircuitFeed {
  id: string;
  source_circuit_id: string;
  target_circuit_id: string;
  direction: "grant" | "invite";
  status: "pending" | "active" | "revoked";
  scope_artifact_types: string[] | null;
  mode: string;
  created_at: string;
  activated_at: string | null;
  revoked_at: string | null;
}

export interface CreateCircuitFeedResponse {
  feed: CircuitFeed;
  /** Itens existentes do source já adicionados ao target (backfill retroativo). */
  backfilled: number;
}

export async function listCircuitFeeds(circuitId: string): Promise<CircuitFeed[]> {
  return registryRequest<CircuitFeed[]>(`/circuits/${circuitId}/feeds`);
}

export async function createCircuitFeed(
  sourceCircuitId: string,
  targetCircuitId: string,
  scopeArtifactTypes: string[] | null,
): Promise<CreateCircuitFeedResponse> {
  return registryRequest<CreateCircuitFeedResponse>(`/circuits/${sourceCircuitId}/feeds`, {
    method: "POST",
    body: JSON.stringify({
      target_circuit_id: targetCircuitId,
      scope_artifact_types: scopeArtifactTypes,
    }),
  });
}

export async function revokeCircuitFeed(
  sourceCircuitId: string,
  feedId: string,
): Promise<void> {
  return registryRequest<void>(`/circuits/${sourceCircuitId}/feeds/${feedId}/revoke`, {
    method: "POST",
  });
}
