// OESA dashboard — analytics + fraud alerts over GTA movements (engines #111
// fase 2). Gated to government at the backend.
import { registryRequest } from "./client";

export interface OesaSummary {
  movements_total: number;
  items_moved: number;
  gtas_distinct: number;
  last_30d: number;
}

export interface OesaAlert {
  /** "duplicate_gta" | "same_item_overlap" */
  type: string;
  /** "high" | "medium" */
  severity: string;
  gta_number?: string;
  item_dfids: string[];
  detail: string;
}

export interface OesaDashboardData {
  summary: OesaSummary;
  alerts: OesaAlert[];
}

export async function getOesaDashboard(): Promise<OesaDashboardData> {
  return registryRequest<OesaDashboardData>("/oesa/dashboard");
}
