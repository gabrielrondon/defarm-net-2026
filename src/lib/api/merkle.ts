import { registryRequest, buildQueryString } from "./client";
import type {
  MerkleTree,
  ListMerkleTreesResponse,
  CreateMerkleTreeRequest,
  MerkleProof,
  GenerateProofRequest,
  VerificationResponse,
  VerifyProofRequest,
  VerificationHistoryResponse,
  MerkleTreeFilters,
} from "./types";

// Merkle Tree CRUD
export async function getMerkleTrees(params?: MerkleTreeFilters): Promise<MerkleTree[]> {
  const response = await registryRequest<ListMerkleTreesResponse>(
    `/merkle-trees${buildQueryString(params as Record<string, any>)}`
  );
  return response.trees;
}

export async function getMerkleTree(id: string): Promise<MerkleTree> {
  return registryRequest<MerkleTree>(`/merkle-trees/${id}`);
}

export async function createMerkleTree(data: CreateMerkleTreeRequest): Promise<MerkleTree> {
  return registryRequest<MerkleTree>("/merkle-trees", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteMerkleTree(id: string): Promise<void> {
  await registryRequest(`/merkle-trees/${id}`, { method: "DELETE" });
}

// Proof operations
export async function generateProof(
  treeId: string,
  data: GenerateProofRequest
): Promise<MerkleProof> {
  return registryRequest<MerkleProof>(`/merkle-trees/${treeId}/generate-proof`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function verifyTree(treeId: string): Promise<VerificationResponse> {
  return registryRequest<VerificationResponse>(`/merkle-trees/${treeId}/verify`, {
    method: "POST",
  });
}

export async function verifyProof(
  treeId: string,
  data: VerifyProofRequest
): Promise<VerificationResponse> {
  return registryRequest<VerificationResponse>(`/merkle-trees/${treeId}/verify-proof`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Verification history
export async function getVerificationHistory(
  treeId: string,
  limit?: number
): Promise<VerificationHistoryResponse> {
  const qs = limit ? `?limit=${limit}` : "";
  return registryRequest<VerificationHistoryResponse>(
    `/merkle-trees/${treeId}/verifications${qs}`
  );
}
