// Role-based capability contract (the "menu por role" — engines #119, D12).
// The backend is the single source of truth for WHAT each workspace role can do;
// the frontend maps each section `key` to a label/icon/route (presentation).
import { registryRequest } from "./client";

export interface CapabilitySection {
  /** Stable semantic key, e.g. "emit.identity" / "read.my_items". */
  key: string;
  /** "emit" (writes an event) or "read". */
  action: "emit" | "read" | string;
  /** Event types this section emits (empty for read sections). */
  event_types?: string[];
}

export interface Capabilities {
  workspace_type: string;
  trust_score?: number | null;
  sections: CapabilitySection[];
}

export async function getMyCapabilities(): Promise<Capabilities> {
  return registryRequest<Capabilities>("/me/capabilities");
}
