import { financeRequest, buildFinanceQS } from "./client";
import type {
  PaginatedCreditLines,
  CreditLineFilters,
  CreditLine,
  CompareRequest,
  CreditLineWithEligibility,
  CompareAnalysisResponse,
  RateHistoryResponse,
  RateTrendResponse,
} from "./types";

export async function listCreditLines(filters?: CreditLineFilters): Promise<PaginatedCreditLines> {
  return financeRequest(`/api/v1/credit-lines${buildFinanceQS(filters)}`);
}

export async function getCreditLine(id: string): Promise<CreditLine> {
  return financeRequest(`/api/v1/credit-lines/${id}`);
}

export async function compareCreditLines(data: CompareRequest): Promise<CreditLineWithEligibility[]> {
  return financeRequest("/api/v1/credit-lines/compare", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function compareCreditLinesAnalysis(data: CompareRequest): Promise<CompareAnalysisResponse> {
  return financeRequest("/api/v1/credit-lines/compare-analysis", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getRateHistory(
  id: string,
  params?: { start_date?: string; end_date?: string }
): Promise<RateHistoryResponse> {
  return financeRequest(`/api/v1/credit-lines/${id}/rate-history${buildFinanceQS(params)}`);
}

export async function getRateTrend(
  id: string,
  months?: number
): Promise<RateTrendResponse> {
  return financeRequest(`/api/v1/credit-lines/${id}/rate-trend${buildFinanceQS({ months })}`);
}

export async function compareRateTrends(
  ids: string[],
  params?: { start_date?: string; end_date?: string; months?: number }
): Promise<Record<string, any>> {
  return financeRequest(`/api/v1/credit-lines/rate-trends${buildFinanceQS({ ids: ids.join(","), ...params })}`);
}
