import { registryRequest, buildQueryString } from "./client";
import type { IngestionTemplate, IngestionTemplateUpsertRequest } from "./types";

export async function listIngestionTemplates(sourceHint?: string): Promise<IngestionTemplate[]> {
  const query = buildQueryString(sourceHint ? { source_hint: sourceHint } : undefined);
  return registryRequest<IngestionTemplate[]>(`/ingestion/templates${query}`);
}

export async function createIngestionTemplate(
  data: IngestionTemplateUpsertRequest
): Promise<IngestionTemplate> {
  return registryRequest<IngestionTemplate>("/ingestion/templates", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateIngestionTemplate(
  id: string,
  data: IngestionTemplateUpsertRequest
): Promise<IngestionTemplate> {
  return registryRequest<IngestionTemplate>(`/ingestion/templates/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteIngestionTemplate(id: string): Promise<void> {
  await registryRequest<void>(`/ingestion/templates/${id}`, {
    method: "DELETE",
  });
}
