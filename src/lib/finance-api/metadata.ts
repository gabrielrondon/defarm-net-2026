import { financeRequest } from "./client";

export async function listActivities(): Promise<{ data: string[] }> {
  return financeRequest("/api/v1/metadata/activities");
}

export async function listStates(): Promise<{ data: string[] }> {
  return financeRequest("/api/v1/metadata/states");
}
