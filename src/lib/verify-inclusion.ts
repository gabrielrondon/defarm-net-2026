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
import { isLosslessNumber, type LosslessNumber } from "lossless-json";
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
// alfabética, recursivo) — é colon-join, NÃO JCS. Provado byte-a-byte contra prod.
//
// PRESERVAÇÃO DE LITERAL (Hetzner #189 A1): o serde_json serializa f64 inteiro COM ".0"
// (weight_kg 390.0). O JSON.parse do JS colapsa pra 390 e o hash acusaria evento legítimo
// (falso alarme — pior num "verifique você mesmo"). Por isso os eventos vêm parseados com
// lossless-json (getPublicItemEventsLossless): números são LosslessNumber e emitimos o
// literal cru (v.toString() → "390.0"), reproduzindo o serde_json. Diferente do Ed25519
// abaixo, onde o JCS/RFC8785 NORMALIZA o número (390.0 → 390) e por isso converte pra Number.

function compactSorted(v: unknown): string {
  if (isLosslessNumber(v)) return (v as LosslessNumber).toString(); // literal cru: "390.0"
  if (Array.isArray(v)) return "[" + v.map(compactSorted).join(",") + "]";
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return (
      "{" +
      Object.keys(o)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + compactSorted(o[k]))
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(v ?? null);
}

/** `true`/`false` se o content_hash recomputado bate/não bate; `null` sem material. */
export function verifyEventContentHashInBrowser(e: PublicItemEvent): boolean | null {
  if (!e.content_hash || !e.item_id) return null;
  const md: Record<string, unknown> = { ...((e.metadata as Record<string, unknown>) || {}) };
  delete md.signature; // metadata exclui .signature no content_hash
  const msg = `${e.item_id}:${e.event_type}:${compactSorted(e.payload ?? {})}:${compactSorted(md)}`;
  return bytesToHex(blake3(enc.encode(msg))) === e.content_hash;
}

// LosslessNumber → number recursivo. Pro Ed25519 (JCS): o canonicalize precisa de números
// nativos, e como o RFC 8785 normaliza o número (390.0 e 390 dão "390") a conversão é segura.
function toPlainNumbers(v: unknown): unknown {
  if (isLosslessNumber(v)) return Number((v as LosslessNumber).toString());
  if (Array.isArray(v)) return v.map(toPlainNumbers);
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(o)) out[k] = toPlainNumbers(o[k]);
    return out;
  }
  return v;
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
    payload: toPlainNumbers(e.payload ?? {}),
    metadata: toPlainNumbers(md),
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
