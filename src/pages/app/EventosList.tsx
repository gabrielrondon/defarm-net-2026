import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Search, 
  Activity, 
  Filter,
  Package,
  GitBranch,
  User,
  Clock,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getEvents, Event } from "@/lib/defarm-api";

const eventTypeColors: Record<string, string> = {
  ItemCreated: "bg-blue-500/10 text-blue-600",
  ItemEnriched: "bg-purple-500/10 text-purple-600",
  CircuitPush: "bg-primary/10 text-primary",
  CircuitPull: "bg-orange-500/10 text-orange-600",
  ItemMerged: "bg-yellow-500/10 text-yellow-600",
  ItemSplit: "bg-red-500/10 text-red-600",
};

const eventTypeLabels: Record<string, string> = {
  ItemCreated: "Item Criado",
  ItemEnriched: "Item Enriquecido",
  CircuitPush: "Push para Circuito",
  CircuitPull: "Pull de Circuito",
  ItemMerged: "Itens Mesclados",
  ItemSplit: "Item Dividido",
};

const eventTypeIcons: Record<string, typeof Activity> = {
  ItemCreated: Package,
  ItemEnriched: Activity,
  CircuitPush: GitBranch,
  CircuitPull: GitBranch,
  ItemMerged: Package,
  ItemSplit: Package,
};

export default function EventosList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: events = [], isLoading, error, refetch } = useQuery({
    queryKey: ["events"],
    queryFn: () => getEvents(),
  });

  const filteredEvents = events.filter((event) => {
    const matchesSearch = 
      event.dfid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.event_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || event.event_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `há ${diffMins} min`;
    if (diffHours < 24) return `há ${diffHours}h`;
    if (diffDays < 7) return `há ${diffDays}d`;
    return date.toLocaleDateString("pt-BR");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando eventos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Erro ao carregar eventos
        </h1>
        <p className="text-muted-foreground mb-6">
          {error instanceof Error ? error.message : "Tente novamente mais tarde"}
        </p>
        <Button onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Eventos</h1>
        <p className="text-muted-foreground mt-1">
          Histórico completo de eventos e atividades
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por DFID, tipo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Tipo: {typeFilter === "all" ? "Todos" : eventTypeLabels[typeFilter] || typeFilter}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setTypeFilter("all")}>Todos</DropdownMenuItem>
            {Object.keys(eventTypeLabels).map((type) => (
              <DropdownMenuItem key={type} onClick={() => setTypeFilter(type)}>
                {eventTypeLabels[type]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Timeline */}
      {filteredEvents.length > 0 ? (
        <div className="space-y-1">
          {filteredEvents.map((event, index) => {
            const Icon = eventTypeIcons[event.event_type] || Activity;
            
            return (
              <div
                key={event.id}
                className={cn(
                  "relative pl-8 pb-6",
                  index !== filteredEvents.length - 1 && "border-l-2 border-border ml-3"
                )}
              >
                {/* Timeline dot */}
                <div className={cn(
                  "absolute left-0 top-0 w-7 h-7 rounded-full flex items-center justify-center -translate-x-1/2",
                  eventTypeColors[event.event_type] || "bg-muted"
                )}>
                  <Icon className="h-3.5 w-3.5" />
                </div>

                {/* Event card */}
                <div className="bg-background border border-border rounded-xl p-4 ml-4 hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full",
                          eventTypeColors[event.event_type] || "bg-muted text-muted-foreground"
                        )}>
                          {eventTypeLabels[event.event_type] || event.event_type}
                        </span>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          event.visibility === "Public" 
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {event.visibility === "Public" ? "Público" : 
                           event.visibility === "CircuitOnly" ? "Circuito" : "Privado"}
                        </span>
                      </div>
                      
                      <p className="font-mono text-sm text-foreground mb-2">
                        {event.dfid}
                      </p>

                      {event.metadata && Object.keys(event.metadata).length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {event.metadata.circuit && (
                            <span>Circuito: {event.metadata.circuit as string}</span>
                          )}
                          {event.metadata.fields && (
                            <span>Campos: {(event.metadata.fields as string[]).join(", ")}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(event.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Nenhum evento encontrado
          </h3>
          <p className="text-muted-foreground">
            {searchQuery ? "Tente uma busca diferente" : "Os eventos aparecerão aqui"}
          </p>
        </div>
      )}
    </div>
  );
}
