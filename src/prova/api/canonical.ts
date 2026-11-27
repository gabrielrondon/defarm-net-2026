import { blake3 } from "@noble/hashes/blake3";
import { bytesToHex } from "@noble/hashes/utils";
import canonicalize from "canonicalize";

/* Receita do commitment da Proof (engines#652, `commitment_of_view`): pega o JSON servido por
   GET /api/proofs/{id}, remove `state`, `commitment` e `commitmentAlg`, canoniza em JCS
   (RFC 8785) e faz BLAKE3 em hex. O mesmo `canonicalize` que o portal já usa para o envelope
   Ed25519 (`verify-inclusion.ts`), o mesmo `serde_jcs` que o backend usa para assinar.

   Hashear o objeto RECEBIDO, nunca um objeto reconstruído: as strings de data vêm truncadas
   a microssegundos do Postgres e têm de entrar exatamente como foram servidas. Números
   passam pelo JSON.parse do navegador e o JCS normaliza os dois lados igual (390.0 → 390). */

export const COMMITMENT_EXCLUDED = ["state", "commitment", "commitmentAlg"] as const;

const enc = new TextEncoder();

export function commitmentJcs(served: Record<string, unknown>): string {
  const v: Record<string, unknown> = { ...served };
  for (const k of COMMITMENT_EXCLUDED) delete v[k];
  const jcs = canonicalize(v);
  if (typeof jcs !== "string") throw new Error("JCS falhou");
  return jcs;
}

export function commitmentOf(served: Record<string, unknown>): string {
  return bytesToHex(blake3(enc.encode(commitmentJcs(served))));
}
