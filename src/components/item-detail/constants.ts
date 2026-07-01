import {
  Sprout,
  Weight,
  Syringe,
  Pill,
  Tags,
  Truck,
  MapPin,
  MapPinOff,
  Plus,
  Sparkles,
  ArrowRightLeft,
  ArrowDownToLine,
  Scissors,
  Merge,
  Archive,
  RefreshCw,
  FileCheck,
  Ruler,
  Beef,
  Database,
  Link2,
  type LucideIcon,
} from "lucide-react";

// Support both PascalCase and snake_case event types from API
export const eventTypeLabels: Record<string, string> = {
  ItemCreated: "Item Criado",
  item_created: "Item Criado",
  ItemEnriched: "Item Enriquecido",
  item_enriched: "Item Enriquecido",
  CircuitPush: "Push para Circuito",
  circuit_push: "Push para Circuito",
  CircuitPull: "Pull de Circuito",
  circuit_pull: "Pull de Circuito",
  ItemMerged: "Itens Mesclados",
  item_merged: "Itens Mesclados",
  ItemSplit: "Item Dividido",
  item_split: "Item Dividido",
  item_updated: "Item Atualizado",
  item_archived: "Item Arquivado",
  item_status_changed: "Status Alterado",
  item_born: "Nascimento",
  item_weighed: "Pesagem",
  item_vaccinated: "Vacinação",
  item_treated: "Tratamento",
  item_classified: "Classificação",
  item_slaughtered: "Abate",
  item_movement: "Movimentação",
  item_property_linked: "Vinculado à Propriedade",
  item_property_unlinked: "Desvinculado da Propriedade",
  property_registered: "Propriedade Registrada",
  property_audited: "Propriedade Auditada",
  property_area_updated: "Área da Propriedade Atualizada",
  blockchain_anchor_created: "Âncora Blockchain Criada",
  blockchain_anchor_confirmed: "Âncora Blockchain Confirmada",
  blockchain_anchor: "Âncora Blockchain",
  ipfs_upload_completed: "Upload IPFS Concluído",
  ipfs_upload: "Upload IPFS",
};

export const eventTypeColors: Record<string, string> = {
  ItemCreated: "bg-blue-500/10 text-blue-600",
  item_created: "bg-blue-500/10 text-blue-600",
  ItemEnriched: "bg-purple-500/10 text-purple-600",
  item_enriched: "bg-purple-500/10 text-purple-600",
  CircuitPush: "bg-primary/10 text-primary",
  circuit_push: "bg-primary/10 text-primary",
  CircuitPull: "bg-orange-500/10 text-orange-600",
  circuit_pull: "bg-orange-500/10 text-orange-600",
  ItemMerged: "bg-yellow-500/10 text-yellow-600",
  item_merged: "bg-yellow-500/10 text-yellow-600",
  ItemSplit: "bg-red-500/10 text-red-600",
  item_split: "bg-red-500/10 text-red-600",
  item_updated: "bg-teal-500/10 text-teal-600",
  item_archived: "bg-gray-500/10 text-gray-600",
  item_status_changed: "bg-amber-500/10 text-amber-600",
  item_born: "bg-emerald-500/10 text-emerald-700",
  item_weighed: "bg-cyan-500/10 text-cyan-700",
  item_vaccinated: "bg-green-500/10 text-green-700",
  item_treated: "bg-teal-500/10 text-teal-700",
  item_classified: "bg-amber-500/10 text-amber-700",
  item_slaughtered: "bg-rose-500/10 text-rose-700",
  item_movement: "bg-indigo-500/10 text-indigo-700",
  item_property_linked: "bg-sky-500/10 text-sky-700",
  item_property_unlinked: "bg-rose-500/10 text-rose-700",
  property_registered: "bg-lime-500/10 text-lime-700",
  property_audited: "bg-violet-500/10 text-violet-700",
  property_area_updated: "bg-orange-500/10 text-orange-700",
  blockchain_anchor_created: "bg-indigo-500/10 text-indigo-700",
  blockchain_anchor_confirmed: "bg-indigo-500/10 text-indigo-700",
  blockchain_anchor: "bg-indigo-500/10 text-indigo-700",
  ipfs_upload_completed: "bg-sky-500/10 text-sky-700",
  ipfs_upload: "bg-sky-500/10 text-sky-700",
};

/** Icon per event type for richer timeline */
export const eventTypeIcons: Record<string, LucideIcon> = {
  item_created: Plus,
  ItemCreated: Plus,
  item_enriched: Sparkles,
  ItemEnriched: Sparkles,
  circuit_push: ArrowRightLeft,
  CircuitPush: ArrowRightLeft,
  circuit_pull: ArrowDownToLine,
  CircuitPull: ArrowDownToLine,
  item_merged: Merge,
  ItemMerged: Merge,
  item_split: Scissors,
  ItemSplit: Scissors,
  item_updated: RefreshCw,
  item_archived: Archive,
  item_status_changed: RefreshCw,
  item_born: Sprout,
  item_weighed: Weight,
  item_vaccinated: Syringe,
  item_treated: Pill,
  item_classified: Tags,
  item_slaughtered: Beef,
  item_movement: Truck,
  item_property_linked: MapPin,
  item_property_unlinked: MapPinOff,
  property_registered: FileCheck,
  property_audited: FileCheck,
  property_area_updated: Ruler,
  blockchain_anchor_created: Database,
  blockchain_anchor_confirmed: Database,
  blockchain_anchor: Database,
  ipfs_upload_completed: Link2,
  ipfs_upload: Link2,
};

/**
 * "Real-life" events that a producer cares about.
 * Everything else is considered "operational" (blockchain anchors, circuit sync, etc.)
 */
export const REAL_LIFE_EVENT_TYPES = new Set([
  "item_created",
  "ItemCreated",
  "item_born",
  "item_weighed",
  "item_vaccinated",
  "item_treated",
  "item_classified",
  "item_slaughtered",
  "item_movement",
  "item_property_linked",
  "item_property_unlinked",
  "item_status_changed",
  "item_updated",
  "property_registered",
  "property_audited",
  "property_area_updated",
  // Persona surface event types (engines #118) — these are real-life proof events,
  // not technical/operational ones, so they render on the public verifier with
  // provenance (closes the moat loop). See defarm-net-2026#6.
  "attestation_issued",
  "seal_granted",
  "item_transferred",
  "item_terminated",
]);

export const formatTime = (timestamp?: string | null): string => {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatDateShort = (timestamp?: string | null): string => {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};
