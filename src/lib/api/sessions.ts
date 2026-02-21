import { authRequest } from "./client";
import type { UserSession } from "./types";

export async function getActiveSessions(userId: string): Promise<UserSession[]> {
  const res = await authRequest<{ sessions: UserSession[] }>("/auth/sessions");
  return res.sessions.filter((s) => s.user_id === userId);
}
