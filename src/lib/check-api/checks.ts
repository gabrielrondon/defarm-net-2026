import { checkRequest } from "./client";
import type { CheckRequest, CheckResponse, SourceInfo } from "./types";

export async function executeCheck(body: CheckRequest): Promise<CheckResponse> {
  return checkRequest<CheckResponse>("/check", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getCheckById(id: string): Promise<CheckResponse> {
  return checkRequest<CheckResponse>(`/checks/${id}`);
}

export async function listSources(): Promise<SourceInfo[]> {
  return checkRequest<SourceInfo[]>("/sources");
}

export async function listSourcesByCategory(category: string): Promise<SourceInfo[]> {
  return checkRequest<SourceInfo[]>(`/sources/${category}`);
}
