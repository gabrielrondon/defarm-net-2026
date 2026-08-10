// #106 — "verifique você mesmo": recomputa a prova de inclusão de presença NO PRÓPRIO
// NAVEGADOR, sem confiar no `verified` que o servidor devolve. Espelha byte-a-byte o
// `verify_proof_pure` do backend: hash_pair(a,b) = BLAKE3(utf8(a_hex ++ b_hex)) em hex;
// recompõe o root do dia a partir da folha + caminho e compara com `root_hash`.
//
// Limite honesto (mesmo do endpoint): recomputa que a FOLHA está no ROOT do dia. NÃO
// recompõe a folha a partir da leitura crua (privada), nem confere a âncora on-chain
// (isso é o explorer). É o "eu, no meu navegador, confirmei a inclusão" — não "confie
// no servidor".
import { blake3 } from "@noble/hashes/blake3";
import { bytesToHex } from "@noble/hashes/utils";
import type { PublicInclusionProof } from "@/lib/defarm-api";

const enc = new TextEncoder();
const hashPair = (a: string, b: string): string => bytesToHex(blake3(enc.encode(a + b)));

/**
 * Recomputa a inclusão no navegador.
 * @returns `true`/`false` se bate/não bate; `null` quando não há material (status "unavailable").
 */
export function verifyInclusionInBrowser(p: PublicInclusionProof): boolean | null {
  if (p.status === "unavailable") return null;
  let cur = p.leaf_hash;
  for (let i = 0; i < p.proof_path.length; i++) {
    const pos = p.proof_positions[i] ?? 1;
    cur = pos === 0 ? hashPair(p.proof_path[i], cur) : hashPair(cur, p.proof_path[i]);
  }
  return cur === p.root_hash;
}
