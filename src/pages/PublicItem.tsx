import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, Loader2, Package, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPublicItem, getPublicItemEvents } from "@/lib/defarm-api";
import { eventTypeColors, eventTypeLabels, formatTime } from "@/components/item-detail/constants";

export default function PublicItem() {
  const { dfid } = useParams<{ dfid: string }>();

  const { data: item, isLoading, error } = useQuery({
    queryKey: ["public-item", dfid],
    queryFn: () => getPublicItem(dfid!),
    enabled: !!dfid,
    retry: 1,
  });

  const { data: events = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ["public-item-events", dfid],
    queryFn: () => getPublicItemEvents(dfid!, { limit: 30 }),
    enabled: !!dfid,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando item público...</p>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-4">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Item não encontrado</h1>
          <p className="text-muted-foreground mb-6">
            Este item não existe ou não está disponível publicamente.
          </p>
          <Link to="/">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao início
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Início
          </Link>
          <h1 className="text-3xl font-bold text-foreground">{item.dfid}</h1>
          <p className="text-muted-foreground mt-1">
            {item.value_chain} · {item.country} · {item.year}
          </p>
        </div>

        <div className="bg-background border border-border rounded-2xl p-5">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
              Status: {item.status}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground inline-flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              Dados públicos verificados
            </span>
          </div>
          {item.metadata && Object.keys(item.metadata).length > 0 ? (
            <pre className="text-xs bg-muted rounded-lg p-3 overflow-auto">
              {JSON.stringify(item.metadata, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">Sem metadados públicos.</p>
          )}
        </div>

        <div className="bg-background border border-border rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-foreground mb-4">Eventos públicos</h2>
          {isLoadingEvents ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando eventos...
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento público disponível.</p>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div key={event.id} className="border border-border rounded-xl p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${eventTypeColors[event.event_type] || "bg-muted text-muted-foreground"}`}>
                      {eventTypeLabels[event.event_type] || event.event_type}
                    </span>
                    <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(event.created_at)}
                    </span>
                  </div>
                  {event.payload && Object.keys(event.payload).length > 0 && (
                    <pre className="text-xs bg-muted rounded-lg p-2 overflow-auto">
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
