// Public workspace provenance resolver (the moat).
// Resolves an event issuer's workspace_id -> { name, type, slug } via the
// auth-service public endpoint, so the verifier can show "who issued this".
// Best-effort: returns null on any failure so the UI degrades gracefully.
import { AUTH_API_BASE } from "./client";
import type { PublicWorkspace } from "./types";

export async function getPublicWorkspace(
  id: string
): Promise<PublicWorkspace | null> {
  try {
    const res = await fetch(`${AUTH_API_BASE}/auth/workspaces/${id}/public`);
    if (!res.ok) return null;
    return (await res.json()) as PublicWorkspace;
  } catch {
    return null;
  }
}
