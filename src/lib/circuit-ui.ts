export function normalizeCircuitStatus(raw?: string | null): "active" | "inactive" | "unknown" {
  const value = (raw || "").trim().toLowerCase();
  if (value === "active") return "active";
  if (value === "inactive") return "inactive";
  return "unknown";
}

export function circuitStatusLabel(raw?: string | null): string {
  const normalized = normalizeCircuitStatus(raw);
  if (normalized === "active") return "Ativo";
  if (normalized === "inactive") return "Inativo";
  return raw || "Desconhecido";
}

export function circuitTypeLabel(raw?: string | null): string {
  const value = (raw || "").trim().toLowerCase();
  if (!value || value === "standard") return "Standard";
  if (value === "private") return "Privado";
  if (value === "supply_chain") return "Cadeia de suprimentos";
  if (value === "compliance") return "Compliance";
  if (value === "audit") return "Auditoria";
  return raw || "Standard";
}

export function isCircuitPublic(visibility?: string | null): boolean {
  return (visibility || "").trim().toLowerCase() === "public";
}

// Visibilidade de circuito, humanizada. Valores reais do CHECK circuits_visibility_check
// (migration 20250204000001): private | restricted | public. Fallback devolve o cru.
export function circuitVisibilityLabel(raw?: string | null): string {
  const value = (raw || "").trim().toLowerCase();
  if (value === "private") return "Privado";
  if (value === "restricted") return "Restrito";
  if (value === "public") return "Público";
  return raw || "—";
}
