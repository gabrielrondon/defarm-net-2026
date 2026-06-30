import { registryRequest } from "./client";

// Artifact-model Track B: feed entre circuitos (auto-publish com consentimento).
export interface CircuitFeed {
  id: string;
  source_circuit_id: string;
  target_circuit_id: string;
  direction: "grant" | "invite" | "request";
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

// --- B2: feed bidirecional com consentimento ---

/** Convite (direction='invite'): o dono do TARGET convida um source a alimentá-lo. */
export async function createFeedInvitation(
  targetCircuitId: string,
  sourceCircuitId: string,
  scopeArtifactTypes: string[] | null,
): Promise<CircuitFeed> {
  return registryRequest<CircuitFeed>(`/circuits/${targetCircuitId}/feed-invitations`, {
    method: "POST",
    body: JSON.stringify({
      source_circuit_id: sourceCircuitId,
      scope_artifact_types: scopeArtifactTypes,
    }),
  });
}

/** Pedido (direction='request'): o dono do SOURCE pede p/ alimentar um target. */
export async function createFeedRequest(
  sourceCircuitId: string,
  targetCircuitId: string,
  scopeArtifactTypes: string[] | null,
): Promise<CircuitFeed> {
  return registryRequest<CircuitFeed>(`/circuits/${sourceCircuitId}/feed-requests`, {
    method: "POST",
    body: JSON.stringify({
      target_circuit_id: targetCircuitId,
      scope_artifact_types: scopeArtifactTypes,
    }),
  });
}

/** Aceitar/aprovar um feed pendente (o lado que consente). Ativa + backfill. */
export async function acceptFeed(feedId: string): Promise<CreateCircuitFeedResponse> {
  return registryRequest<CreateCircuitFeedResponse>(`/feeds/${feedId}/accept`, {
    method: "POST",
  });
}

/** Recusar um feed pendente (o lado que consente). */
export async function rejectFeed(feedId: string): Promise<void> {
  return registryRequest<void>(`/feeds/${feedId}/reject`, {
    method: "POST",
  });
}
