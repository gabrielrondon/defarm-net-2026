import { registryRequest, buildQueryString } from "./client";
import type { ActivityFeed, RecentActivity, ActivitySummary } from "./types";

export async function getPublicActivity(params?: {
  circuit_id?: string;
  resource_type?: string;
  action?: string;
  limit?: number;
  offset?: number;
}): Promise<ActivityFeed[]> {
  return registryRequest<ActivityFeed[]>(`/activity/public${buildQueryString(params)}`);
}

export async function getUserActivity(
  userId: string,
  params?: {
    circuit_id?: string;
    resource_type?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }
): Promise<ActivityFeed[]> {
  return registryRequest<ActivityFeed[]>(`/activity/user/${userId}${buildQueryString(params)}`);
}

export async function getCircuitActivity(
  circuitId: string,
  params?: {
    actor_id?: string;
    resource_type?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }
): Promise<ActivityFeed[]> {
  return registryRequest<ActivityFeed[]>(`/activity/circuit/${circuitId}${buildQueryString(params)}`);
}

export async function getRecentActivity(
  userId: string,
  limit?: number
): Promise<RecentActivity[]> {
  return registryRequest<RecentActivity[]>(
    `/activity/recent${buildQueryString({ user_id: userId, limit })}`
  );
}

export async function getActivitySummaries(params: {
  start_date: string;
  end_date: string;
  summary_type: string;
  circuit_id?: string;
  user_id?: string;
}): Promise<ActivitySummary[]> {
  return registryRequest<ActivitySummary[]>(`/activity/summaries${buildQueryString(params)}`);
}

// Health check
export async function checkHealth() {
  return registryRequest<{ status: string; database: { connected: boolean }; redis: { connected: boolean }; timestamp: string }>("/health");
}
