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
};

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
