import { verifySealerSignature } from "@defarm/sdk/core";
import type { RecipientSealedField } from "@/lib/api/sealed";

// Conferências da caixa de entrada de campos selados no navegador (#755).

export type Authorship = "ok" | "changed" | "unknown";

/**
 * O envelope é que é autenticado (AAD e assinatura); a linha do servidor ao redor, não. O que a
 * tela mostra tem de ser o que o envelope diz.
 */
export function wrapperMatchesEnvelope(f: RecipientSealedField): boolean {
  const e = f.sealed_field;
  return (
    e.dfid === f.dfid &&
    e.field_path === f.field_path &&
    e.content_type === f.content_type &&
    e.sealer_workspace_id === f.sealer_workspace_id &&
    e.sealer_key_id === f.sealer_key_id
  );
}

/**
 * Autoria com a chave do selador fixada no primeiro uso, por workspace selador (como o SDK .NET).
 * A chave pública vem do servidor; fixá-la faz uma troca posterior, inclusive com outro key_id,
 * aparecer como "changed", em vez de ser aceita em silêncio. Devolve o
 * resultado por campo e os pins atualizados (o chamador decide onde guardar).
 */
export function classifyAuthorship(
  fields: RecipientSealedField[],
  pins: Record<string, string>
): { byField: Record<string, Authorship>; pins: Record<string, string>; changed: boolean } {
  const next = { ...pins };
  const byField: Record<string, Authorship> = {};
  let changed = false;
  for (const f of fields) {
    const id = f.sealer_workspace_id;
    const pub = f.sealer_public_key_b64;
    let a: Authorship = "unknown";
    if (f.authorship_verified && pub && wrapperMatchesEnvelope(f) && verifySealerSignature(f.sealed_field, pub)) {
      if (!next[id]) {
        next[id] = pub;
        changed = true;
      }
      a = next[id] === pub ? "ok" : "changed";
    }
    byField[f.event_id + f.field_path] = a;
  }
  return { byField, pins: next, changed };
}

const pinsKey = (workspaceId: string) => `defarm.sealer-pins.v2.${workspaceId}`;

export function loadSealerPins(workspaceId: string): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(pinsKey(workspaceId)) ?? "{}");
  } catch {
    return {};
  }
}

export function saveSealerPins(workspaceId: string, pins: Record<string, string>) {
  try {
    localStorage.setItem(pinsKey(workspaceId), JSON.stringify(pins));
  } catch {
    /* sem armazenamento: a fixação vale só nesta sessão */
  }
}
