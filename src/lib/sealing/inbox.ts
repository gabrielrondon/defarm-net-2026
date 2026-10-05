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

/** Chaves de assinatura aceitas por workspace selador (a primeira vista e as confirmadas depois). */
export type SealerPins = Record<string, string[]>;

/**
 * Autoria com a chave do selador fixada no primeiro uso, por workspace selador (como o SDK .NET).
 * A chave pública vem do servidor; fixá-la faz uma chave diferente, inclusive com outro key_id,
 * aparecer como "changed" até alguém confirmar (`acceptSealerKey`), em vez de passar em silêncio.
 * Os campos são lidos do mais antigo para o mais novo, então o primeiro uso fixa a chave mais
 * antiga e uma rotação aparece como mudança, não o contrário.
 */
export function classifyAuthorship(
  fields: RecipientSealedField[],
  pins: SealerPins
): { byField: Record<string, Authorship>; pins: SealerPins; changed: boolean } {
  const next: SealerPins = Object.fromEntries(Object.entries(pins).map(([k, v]) => [k, [...v]]));
  const byField: Record<string, Authorship> = {};
  let changed = false;
  const ordered = [...fields].sort((x, y) => Date.parse(x.occurred_at) - Date.parse(y.occurred_at));
  for (const f of ordered) {
    const ws = f.sealer_workspace_id;
    const pub = f.sealer_public_key_b64;
    let a: Authorship = "unknown";
    if (f.authorship_verified && pub && wrapperMatchesEnvelope(f) && verifySealerSignature(f.sealed_field, pub)) {
      if (!next[ws]?.length) {
        next[ws] = [pub];
        changed = true;
      }
      a = next[ws].includes(pub) ? "ok" : "changed";
    }
    byField[f.event_id + f.field_path] = a;
  }
  return { byField, pins: next, changed };
}

/** A pessoa confirmou (por fora) que a chave nova do selador é legítima. */
export function acceptSealerKey(pins: SealerPins, sealerWorkspaceId: string, pub: string): SealerPins {
  const list = pins[sealerWorkspaceId] ?? [];
  return list.includes(pub) ? pins : { ...pins, [sealerWorkspaceId]: [...list, pub] };
}

const pinsKey = (workspaceId: string) => `defarm.sealer-pins.v3.${workspaceId}`;

export function loadSealerPins(workspaceId: string): SealerPins {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(pinsKey(workspaceId)) ?? "{}");
    if (!raw || typeof raw !== "object") return {};
    return Object.fromEntries(
      Object.entries(raw as Record<string, unknown>)
        .filter(([, v]) => Array.isArray(v))
        .map(([k, v]) => [k, (v as unknown[]).filter((x): x is string => typeof x === "string")])
    );
  } catch {
    return {};
  }
}

export function saveSealerPins(workspaceId: string, pins: SealerPins) {
  try {
    localStorage.setItem(pinsKey(workspaceId), JSON.stringify(pins));
  } catch {
    /* sem armazenamento: a fixação vale só nesta sessão */
  }
}
