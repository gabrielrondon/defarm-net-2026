import { financeRequest, buildFinanceQS } from "./client";
import type { MarketIndicatorsResponse, IndicatorHistoryResponse } from "./types";

export async function getCurrentIndicators(): Promise<MarketIndicatorsResponse> {
  return financeRequest("/api/v1/market-indicators/current");
}

export async function getIndicatorHistory(
  type: "CDI" | "SELIC" | "IPCA",
  params?: { start_date?: string; end_date?: string; limit?: number }
): Promise<IndicatorHistoryResponse> {
  return financeRequest(`/api/v1/market-indicators/${type}/history${buildFinanceQS(params)}`);
}
