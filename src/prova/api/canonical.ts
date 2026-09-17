import { blake3 } from "@noble/hashes/blake3";
import { bytesToHex } from "@noble/hashes/utils";
import type { Proof } from "./types";

/* O que a prova afirma, em forma canônica: chaves ordenadas, JSON compacto, UTF-8.
   O commitment é blake3 disto. Proposta do frontend; o backend fecha a canonicalização em engines#650. */
function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.keys(v as Record<string, unknown>).sort().map((k) => [k, sortKeys((v as Record<string, unknown>)[k])]));
  }
  return v;
}

export function proofPayload(p: Proof) {
  return {
    dfids: p.dfids,
    fields: p.fields,
    issuedAt: p.issuedAt,
    issuer: { name: p.issuer.name, level: p.issuer.level },
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
