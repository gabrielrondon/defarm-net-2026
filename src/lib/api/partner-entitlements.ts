import { authRequest } from "./client";

// --- Partner Entitlements (admin quota/saldo/holds) via Gateway ---
// Backend: item-registry /admin/partners/* (admin JWT) + /v1/partner/usage (partner).

/** Credit cost per anchor type, e.g. { creation: 100, enrichment: 1 }. */
export type CreditCosts = Record<string, number>;

export interface PartnerEntitlement {
  workspace_id: string;
  allowed_value_chains: string[];
  quota_total: number | null;
  quota_daily: number | null;
  quota_monthly: number | null;
  balance_remaining: number;
  credit_costs: CreditCosts;
  auto_release: boolean;
  is_active: boolean;
  notes: string | null;
}

export interface PartnerUsage {
  workspace_id: string;
  tokenizations_total: number;
  tokenizations_today: number;
  tokenizations_month: number;
  balance_remaining: number;
  /** Saldo já convertido em animais (floor(balance_remaining / credit_cost_creation)). */
  balance_in_animals: number;
  /** Créditos por animal novo (default 100; pode ter override por workspace). */
  credit_cost_creation: number;
  /**
   * false = workspace sem cobrança (tokeniza ILIMITADO). Nesse caso exiba "ilimitado" e
   * IGNORE balance_in_animals (vem 0 por não haver linha, não por saldo esgotado).
   */
  entitlement_provisioned: boolean;
  holds_pending: number;
  /** Identificadores distintos com issue de ingestão aberta (mesmo filtro do /ingestions/issues). */
  pending_issues: number;
}

/** Entitlement + usage, as returned by the admin list/get endpoints. */
export interface PartnerSummary extends PartnerEntitlement {
  usage: PartnerUsage;
}

export interface HoldRow {
  id: string;
  item_id: string;
  circuit_id: string;
  value_chain: string;
  anchor_type: string;
  reason: string;
  status: string;
}

export interface UpsertEntitlementRequest {
  allowed_value_chains: string[];
  quota_total?: number | null;
  quota_daily?: number | null;
  quota_monthly?: number | null;
  /** Absolute balance to set. Use addBalance() to top up incrementally. */
  balance_remaining?: number | null;
  credit_costs?: CreditCosts;
  auto_release?: boolean;
  is_active?: boolean;
  notes?: string | null;
}

export interface ReleaseHoldsRequest {
  hold_ids?: string[];
  all?: boolean;
}

export interface ReleaseHoldsResponse {
  released: number;
  skipped_no_balance: number;
  message: string;
}

// --- Admin (requires admin JWT) ---

export async function listPartners(): Promise<PartnerSummary[]> {
  return authRequest<PartnerSummary[]>("/api/admin/partners");
}

export async function getEntitlement(workspaceId: string): Promise<PartnerSummary> {
  return authRequest<PartnerSummary>(`/api/admin/partners/${workspaceId}/entitlement`);
}

export async function upsertEntitlement(
  workspaceId: string,
  data: UpsertEntitlementRequest
): Promise<PartnerEntitlement> {
  return authRequest<PartnerEntitlement>(`/api/admin/partners/${workspaceId}/entitlement`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function addBalance(
  workspaceId: string,
  addCredits: number
): Promise<PartnerEntitlement> {
  return authRequest<PartnerEntitlement>(`/api/admin/partners/${workspaceId}/balance`, {
    method: "POST",
    body: JSON.stringify({ add_credits: addCredits }),
  });
}

export async function listHolds(workspaceId: string): Promise<HoldRow[]> {
  return authRequest<HoldRow[]>(`/api/admin/partners/${workspaceId}/holds`);
}

export async function releaseHolds(
  workspaceId: string,
  req: ReleaseHoldsRequest
): Promise<ReleaseHoldsResponse> {
  return authRequest<ReleaseHoldsResponse>(`/api/admin/partners/${workspaceId}/holds/release`, {
    method: "POST",
    body: JSON.stringify(req),
  });
}

// --- Partner self-service (Bearer or x-api-key) ---

export async function getMyUsage(): Promise<PartnerUsage> {
  return authRequest<PartnerUsage>("/v1/partner/usage");
}
