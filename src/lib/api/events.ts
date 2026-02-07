import { registryRequest, buildQueryString } from "./client";
import type {
  Event,
  ListEventsResponse,
  UpdateEventStatusRequest,
  EventFilters,
} from "./types";

export async function getEvents(params?: EventFilters): Promise<Event[]> {
  const response = await registryRequest<ListEventsResponse>(
    `/events${buildQueryString(params as Record<string, any>)}`
  );
  return response.events;
}

export async function getEvent(id: string): Promise<Event> {
  return registryRequest<Event>(`/events/${id}`);
}

export async function updateEventStatus(
  id: string,
  data: UpdateEventStatusRequest
): Promise<void> {
  await registryRequest(`/events/${id}/status`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// Convenience: get events for a specific item
export async function getItemEvents(
  itemId: string,
  params?: Omit<EventFilters, "item_id">
): Promise<Event[]> {
  return getEvents({ ...params, item_id: itemId });
}
