import type { SealedField } from "@defarm/sdk/core";
import { registryRequest } from "./client";

// Rotas de chave e caixa de entrada de campos selados, com a sessão do usuário (engines #755).

export interface WorkspaceKey {
  key_id: string;
  public_key_b64: string;
  is_active: boolean;
  revoked_at: string | null;
  retired_at: string | null;
}

export interface RecipientSealedField {
  dfid: string;
  event_id: string;
  event_type: string;
  occurred_at: string;
  field_path: string;
  content_type: string;
  recipient_enc_key_id: string;
  sealed_field: SealedField;
  sealer_workspace_id: string;
  sealer_key_id: string;
  authorship_verified: boolean;
  sealer_public_key_b64: string | null;
  circuit_id?: string | null;
}

export interface SealedFieldsPage {
  sealed_fields: RecipientSealedField[];
  next_cursor: string | null;
}

export const listEncryptionKeys = () => registryRequest<WorkspaceKey[]>("/workspace/encryption-keys");
export const listSigningKeys = () => registryRequest<WorkspaceKey[]>("/workspace/signing-keys");

export const registerSigningKey = (keyId: string, publicKeyB64: string) =>
  registryRequest<WorkspaceKey>("/workspace/signing-keys", {
    method: "POST",
    body: JSON.stringify({
      key_id: keyId,
      algorithm: "ed25519",
      public_key_b64: publicKeyB64,
      metadata: { origin: "browser" },
    }),
  });

export const registerEncryptionKey = (keyId: string, publicKeyB64: string, signingKeyId: string, bindingSigB64: string) =>
  registryRequest<WorkspaceKey>("/workspace/encryption-keys", {
    method: "POST",
    body: JSON.stringify({
      key_id: keyId,
      algorithm: "x25519",
      public_key_b64: publicKeyB64,
      signing_key_id: signingKeyId,
      binding_sig_b64: bindingSigB64,
      metadata: { origin: "browser" },
    }),
  });

export function listSealedFields(cursor?: string | null) {
  const q = new URLSearchParams({ limit: "200" });
  if (cursor) q.set("cursor", cursor);
  return registryRequest<SealedFieldsPage>(`/workspace/sealed-fields?${q.toString()}`);
}
