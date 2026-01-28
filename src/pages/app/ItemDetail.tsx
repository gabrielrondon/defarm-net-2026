import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Package,
  QrCode,
  Copy,
  CheckCircle2,
  XCircle,
  Loader2,
  GitBranch,
  Activity,
  Tag,
  Clock,
  User,
  ExternalLink,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getItem, getItemEvents, Item, Event } from "@/lib/defarm-api";

const eventTypeLabels: Record<string, string> = {
  ItemCreated: "Item Criado",
  ItemEnriched: "Item Enriquecido",
  CircuitPush: "Push para Circuito",
  CircuitPull: "Pull de Circuito",
  ItemMerged: "Itens Mesclados",
  ItemSplit: "Item Dividido",
};

const eventTypeColors: Record<string, string> = {
  ItemCreated: "bg-blue-500/10 text-blue-600",
  ItemEnriched: "bg-purple-500/10 text-purple-600",
  CircuitPush: "bg-primary/10 text-primary",
  CircuitPull: "bg-orange-500/10 text-orange-600",
  ItemMerged: "bg-yellow-500/10 text-yellow-600",
  ItemSplit: "bg-red-500/10 text-red-600",
};

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  // Fetch item details
  const { data: item, isLoading: isLoadingItem, error: itemError } = useQuery({
    queryKey: ["item", id],
    queryFn: () => getItem(id!),
    enabled: !!id,
  });

  // Fetch item events
  const { data: events = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ["itemEvents", id],
    queryFn: () => getItemEvents(id!),
    enabled: !!id,
  });

  const handleCopyDfid = () => {
    if (item?.dfid) {
      navigator.clipboard.writeText(item.dfid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isTokenized = item?.dfid?.startsWith("DFID-");

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoadingItem) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (itemError || !item) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Item não encontrado
        </h1>
        <p className="text-muted-foreground mb-6">
          O item que você está procurando não existe ou você não tem permissão para acessá-lo.
        </p>
        <Link to="/app/itens">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Itens
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <button
          onClick={() => navigate("/app/itens")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Itens
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0",
                isTokenized ? "bg-primary/10" : "bg-muted"
              )}
            >
              {isTokenized ? (
                <QrCode className="h-7 w-7 text-primary" />
              ) : (
                <Package className="h-7 w-7 text-muted-foreground" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-foreground font-mono">
                  {item.dfid.length > 30 ? `${item.dfid.slice(0, 30)}...` : item.dfid}
                </h1>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                    item.status === "Active"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {item.status === "Active" ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  {item.status === "Active" ? "Ativo" : item.status}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                    isTokenized
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {isTokenized ? (
                    <>
                      <QrCode className="h-3 w-3" />
                      Tokenizado
                    </>
                  ) : (
                    <>
                      <Package className="h-3 w-3" />
                      Local
                    </>
                  )}
                </span>
              </div>
              <button
                onClick={handleCopyDfid}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-mono bg-muted px-2 py-1 rounded"
              >
                {copied ? (
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                Copiar DFID
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline">
              <GitBranch className="h-4 w-4 mr-2" />
              Push para Circuito
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar evento
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Tag className="h-4 w-4 mr-2" />
                  Editar identificadores
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  Depreciar item
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Identifiers & Enriched Data */}
        <div className="lg:col-span-1 space-y-6">
          {/* Identifiers */}
          <div className="bg-background border border-border rounded-2xl p-6">
            <div className="flex items-center gap-3 pb-4 border-b border-border mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Tag className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Identificadores</h2>
                <p className="text-sm text-muted-foreground">
                  {item.identifiers.length} identificador(es)
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {item.identifiers.map((identifier, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase">
                      {identifier.namespace || "default"} / {identifier.key}
                    </span>
                    <span
                      className={cn(
                        "text-xs px-1.5 py-0.5 rounded",
                        identifier.id_type === "Canonical"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {identifier.id_type === "Canonical" ? "Canônico" : "Contextual"}
                    </span>
                  </div>
                  <p className="text-sm font-mono text-foreground break-all">
                    {identifier.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-background border border-border rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Metadados</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Criado em</span>
                <span className="text-foreground">
                  {formatTime(item.creation_timestamp)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Última atualização</span>
                <span className="text-foreground">
                  {formatTime(item.last_modified)}
                </span>
              </div>
              {item.confidence_score && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Confiança</span>
                  <span className="text-foreground">
                    {Math.round(item.confidence_score * 100)}%
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Local ID</span>
                <span className="text-foreground font-mono text-xs">
                  {item.local_id.length > 15
                    ? `${item.local_id.slice(0, 15)}...`
                    : item.local_id}
                </span>
              </div>
            </div>
          </div>

          {/* Enriched Data */}
          {item.enriched_data && Object.keys(item.enriched_data).length > 0 && (
            <div className="bg-background border border-border rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Dados Enriquecidos
              </h3>
              <div className="space-y-2">
                {Object.entries(item.enriched_data).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{key}</span>
                    <span className="text-foreground">
                      {typeof value === "object" ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column - Events Timeline */}
        <div className="lg:col-span-2">
          <div className="bg-background border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Histórico</h2>
                  <p className="text-sm text-muted-foreground">
                    {events.length} evento(s)
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Evento
              </Button>
            </div>

            {isLoadingEvents ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : events.length > 0 ? (
              <div className="space-y-1">
                {events.map((event, index) => (
                  <div
                    key={event.id}
                    className={cn(
                      "relative pl-8 pb-6",
                      index !== events.length - 1 && "border-l-2 border-border ml-3"
                    )}
                  >
                    <div
                      className={cn(
                        "absolute left-0 top-0 w-7 h-7 rounded-full flex items-center justify-center -translate-x-1/2",
                        eventTypeColors[event.event_type] || "bg-muted"
                      )}
                    >
                      <Activity className="h-3.5 w-3.5" />
                    </div>

                    <div className="bg-muted/50 rounded-xl p-4 ml-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span
                            className={cn(
                              "text-xs font-medium px-2 py-0.5 rounded-full",
                              eventTypeColors[event.event_type] || "bg-muted text-muted-foreground"
                            )}
                          >
                            {eventTypeLabels[event.event_type] || event.event_type}
                          </span>
                          {event.metadata && Object.keys(event.metadata).length > 0 && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {JSON.stringify(event.metadata)}
                            </p>
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
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Nenhum evento registrado
                </h3>
                <p className="text-muted-foreground mb-4">
                  Eventos aparecerão aqui conforme o item é modificado
                </p>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Evento
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
