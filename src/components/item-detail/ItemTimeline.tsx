import { Activity, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Event } from "@/lib/defarm-api";
import { eventTypeLabels, eventTypeColors, formatTime } from "./constants";

interface ItemTimelineProps {
  events: Event[];
  isLoading: boolean;
}

function eventSummary(event: Event): string | null {
  const payload = event.payload || {};
  const property = payload.property_dfid;
  const gta = payload.gta_number;
  const weight = payload.weight_kg;
  const occurredAt = payload.occurred_at;

  if (event.event_type === "item_movement") {
    const base = typeof property === "string" ? `Propriedade: ${property}` : "Movimentação registrada";
    return typeof gta === "string" && gta.length > 0 ? `${base} · GTA ${gta}` : base;
  }

  if (event.event_type === "item_property_linked" || event.event_type === "item_property_unlinked") {
    return typeof property === "string" ? `Propriedade: ${property}` : null;
  }

  if (event.event_type === "item_weighed" && typeof weight === "number") {
    return `${weight} kg${typeof occurredAt === "string" && occurredAt ? ` · ${occurredAt}` : ""}`;
  }

  if (event.event_type === "item_born" && typeof occurredAt === "string" && occurredAt) {
    return `Nascimento em ${occurredAt}`;
  }

  return null;
}

function visibilityLabel(visibility?: string): string {
  switch (visibility) {
    case "public":
      return "Público";
    case "private":
      return "Privado";
    case "circuit_only":
      return "Circuito";
    case "selective":
      return "Seletivo";
    default:
      return "Circuito";
  }
}

function compactDetails(event: Event): string[] {
  const details: string[] = [];
  const payload = event.payload || {};
  const metadata = event.metadata || {};

  const candidates: Array<[string, unknown]> = [
    ["property_dfid", payload.property_dfid],
    ["gta_number", payload.gta_number],
    ["status", payload.status],
    ["source", payload.source],
    ["source_system", payload.source_system],
    ["occurred_at", payload.occurred_at],
    ["tx_hash", payload.tx_hash],
    ["cid", payload.cid],
  ];

  for (const [key, value] of candidates) {
    if (value === undefined || value === null || value === "") continue;
    details.push(`${key}: ${String(value)}`);
  }

  if (details.length < 3) {
    for (const [key, value] of Object.entries(metadata)) {
      if (value === undefined || value === null || value === "") continue;
      details.push(`${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`);
      if (details.length >= 4) break;
    }
  }

  return details.slice(0, 4);
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
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : events.length > 0 ? (
          <div className="space-y-1">
            {events.map((event, index) => {
              const summary = eventSummary(event);
              const details = compactDetails(event);
              return (
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
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-background border border-border text-muted-foreground">
                          {visibilityLabel(event.visibility)}
                        </span>
                        {event.is_duplicate && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700">
                            duplicado
                          </span>
                        )}
                      </div>
                      {summary && <p className="text-sm text-foreground mt-2">{summary}</p>}
                      {!summary && (
                        <div className="mt-2 space-y-1">
                          {details.length > 0 ? (
                            details.map((line) => (
                              <p key={line} className="text-xs text-muted-foreground break-all">
                                {line}
                              </p>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground">Sem detalhes adicionais neste evento.</p>
                          )}
                        </div>
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
              );
            })}
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
          </div>
        )}
      </div>
    </div>
  );
}
