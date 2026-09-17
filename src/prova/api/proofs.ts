import { GATEWAY_BASE } from "@/lib/api/client";
import type { Proof } from "./types";
import lacunas from "../mocks/lacunas.json";

/* Regra de mock (lacunas-api.md): um `lacunas.json`, uma chave por lacuna, um console.warn por
   chamada mockada. Quando `GET /api/proofs/{id}` nascer (engines#650), liga-se VITE_PROOFS_API=1
   e a chave L1 do JSON é apagada, sem mudança na tela. */
const USE_API = import.meta.env.VITE_PROOFS_API === "1";

export class ProofNotFound extends Error { kind = "notfound" as const; }
export class ProofNetworkError extends Error { kind = "network" as const; }
export class ProofServerError extends Error { kind = "server" as const; constructor(message: string, public ref?: string) { super(message); } }

export async function getProof(id: string): Promise<Proof> {
  if (!USE_API) {
    console.warn("[mock L1] GET /api/proofs/:id");
    await new Promise((r) => setTimeout(r, 350));
    const mock = (lacunas as { L1: Proof }).L1;
    if (id !== mock.id) throw new ProofNotFound(id);
    return mock;
  }
  let res: Response;
  try {
    res = await fetch(`${GATEWAY_BASE}/api/proofs/${encodeURIComponent(id)}`, { headers: { Accept: "application/json" } });
  } catch {
    throw new ProofNetworkError(id);
  }
  /* 404 uniforme: revogada e inexistente têm a mesma resposta. */
  if (res.status === 404 || res.status === 410) throw new ProofNotFound(id);
  if (!res.ok) throw new ProofServerError(String(res.status), res.headers.get("x-request-id") || undefined);
  return (await res.json()) as Proof;
}
