import { registryRequest, buildQueryString } from "./client";
import type {
  Event,
  ListEventsResponse,
  UpdateEventStatusRequest,
  UpdateEventVisibilityRequest,
  GrantEventDelegationRequest,
  EventDelegation,
  EventGovernanceResponse,
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

export async function updateEventVisibility(
  id: string,
  data: UpdateEventVisibilityRequest
): Promise<Event> {
  return registryRequest<Event>(`/events/${id}/visibility`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function getEventGovernance(id: string): Promise<EventGovernanceResponse> {
  return registryRequest<EventGovernanceResponse>(`/events/${id}/governance`);
}

export async function grantEventDelegation(
  id: string,
  data: GrantEventDelegationRequest
): Promise<EventDelegation> {
  return registryRequest<EventDelegation>(`/events/${id}/delegations`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function revokeEventDelegation(id: string, delegationId: string): Promise<void> {
  await registryRequest(`/events/${id}/delegations/${delegationId}`, {
    method: "DELETE",
  });
}

// Convenience: get events for a specific item
export async function getItemEvents(
  itemId: string,
  params?: Omit<EventFilters, "item_id">
): Promise<Event[]> {
  return getEvents({ ...params, item_id: itemId });
}
