/* Contrato mínimo da Prova (lacuna L1 de guidelines/lacunas-api.md, prefixo /api).
   Enquanto engines#650 não nasce, o shape abaixo é o que o frontend assume; backend implementa
   contra ele ou propõe outro na issue. Nomes de campo seguem rotas-e-dados.md. */

export type IdentityLevelValue = 1 | 2 | 3;
export type ProofState = "valid" | "revoked" | "expired";
export type ProofMode = "live" | "frozen";
export type LegalBasisKey = "credit" | "contract" | "consent";

export interface ProofField { label: string; value: string }

export interface Proof {
  id: string;
  issuer: {
    name: string;
    level: IdentityLevelValue;
    /** Meses sem cortes; null quando a conta ainda não tem histórico. */
    trustMonths: number | null;
    /** Quem assinou: chave própria do emissor ou chave operada pela plataforma (irretratabilidade limitada). */
    signer: "owner" | "defarm";
  };
  audience: "link" | "named";
  /** Presente quando audience = "named". */
  recipient: { name: string; email?: string } | null;
  scope: { label: string; breakdown: { label: string; count: number }[] };
  fields: ProofField[];
  /** Rótulos dos campos que ficaram selados (o conteúdo nunca sai). */
  sealed: string[];
  issuedAt: string;
  expiresAt: string | null;
  state: ProofState;
  legalBasis: { key: LegalBasisKey; purpose: string; fields: string[] };
  dfids: string[];
  /** blake3 hex do payload canônico (ver `canonical.ts`). */
  commitment: string;
  txHash: string | null;
  signingKey: string;
  mode: ProofMode;
  /** Para provas vivas: timestamp da última entrada refletida. Para congeladas: data da foto. */
  asOf: string;
}
