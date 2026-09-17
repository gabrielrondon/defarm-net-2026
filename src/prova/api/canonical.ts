import { blake3 } from "@noble/hashes/blake3";
import { bytesToHex } from "@noble/hashes/utils";
import type { Proof } from "./types";

/* O que a prova afirma, em forma canônica: chaves ordenadas, JSON compacto, UTF-8.
   O commitment é blake3 disto. Proposta do frontend; o backend fecha a canonicalização em engines#650.
   Limite conhecido: `Object.keys().sort()` + JSON.stringify não é JCS (RFC 8785): chaves inteiras
   ("10", "2") saem em ordem numérica, não textual. Hoje não há chave assim; se o backend adotar
   JCS, trocar aqui por uma implementação RFC 8785. */
function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.keys(v as Record<string, unknown>).sort().map((k) => [k, sortKeys((v as Record<string, unknown>)[k])]));
  }
  return v;
}

/* Tudo o que o destinatário lê como afirmação entra no hash: validade, base legal, quem assinou,
   modo e data da foto (achado do Hetzner no net#221: expiresAt/legalBasis/signer fora do hash
   passavam no check "Ninguém alterou o conteúdo"). Fora do hash só o e-mail do destinatário
   (dado pessoal de baixa entropia num commitment público) e o próprio commitment/txHash/id. */
export function proofPayload(p: Proof) {
  return {
    asOf: p.asOf,
    audience: p.audience,
    dfids: p.dfids,
    expiresAt: p.expiresAt,
    fields: p.fields,
    issuedAt: p.issuedAt,
    issuer: { name: p.issuer.name, level: p.issuer.level, signer: p.issuer.signer },
    legalBasis: p.legalBasis,
    mode: p.mode,
    recipient: p.recipient ? p.recipient.name : null,
    scope: p.scope,
    sealed: p.sealed,
  };
}

export function canonicalJson(v: unknown): string {
  return JSON.stringify(sortKeys(v));
}

export function commitmentOf(p: Proof): string {
  return bytesToHex(blake3(new TextEncoder().encode(canonicalJson(proofPayload(p)))));
}
