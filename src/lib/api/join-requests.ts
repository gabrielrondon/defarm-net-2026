import { registryRequest, registryPublicRequest, buildQueryString } from "./client";
import type {
  JoinRequest,
  CreateJoinRequestRequest,
  ReviewJoinRequestInput,
  PublicCircuitsResponse,
  PublicCircuitPortfolio,
  PublicItem,
  PublicCanonicalIdentifier,
  PublicItemProofs,
  PublicItemEvent,
  PrivateLocationResponse,
} from "./types";

// Public endpoints (no auth required for discovery)
export async function getPublicCircuits(params?: {
  search?: string;
  circuit_type?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
}): Promise<PublicCircuitsResponse> {
  return registryRequest<PublicCircuitsResponse>(
    `/circuits/public${buildQueryString(params as Record<string, unknown>)}`
  );
}

export async function getPublicCircuit(id: string): Promise<PublicCircuitPortfolio> {
  return registryRequest<PublicCircuitPortfolio>(`/circuits/${id}/public`);
}

// Public item endpoints (no auth required)
export async function getPublicItem(dfid: string): Promise<PublicItem> {
  return registryRequest<PublicItem>(`/items/${dfid}/public`);
}

export async function getPrivateItemLocation(dfid: string): Promise<PrivateLocationResponse> {
  return registryRequest<PrivateLocationResponse>(`/items/${dfid}/location/private`);
}

export async function getPublicItemCanonicalIdentifier(
  dfid: string
): Promise<PublicCanonicalIdentifier> {
  return registryRequest<PublicCanonicalIdentifier>(`/items/${dfid}/canonical/public`);
}

export interface PublicIdentifierEntry {
  identifier_type: string;
  value: string;
  is_canonical: boolean;
}
export interface PublicIdentifiers {
  identifiers: PublicIdentifierEntry[];
}
// Todos os identificadores PÚBLICOS (não-PII) do item — canônicos e contextuais
// (ex.: chip + SISBOV). O backend já filtra CPF/CNPJ/IE.
export async function getPublicItemIdentifiers(dfid: string): Promise<PublicIdentifiers> {
  return registryRequest<PublicIdentifiers>(`/items/${dfid}/identifiers/public`);
}

export async function getPublicItemProofs(dfid: string): Promise<PublicItemProofs> {
  return registryRequest<PublicItemProofs>(`/items/${dfid}/proofs/public`);
}

export async function resolvePublicItemByIdentifier(
  identifierType: string,
  identifierValue: string
): Promise<{ dfid: string; url: string }> {
  return registryRequest<{ dfid: string; url: string }>(
    `/items/public/resolve/${encodeURIComponent(identifierType)}/${encodeURIComponent(identifierValue)}`
  );
}

export async function getPublicItemEvents(
  dfid: string,
  params?: { event_type?: string; limit?: number; offset?: number }
): Promise<PublicItemEvent[]> {
  return registryRequest<PublicItemEvent[]>(
    `/items/${dfid}/events/public${buildQueryString(params as Record<string, unknown>)}`
  );
}

export interface PublicSanitaryAttestation {
  receipt_id: string;
  sanitary_status?: string | null;
  animal_status?: string | null;
  issuer_workspace_id: string;
  issued_at?: string | null;
  valid_until?: string | null;
  signature_verified?: boolean | null;
  verify_url: string;
}

// ---- /verify público (#8): âncora + receita reproduzível + flags de honestidade ----
export interface VerifyIdentity {
  value_chain: string;
  country: string;
  year: number;
  status: string;
}
export interface VerifyIdentifier {
  identifier_type: string;
  value: string;
  is_canonical: boolean;
}
export interface VerifyAnchor {
  transaction_hash: string;
  chain_type: string;
  status: string;
  anchored_at: string;
  network: string;
  explorer_url: string;
  ledger_number?: number | null;
  anchor_type?: string | null;
  anchored_dfid?: string | null;
  metadata_cid?: string | null;
  anchor_content_root?: string | null;
  snapshot_hash?: string | null;
  events_root?: string | null;
  commitments_root?: string | null;
  content_root_onchain: boolean;
  onchain_content_binding?: string | null;
  cid_onchain: boolean;
  anchor_content_root_location?: string | null;
}
export interface VerifyEvent {
  event_type: string;
  source_type: string;
  trust_score: number;
  trust_level: string;
  occurred_at: string;
  issuer_workspace_id?: string | null;
  signature_verified?: boolean | null;
  signature_key_id?: string | null;
  signature_public_key_b64?: string | null;
  content_hash?: string | null;
}
export interface VerifyMethod {
  event_hash_alg: string;
  content_hash_canonicalization: string;
  signature_alg: string;
  signature_canonicalization: string;
  anchor_binding: string;
  anchor_content_root_canonicalization: string;
  steps: string[];
}
export interface VerifyLinks {
  full_metadata: string;
  proofs: string;
  events: string;
}
export interface PublicVerifyResponse {
  dfid: string;
  identity?: VerifyIdentity;
  identifiers?: VerifyIdentifier[];
  anchor?: VerifyAnchor | null;
  events?: VerifyEvent[];
  issuers?: string[];
  sanitary_attestation?: PublicSanitaryAttestation | null;
  certificate_url?: string;
  links?: VerifyLinks;
  verification?: VerifyMethod;
}

// `lang` localiza só a PROSA reproduzível (verification.steps + *_canonicalization +
// anchor_binding). Prefix-match no backend (pt|en|es, default pt); field names/hashes/
// flags são idioma-neutros. Sem `lang` → PT (compat com backend anterior ao ?lang=).
export async function verifyPublicItem(
  dfid: string,
  lang?: string
): Promise<PublicVerifyResponse> {
  const qs = lang ? buildQueryString({ lang }) : "";
  return registryPublicRequest<PublicVerifyResponse>(
    `/verify/${encodeURIComponent(dfid)}${qs}`
  );
}

// Join Requests (JWT required)
export async function createJoinRequest(
  circuitId: string,
  data?: CreateJoinRequestRequest
): Promise<JoinRequest> {
  return registryRequest<JoinRequest>(`/circuits/${circuitId}/join-requests`, {
    method: "POST",
    body: JSON.stringify(data || {}),
  });
}

// Admin: list join requests
export async function getJoinRequests(
  circuitId: string,
  status?: string
): Promise<JoinRequest[]> {
  const qs = status ? buildQueryString({ status }) : "";
  return registryRequest<JoinRequest[]>(
    `/circuits/${circuitId}/join-requests${qs}`
  );
}

// Admin: approve/reject join request
export async function reviewJoinRequest(
  circuitId: string,
  requestId: string,
  data: ReviewJoinRequestInput
): Promise<JoinRequest> {
  return registryRequest<JoinRequest>(
    `/circuits/${circuitId}/join-requests/${requestId}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
}

// User: list own join requests across circuits
export async function getMyJoinRequests(status?: string): Promise<JoinRequest[]> {
  const qs = status ? buildQueryString({ status }) : "";
  return registryRequest<JoinRequest[]>(`/join-requests/mine${qs}`);
}

// Remove item from circuit (N:N)
export async function removeItemFromCircuit(
  circuitId: string,
  itemId: string
): Promise<void> {
  await registryRequest(`/circuits/${circuitId}/items/${itemId}`, {
    method: "DELETE",
  });
}
