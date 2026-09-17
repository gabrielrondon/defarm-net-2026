import { GATEWAY_BASE } from "@/lib/api/client";
import type { Proof } from "./types";
import lacunas from "../mocks/lacunas.json";

/* GET /api/proofs/{id}: público, sem auth, 404 uniforme para revogada e inexistente.
   Regra de mock (lacunas-api.md): enquanto engines#652 não está em produção, `VITE_PROOFS_API`
   desligado serve a chave L1 de `lacunas.json` com console.warn. Ligar com VITE_PROOFS_API=1
   e apagar a chave quando o endpoint estiver no ar; a tela não muda. */
export const USE_API = import.meta.env.VITE_PROOFS_API === "1";

export class ProofNotFound extends Error { kind = "notfound" as const; }
export class ProofNetworkError extends Error { kind = "network" as const; }
export class ProofServerError extends Error { kind = "server" as const; constructor(message: string, public ref?: string) { super(message); } }

const MOCK = lacunas as { L1: { _id: string; view: Proof } };

export async function getProof(id: string): Promise<Proof> {
  if (!USE_API) {
    console.warn("[mock L1] GET /api/proofs/:id");
    await new Promise((r) => setTimeout(r, 350));
    if (id !== MOCK.L1._id) throw new ProofNotFound(id);
    /* Clona como se tivesse vindo pela rede: o commitment é sobre o JSON parseado. */
    return JSON.parse(JSON.stringify(MOCK.L1.view)) as Proof;
  }
  let res: Response;
  try {
    res = await fetch(`${GATEWAY_BASE}/api/proofs/${encodeURIComponent(id)}`, { headers: { Accept: "application/json" } });
  } catch {
    throw new ProofNetworkError(id);
  }
  if (res.status === 404 || res.status === 410) throw new ProofNotFound(id);
  if (!res.ok) throw new ProofServerError(String(res.status), res.headers.get("x-request-id") || undefined);
  return (await res.json()) as Proof;
}
