import { useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  Package,
  ShieldCheck,
  ExternalLink,
  CalendarDays,
  Globe,
  Wheat,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPublicItem, getPublicItemEvents } from "@/lib/defarm-api";
import {
  eventTypeColors,
  eventTypeLabels,
  eventTypeIcons,
  formatDateShort,
  formatTime,
  REAL_LIFE_EVENT_TYPES,
} from "@/components/item-detail/constants";
import logoIcon from "@/assets/logo-icon.png";
import type { PublicItemEvent } from "@/lib/api/types";

/* ── helpers ─────────────────────────────────── */

const chainLabels: Record<string, string> = {
  BEEF: "Bovinos",
  DAIRY: "Leite",
  PORK: "Suínos",
  POULTRY: "Aves",
};

const statusMap: Record<string, { text: string; className: string }> = {
  active: { text: "Ativo", className: "bg-primary/10 text-primary" },
  inactive: { text: "Inativo", className: "bg-muted text-muted-foreground" },
  deprecated: { text: "Depreciado", className: "bg-destructive/10 text-destructive" },
};

function eventSummary(event: PublicItemEvent): string | null {
  const p = event.payload || {};
  if (event.event_type === "item_movement") {
    const base = typeof p.property_dfid === "string" ? `Propriedade: ${p.property_dfid}` : "Movimentação registrada";
    return typeof p.gta_number === "string" ? `${base} · GTA ${p.gta_number}` : base;
  }
  if (event.event_type === "item_property_linked" || event.event_type === "item_property_unlinked") {
    return typeof p.property_dfid === "string" ? `Propriedade: ${p.property_dfid}` : null;
  }
  if (event.event_type === "item_weighed" && typeof p.weight_kg === "number") {
    return `${p.weight_kg} kg${typeof p.occurred_at === "string" ? ` · ${p.occurred_at}` : ""}`;
  }
  if (event.event_type === "item_born" && typeof p.occurred_at === "string") {
    return `Nascimento em ${p.occurred_at}`;
  }
  // generic: show source if available
  if (typeof p.source === "string") return `Origem: ${p.source}`;
  return null;
}

/* ── main component ──────────────────────────── */

export default function PublicItem() {
  const { dfid } = useParams<{ dfid: string }>();
  const [showOperational, setShowOperational] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const { data: item, isLoading, error } = useQuery({
    queryKey: ["public-item", dfid],
    queryFn: () => getPublicItem(dfid!),
    enabled: !!dfid,
    retry: 1,
  });

  const { data: events = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ["public-item-events", dfid],
    queryFn: () => getPublicItemEvents(dfid!, { limit: 50 }),
    enabled: !!dfid,
    retry: 1,
  });

  const { realEvents, operationalEvents } = useMemo(() => {
    const real: PublicItemEvent[] = [];
    const ops: PublicItemEvent[] = [];
    for (const e of events) {
      if (REAL_LIFE_EVENT_TYPES.has(e.event_type)) real.push(e);
      else ops.push(e);
    }
    return { realEvents: real, operationalEvents: ops };
  }, [events]);

  const visibleEvents = showOperational ? events : realEvents;

  const toggleExpanded = (id: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* ── edge states ── */

  if (isLoading) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-7 w-7 animate-spin text-primary mb-3" />
          <p className="text-sm text-muted-foreground">Carregando dados do animal…</p>
        </div>
      </Shell>
    );
  }

  if (error || !item) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Package className="h-10 w-10 text-muted-foreground/40 mb-4" />
          <h1 className="text-lg font-semibold text-foreground">Item não encontrado</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Este item não existe ou não está disponível publicamente.
          </p>
          <Link to="/" className="mt-6">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Voltar ao início
            </Button>
          </Link>
        </div>
      </Shell>
    );
  }

  const st = statusMap[(item.status || "").toLowerCase()] || statusMap.active;

  return (
    <Shell>
      <div className="space-y-6">
        {/* ── breadcrumb ── */}
        <Link
          to="/"
          className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Início
        </Link>

        {/* ── item hero card ── */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/8 via-background to-primary/4 border border-primary/10 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Wheat className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground font-mono tracking-tight break-all">
                {item.dfid}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.className}`}>
                  {st.text}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Globe className="h-3 w-3" />
                  {item.country}
                </span>
                <span className="text-xs text-muted-foreground">
                  {chainLabels[item.value_chain] || item.value_chain}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarDays className="h-3 w-3" />
                  {item.year}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium self-start">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verificado
            </div>
          </div>
        </div>

        {/* ── metadata ── */}
        {item.metadata && Object.keys(item.metadata).length > 0 && (
          <section className="rounded-xl border border-border p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">Metadados públicos</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(item.metadata).map(([key, value]) => (
                <div key={key} className="bg-muted/40 rounded-lg p-3">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{key.replace(/_/g, " ")}</p>
                  <p className="text-sm font-medium text-foreground mt-0.5 break-words">
                    {typeof value === "object" ? JSON.stringify(value) : String(value ?? "-")}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── timeline ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Activity className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Histórico do animal</h2>
                <p className="text-xs text-muted-foreground">
                  {realEvents.length} evento{realEvents.length !== 1 ? "s" : ""} de manejo
                  {operationalEvents.length > 0 && (
                    <span> · {operationalEvents.length} operacional(is)</span>
                  )}
                </p>
              </div>
            </div>

            {operationalEvents.length > 0 && (
              <button
                onClick={() => setShowOperational((prev) => !prev)}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border hover:bg-muted/50"
              >
                {showOperational ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    Ocultar operacionais
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    Mostrar operacionais
                  </>
                )}
              </button>
            )}
          </div>

          {isLoadingEvents ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : visibleEvents.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/30 py-12 text-center">
              <Activity className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum evento público disponível.</p>
            </div>
          ) : (
            <div className="relative">
              {/* vertical line */}
              <div className="absolute left-[19px] top-3 bottom-3 w-px bg-border" />

              <div className="space-y-0">
                {visibleEvents.map((event) => {
                  const Icon = eventTypeIcons[event.event_type] || Activity;
                  const colors = eventTypeColors[event.event_type] || "bg-muted text-muted-foreground";
                  const label = eventTypeLabels[event.event_type] || event.event_type;
                  const summary = eventSummary(event);
                  const isOperational = !REAL_LIFE_EVENT_TYPES.has(event.event_type);
                  const isExpanded = expandedEvents.has(event.id);
                  const hasPayload = event.payload && Object.keys(event.payload).length > 0;

                  return (
                    <div key={event.id} className="relative pl-12 pb-1 pt-1">
                      {/* dot */}
                      <div
                        className={`absolute left-[7px] top-3 w-6 h-6 rounded-full flex items-center justify-center ring-2 ring-background ${colors}`}
                      >
                        <Icon className="h-3 w-3" />
                      </div>

                      {/* card */}
                      <div
                        className={`rounded-xl border p-4 transition-colors ${
                          isOperational
                            ? "border-border/60 bg-muted/20"
                            : "border-border bg-background hover:bg-muted/20"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors}`}>
                                {label}
                              </span>
                              {isOperational && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                  operacional
                                </span>
                              )}
                            </div>
                            {summary && (
                              <p className="text-sm text-foreground mt-2">{summary}</p>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap mt-0.5">
                            {formatDateShort(event.created_at)}
                          </span>
                        </div>

                        {/* expandable payload */}
                        {hasPayload && (
                          <div className="mt-2">
                            <button
                              onClick={() => toggleExpanded(event.id)}
                              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-3 w-3" />
                                  Ocultar detalhes
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3" />
                                  Ver detalhes
                                </>
                              )}
                            </button>
                            {isExpanded && (
                              <div className="mt-2 rounded-lg bg-muted/50 p-3 space-y-1">
                                {Object.entries(event.payload!).map(([k, v]) => (
                                  <div key={k} className="flex gap-2 text-xs">
                                    <span className="text-muted-foreground min-w-[100px]">{k}:</span>
                                    <span className="text-foreground break-all font-mono">
                                      {typeof v === "object" ? JSON.stringify(v) : String(v ?? "-")}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </Shell>
  );
}

/* ── shell ────────────────────────────────────── */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={logoIcon} alt="DeFarm" className="h-7 w-7" />
            <span className="font-bold text-foreground text-sm">DeFarm</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Rastreabilidade verificada
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>

      <footer className="border-t border-border mt-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Dados verificados pela plataforma DeFarm
          </p>
          <a
            href="https://defarm.net"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            defarm.net
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </footer>
    </div>
  );
}
