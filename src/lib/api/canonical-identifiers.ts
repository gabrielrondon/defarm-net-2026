import { registryRequest } from "./client";
import type {
  CanonicalIdentifierResponse,
  CreateCanonicalIdentifierRequest,
  UpdateCanonicalIdentifierRequest,
} from "./types";

export async function createCanonicalIdentifier(
  data: CreateCanonicalIdentifierRequest
): Promise<CanonicalIdentifierResponse> {
  return registryRequest<CanonicalIdentifierResponse>(
    "/admin/canonical-identifiers",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export async function listCanonicalIdentifiers(
  valueChain: string
): Promise<CanonicalIdentifierResponse[]> {
  return registryRequest<CanonicalIdentifierResponse[]>(
    `/admin/canonical-identifiers/value-chain/${encodeURIComponent(valueChain)}`
  );
}

export async function updateCanonicalIdentifier(
  id: string,
  data: UpdateCanonicalIdentifierRequest
): Promise<CanonicalIdentifierResponse> {
  return registryRequest<CanonicalIdentifierResponse>(
    `/admin/canonical-identifiers/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}
