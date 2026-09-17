import { GATEWAY_BASE } from "@/lib/api/client";
import type { Proof } from "./types";

/* GET /api/proofs/{id}/public: público, sem auth (engines#652 + #653, em produção desde
   17/09/2026). 404 uniforme para revogada e inexistente. O mock L1 (lacunas.json) foi apagado
   quando o endpoint nasceu, como manda a regra de mocks do design. */

export class ProofNotFound extends Error { kind = "notfound" as const; }
export class ProofNetworkError extends Error { kind = "network" as const; }
export class ProofServerError extends Error { kind = "server" as const; constructor(message: string, public ref?: string) { super(message); } }

export async function getProof(id: string): Promise<Proof> {
  let res: Response;
  try {
    res = await fetch(`${GATEWAY_BASE}/api/proofs/${encodeURIComponent(id)}/public`, { headers: { Accept: "application/json" } });
  } catch {
    throw new ProofNetworkError(id);
  }
  if (res.status === 404 || res.status === 410) throw new ProofNotFound(id);
  if (!res.ok) throw new ProofServerError(String(res.status), res.headers.get("x-request-id") || undefined);
  return (await res.json()) as Proof;
}
