/* Contrato da Proof, fechado em engines#650 e implementado no engines#652 (`PublicProofView`,
   `proofs.rs`). Este é o JSON que `GET /api/proofs/{id}` serve, em camelCase, e é sobre ELE
   (menos `state`, `commitment`, `commitmentAlg`) que o commitment é calculado. O `id` não
   vem no corpo: é a capability na URL. */

export type ProofState = "active";
export type ProofMode = "frozen" | "live";
export type ProofAudience = "link" | "named";
export type LegalBasisKey = "credit" | "contract" | "consent";
/** "own" = chave própria do emissor ativa (nível 2); "defarm" = chave operada pela plataforma (nível 1). */
export type ProofSigner = "own" | "defarm";

export interface ProofField { label: string; value: string }

/** Campo selado N2: sempre commitment/handle, nunca o valor. `label` é o nome de exibição. */
export interface SealedEntry { field?: string; label?: string; commitment?: string; [k: string]: unknown }

export interface ProofIssuer {
  name: string;
  /** 1 = atribuição (workspace sem chave própria); 2 = assinatura técnica verificável (Ed25519 própria).
      Não existe "validade legal" hoje (Lei 14.063); nível 3 fica para a wallet + vínculo de certificado. */
  level: 1 | 2 | 3;
  signer: ProofSigner;
}

export interface Proof {
  audience: ProofAudience;
  dfids: string[];
  expiresAt: string | null;
  fields: ProofField[];
  issuedAt: string;
  /** frozen: igual a issuedAt (a foto). */
  asOf: string;
  issuer: ProofIssuer;
  legalBasis: { key: LegalBasisKey; purpose: string; fields: string[] } | null;
  mode: ProofMode;
  /** Nome de exibição do destinatário (o e-mail nunca é servido nem entra no commitment). */
  recipient: string | null;
  scope: { label: string; breakdown: { label: string; count: number }[] } | null;
  sealed: SealedEntry[];
  title: string | null;
  /** Sempre "active" num 200; revogada cai no 404 uniforme. Fora do commitment. */
  state: ProofState;
  /** BLAKE3 hex sobre JCS (RFC 8785) desta vista, menos os 3 campos meta. */
  commitment: string;
  /** "blake3-jcs-v1" */
  commitmentAlg: string;
}

export const COMMITMENT_ALG = "blake3-jcs-v1";
