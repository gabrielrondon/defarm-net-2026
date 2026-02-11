// DeFarm Finance API Types

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface CreditLine {
  id: string;
  institution_id: string;
  name: string;
  code?: string | null;
  program_type?: "working_capital" | "investment" | "financing" | null;
  description?: string | null;
  target_audience?: "family_farmer" | "medium_producer" | "large_producer" | null;
  min_amount?: number | null;
  max_amount?: number | null;
  currency: string;
  interest_rate_min?: number | null;
  interest_rate_max?: number | null;
  interest_rate_type?: "fixed" | "variable" | "indexed" | null;
  grace_period_months?: number | null;
  max_term_months?: number | null;
  minimum_revenue?: number | null;
  maximum_revenue?: number | null;
  requires_collateral?: boolean | null;
  collateral_types?: string[] | null;
  requires_environmental_license?: boolean | null;
  eligible_activities?: string[] | null;
  available_regions?: string[] | null;
  source_url?: string | null;
  data_source: "bcb_api" | "bndes_api" | "web_scraping" | "manual";
  last_verified_at?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaginatedCreditLines {
  data: CreditLine[];
  pagination: Pagination;
}

export interface CreditLineFilters {
  program_type?: string;
  target_audience?: string;
  min_amount?: number;
  max_amount?: number;
  max_interest_rate?: number;
  state?: string;
  activity?: string;
  institution_type?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface UserProfile {
  producer_type?: string;
  annual_revenue?: number;
  state?: string;
  main_activities?: string[];
}

export interface CompareRequest {
  credit_line_ids: string[];
  user_profile?: UserProfile;
}

export interface Eligibility {
  eligible: boolean;
  reasons: string[];
}

export interface CreditLineWithEligibility extends CreditLine {
  eligibility?: Eligibility;
  score?: number;
}

export interface CompareAnalysisResponse {
  credit_lines: CreditLineWithEligibility[];
  best_match?: {
    credit_line_id: string;
    credit_line_name: string;
    score: number;
    reasons: string[];
  } | null;
  summary: {
    total_compared: number;
    eligible_count: number;
    lowest_rate: number;
    highest_rate: number;
    average_rate: number;
    largest_max_amount: number;
    smallest_min_amount: number;
    longest_term_months: number;
    longest_grace_period_months: number;
  };
  recommendations: string[];
}

export interface RateHistoryEntry {
  id: string;
  credit_line_id: string;
  min_interest_rate?: number | null;
  max_interest_rate?: number | null;
  effective_date: string;
  recorded_at: string;
  source: string;
  notes?: string | null;
}

export interface RateHistoryResponse {
  credit_line_id: string;
  history: RateHistoryEntry[];
  total: number;
}

export interface RateTrendResponse {
  credit_line_id: string;
  current_min_rate?: number | null;
  current_max_rate?: number | null;
  average_min_rate: number;
  average_max_rate: number;
  lowest_min_rate: number;
  highest_max_rate: number;
  total_changes: number;
  trend_direction: "increasing" | "decreasing" | "stable";
  percent_change: number;
}

export interface MarketIndicator {
  indicator_type: string;
  rate_value: number;
  reference_date: string;
  recorded_at: string;
  source: string;
}

export interface MarketIndicatorsResponse {
  indicators: MarketIndicator[];
  total: number;
}

export interface IndicatorHistoryEntry {
  id: string;
  indicator_type: string;
  rate_value: number;
  reference_date: string;
  recorded_at: string;
  source: string;
  metadata?: Record<string, any> | null;
}

export interface IndicatorHistoryResponse {
  indicator_type: string;
  history: IndicatorHistoryEntry[];
  total: number;
}

// CPR
export interface CPRCalculateRequest {
  product: string;
  quantity: number;
  expected_price: number;
  days_to_maturity: number;
  discount_rate: number;
}

export interface CPRCalculateResponse {
  future_value: number;
  present_value: number;
  discount_amount: number;
  effective_rate: number;
  daily_rate: number;
  cost_per_ton: number;
  breakeven_price: number;
  recommendation: string;
}

export interface CPRSimulateRequest {
  product: string;
  quantity: number;
  current_price: number;
  expected_price: number;
  days_to_harvest: number;
  discount_rates: number[];
}

export interface CPRScenario {
  discount_rate: number;
  present_value: number;
  discount_amount: number;
  effective_rate: number;
  vs_expected_harvest: number;
  recommendation: string;
}

export interface CPRSimulateResponse {
  scenarios: CPRScenario[];
  total: number;
}

export interface CPRCompareCreditRequest {
  cpr_input: {
    product: string;
    quantity: number;
    expected_price: number;
    days_to_maturity: number;
    discount_rate: number;
  };
  credit_line_ids: string[];
}

export interface CPRCompareCreditResponse {
  cpr_result: {
    present_value: number;
    effective_rate: number;
    discount_amount: number;
  };
  credit_lines: {
    name: string;
    interest_rate: number;
    total_cost: number;
    effective_rate: number;
  }[];
  best_option: "cpr" | "credit";
  savings: number;
  summary: string;
}

// LCA
export interface LCACalculateRequest {
  investment_amount: number;
  maturity_months: number;
  interest_type: "pre" | "pos" | "hybrid";
  annual_rate?: number;
  cdi_percentage?: number;
  cdi_rate?: number;
  ipca_rate?: number;
  is_legal_entity?: boolean;
}

export interface LCACalculateResponse {
  investment_amount: number;
  gross_return: number;
  net_return: number;
  final_amount: number;
  effective_rate: number;
  ir_amount: number;
  recommendation: string;
}

export interface LCAItem {
  id: string;
  issuer: string;
  product_name: string;
  min_investment: number;
  interest_type: "pre" | "pos" | "hybrid";
  annual_rate?: number | null;
  index_type?: string | null;
  index_percentage?: number | null;
  maturity_months: number;
  last_updated: string;
}

export interface CRAItem {
  id: string;
  securitizer: string;
  series: string;
  product_name: string;
  min_investment: number;
  interest_type: "pre" | "pos" | "hybrid";
  interest_rate?: number | null;
  index_type?: string | null;
  index_percentage?: number | null;
  index_spread?: number | null;
  maturity_months: number;
  risk_rating: string;
  is_tax_exempt: boolean;
  underlying_asset?: string | null;
  last_updated: string;
}

export interface CompareAllRequest {
  profile: {
    user_type: "producer" | "investor" | "both";
    annual_revenue?: number;
    investment_capacity?: number;
    risk_tolerance?: "low" | "medium" | "high";
  };
  amount: number;
  months: number;
  cdi_rate: number;
}

export interface RecommendationItem {
  category: "financing" | "investment" | "hedging" | "tax_optimization";
  instrument_type: string;
  instrument_name: string;
  why: string;
  expected_rate: number;
  risk_level: "low" | "medium" | "high";
  priority: number;
  action_steps: string[];
}

export interface RecommendationsRequest {
  user_type: "family_farmer" | "medium_producer" | "large_producer" | "investor";
  annual_revenue: number;
  investment_capacity?: number | null;
  risk_tolerance?: "low" | "medium" | "high";
  state?: string | null;
  main_products?: string[] | null;
  needs?: string[] | null;
}
