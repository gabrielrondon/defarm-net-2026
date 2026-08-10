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
import { ed25519 } from "@noble/curves/ed25519";
import canonicalize from "canonicalize";
import type { PublicInclusionProof, PublicItemEvent } from "@/lib/defarm-api";

const b64ToBytes = (s: string): Uint8Array => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

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

// #106 parte 2 — recompõe o content_hash de um evento público NO NAVEGADOR (integridade):
// content_hash = BLAKE3(utf8("{item_id}:{event_type}:{payload}:{metadata sem .signature}")),
// onde payload/metadata são JSON COMPACTO do serde_json (sem espaços, chaves em ordem
// alfabética, recursivo) — é colon-join, NÃO JCS. Provado contra 4 eventos reais de prod.
// Ed25519 (autoria) fica pra follow-up: hoje não há evento assinado em prod (EMISSÃO é gap)
// e o events/public nem expõe a chave pública — bloqueio de backend, não de front.

function canonSort(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonSort);
  if (v && typeof v === "object") {
    const o: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort())
      o[k] = canonSort((v as Record<string, unknown>)[k]);
    return o;
  }
  return v;
}
const compactSorted = (v: unknown): string => JSON.stringify(canonSort(v ?? {}));

/** `true`/`false` se o content_hash recomputado bate/não bate; `null` sem material. */
export function verifyEventContentHashInBrowser(e: PublicItemEvent): boolean | null {
  if (!e.content_hash || !e.item_id) return null;
  const md: Record<string, unknown> = { ...((e.metadata as Record<string, unknown>) || {}) };
  delete md.signature; // metadata exclui .signature no content_hash
  const msg = `${e.item_id}:${e.event_type}:${compactSorted(e.payload)}:${compactSorted(md)}`;
  return bytesToHex(blake3(enc.encode(msg))) === e.content_hash;
}

// #106 parte 3 (Ed25519) — verifica a ASSINATURA do evento NO NAVEGADOR: reconstrói o
// envelope JCS (signature_payload_v1) e roda Ed25519.verify com a pubkey pública. Espelha
// o canonical_signing_bytes/verify_ed25519_b64 do backend, provado byte-a-byte contra um
// evento assinado real (bate com o signature_verified do servidor). Precisa da pubkey no
// events/public (engines#475). null quando não há assinatura+pubkey.
export function verifyEventSignatureInBrowser(e: PublicItemEvent): boolean | null {
  const md: Record<string, unknown> = { ...((e.metadata as Record<string, unknown>) || {}) };
  const sig = md.signature as { value?: string } | undefined;
  const sigVal = sig?.value;
  const pub = e.signature_public_key_b64;
  if (!sigVal || !pub) return null;
  delete md.signature; // envelope usa metadata SEM .signature
  const envelope = {
    hash_version: "signature_payload_v1",
    item_id: e.item_id ? String(e.item_id) : null,
    event_type: e.event_type,
    payload: e.payload ?? {},
    metadata: md,
    issuer_workspace_id: e.event_owner_workspace_id ? String(e.event_owner_workspace_id) : null,
  };
  const canon = canonicalize(envelope);
  if (!canon) return false;
  try {
    return ed25519.verify(b64ToBytes(sigVal), new TextEncoder().encode(canon), b64ToBytes(pub));
  } catch {
    return false;
  }
}
