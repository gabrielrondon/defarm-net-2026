import { authRequest } from "./client";

// Labels operacionais do admin por workspace parceiro (favorito/tags/notas).
// Backend: item-registry /admin/partners/labels (GET) e /admin/partners/{id}/labels (PATCH).
// A tela mescla estas labels por workspace_id na lista unificada de parceiros.

export interface WorkspaceLabel {
  workspace_id: string;
  is_favorite: boolean;
  tags: string[];
  notes: string | null;
}

/** Allowlist de tags (espelha ALLOWED_LABEL_TAGS do backend). String fora disto = 400. */
export const LABEL_TAGS = [
  "production",
  "pilot",
  "test",
  "internal",
  "qa",
  "archived",
] as const;
export type LabelTag = (typeof LABEL_TAGS)[number];

export interface UpsertLabelsRequest {
  /** Omitido = mantém. */
  is_favorite?: boolean;
  /** Substitui o conjunto. Omitido = mantém; `[]` = limpa. Cada tag na allowlist. */
  tags?: string[];
  /** Omitido/null = mantém; `""` = limpa. */
  notes?: string;
}

export async function listWorkspaceLabels(): Promise<WorkspaceLabel[]> {
  return authRequest<WorkspaceLabel[]>("/api/admin/partners/labels");
}

export async function upsertWorkspaceLabels(
  workspaceId: string,
  body: UpsertLabelsRequest
): Promise<WorkspaceLabel> {
  return authRequest<WorkspaceLabel>(`/api/admin/partners/${workspaceId}/labels`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
