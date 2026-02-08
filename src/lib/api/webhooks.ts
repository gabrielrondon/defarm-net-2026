import { registryRequest, buildQueryString } from "./client";
import type {
  Webhook,
  CreateWebhookInput,
  UpdateWebhookInput,
  WebhookDelivery,
  WebhookStats,
} from "./types";

export async function getWebhooks(params?: {
  circuit_id?: string;
  is_active?: boolean;
}): Promise<Webhook[]> {
  return registryRequest<Webhook[]>(`/webhooks${buildQueryString(params)}`);
}

export async function getWebhook(id: string): Promise<Webhook> {
  return registryRequest<Webhook>(`/webhooks/${id}`);
}

export async function createWebhook(data: CreateWebhookInput): Promise<Webhook> {
  return registryRequest<Webhook>("/webhooks", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateWebhook(id: string, data: UpdateWebhookInput): Promise<Webhook> {
  return registryRequest<Webhook>(`/webhooks/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteWebhook(id: string): Promise<void> {
  await registryRequest(`/webhooks/${id}`, { method: "DELETE" });
}

export async function getWebhookDeliveries(
  id: string,
  limit?: number
): Promise<WebhookDelivery[]> {
  const qs = limit ? `?limit=${limit}` : "";
  return registryRequest<WebhookDelivery[]>(`/webhooks/${id}/deliveries${qs}`);
}

export async function retryWebhook(id: string): Promise<void> {
  await registryRequest(`/webhooks/${id}/retry`, { method: "POST" });
}

export async function getWebhookStats(id: string): Promise<WebhookStats> {
  return registryRequest<WebhookStats>(`/webhooks/${id}/stats`);
}
