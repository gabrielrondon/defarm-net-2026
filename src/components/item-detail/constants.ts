export const eventTypeLabels: Record<string, string> = {
  ItemCreated: "Item Criado",
  ItemEnriched: "Item Enriquecido",
  CircuitPush: "Push para Circuito",
  CircuitPull: "Pull de Circuito",
  ItemMerged: "Itens Mesclados",
  ItemSplit: "Item Dividido",
};

export const eventTypeColors: Record<string, string> = {
  ItemCreated: "bg-blue-500/10 text-blue-600",
  ItemEnriched: "bg-purple-500/10 text-purple-600",
  CircuitPush: "bg-primary/10 text-primary",
  CircuitPull: "bg-orange-500/10 text-orange-600",
  ItemMerged: "bg-yellow-500/10 text-yellow-600",
  ItemSplit: "bg-red-500/10 text-red-600",
};

export const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
