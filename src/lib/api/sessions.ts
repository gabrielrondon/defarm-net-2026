import { registryRequest } from "./client";
import type { UserSession } from "./types";

export async function getActiveSessions(userId: string): Promise<UserSession[]> {
  return registryRequest<UserSession[]>(`/sessions?user_id=${userId}`);
}
