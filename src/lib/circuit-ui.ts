export function normalizeCircuitStatus(raw?: string | null): "active" | "inactive" | "unknown" {
  const value = (raw || "").trim().toLowerCase();
  if (value === "active") return "active";
  if (value === "inactive") return "inactive";
  return "unknown";
}

// Status de circuito. Valores reais do CHECK circuits_status_check
// (migration 20250204000001): active | inactive | archived. 'archived' antes caía no
// fallback (normalizeCircuitStatus o mapeia p/ "unknown") e vazava cru — agora coberto.
export function circuitStatusLabel(raw?: string | null): string {
  const value = (raw || "").trim().toLowerCase();
  if (value === "active") return "Ativo";
  if (value === "inactive") return "Inativo";
  if (value === "archived") return "Arquivado";
  return raw || "Desconhecido";
}

// Tipo de circuito. Valores reais do CHECK circuits_type_check (migration 20250204000001,
// DEFAULT 'private'): private | shared | public | enterprise. O mapa anterior usava
// standard/supply_chain/compliance/audit — NENHUM casa com o enum real, então caía 100%
// no fallback "Standard". Corrigido pros 4 valores reais.
export function circuitTypeLabel(raw?: string | null): string {
  const value = (raw || "").trim().toLowerCase();
  if (value === "private") return "Privado";
  if (value === "shared") return "Compartilhado";
  if (value === "public") return "Público";
  if (value === "enterprise") return "Enterprise";
  return raw || "—";
}

export function isCircuitPublic(visibility?: string | null): boolean {
  return (visibility || "").trim().toLowerCase() === "public";
}

// A humanização de visibilidade migrou pro catálogo i18n (portal.enums.circuitVisibility,
// keyado pelos valores do CHECK circuits_visibility_check: private|restricted|public) —
// ver MeusCircuitos. circuitVisibilityLabel foi removida por ficar sem uso.
