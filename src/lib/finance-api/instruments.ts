import { financeRequest, buildFinanceQS } from "./client";
import type {
  CPRCalculateRequest,
  CPRCalculateResponse,
  CPRSimulateRequest,
  CPRSimulateResponse,
  CPRCompareCreditRequest,
  CPRCompareCreditResponse,
  LCACalculateRequest,
  LCACalculateResponse,
  LCAItem,
  CRAItem,
  CompareAllRequest,
  RecommendationsRequest,
  RecommendationItem,
} from "./types";

// CPR
export async function calculateCPR(data: CPRCalculateRequest): Promise<CPRCalculateResponse> {
  return financeRequest("/api/v1/instruments/cpr/calculate", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listCPRs(params?: { product?: string; limit?: number }): Promise<{ total: number; cprs: any[] }> {
  return financeRequest(`/api/v1/instruments/cpr/list${buildFinanceQS(params)}`);
}

export async function compareCPRvsCredit(data: CPRCompareCreditRequest): Promise<CPRCompareCreditResponse> {
  return financeRequest("/api/v1/instruments/cpr/compare-credit", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function simulateHarvestAdvance(data: CPRSimulateRequest): Promise<CPRSimulateResponse> {
  return financeRequest("/api/v1/instruments/cpr/simulate-advance", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// LCA
export async function calculateLCA(data: LCACalculateRequest): Promise<LCACalculateResponse> {
  return financeRequest("/api/v1/instruments/lca/calculate", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listLCAs(params?: { min_investment?: number; maturity_months?: number; limit?: number }): Promise<{ total: number; lcas: LCAItem[] }> {
  return financeRequest(`/api/v1/instruments/lca/list${buildFinanceQS(params)}`);
}

// CRA
export async function listCRAs(params?: { min_investment?: number; maturity_months?: number; limit?: number }): Promise<{ total: number; cras: CRAItem[] }> {
  return financeRequest(`/api/v1/instruments/cra/list${buildFinanceQS(params)}`);
}

// Compare All
export async function compareAllInstruments(data: CompareAllRequest): Promise<any> {
  return financeRequest("/api/v1/instruments/compare-all", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Recommendations
export async function getRecommendations(data: RecommendationsRequest): Promise<{ profile: any; recommendations: RecommendationItem[]; total: number }> {
  return financeRequest("/api/v1/instruments/recommendations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
