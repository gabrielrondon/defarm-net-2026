import { Activity, Clock, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Event } from "@/lib/defarm-api";
import { eventTypeLabels, eventTypeColors, formatTime } from "./constants";

interface ItemTimelineProps {
  events: Event[];
  isLoading: boolean;
}

export function ItemTimeline({ events, isLoading }: ItemTimelineProps) {
  return (
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

        {isLoading ? (
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
                        {formatTime(event.created_at)}
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
  );
}
