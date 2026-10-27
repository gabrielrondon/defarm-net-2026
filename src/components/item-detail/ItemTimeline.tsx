import { useMemo, useState } from "react";
import { useTranslation, type TFunction } from "react-i18next";
import { Activity, Clock, Eye, EyeOff, Loader2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Event } from "@/lib/defarm-api";
import { eventTypeColors, eventTypeIcons, REAL_LIFE_EVENT_TYPES } from "./constants";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  getEventGovernance,
  grantEventDelegation,
  updateEventVisibility,
} from "@/lib/api/events";
import { ApiError } from "@/lib/api/client";

interface ItemTimelineProps {
  events: Event[];
  isLoading: boolean;
}

function eventSummary(event: Event, t: TFunction): string | null {
  const payload = event.payload || {};
  const property = payload.property_dfid;
  const gta = payload.gta_number;
  const weight = payload.weight_kg;
  const occurredAt = payload.occurred_at;

  if (event.event_type === "item_movement") {
    const base = typeof property === "string"
      ? t("portal.items.timeline.summary.property", { property })
      : t("portal.items.timeline.summary.movementRegistered");
    return typeof gta === "string" && gta.length > 0 ? `${base} · GTA ${gta}` : base;
  }

  if (event.event_type === "item_property_linked" || event.event_type === "item_property_unlinked") {
    return typeof property === "string" ? t("portal.items.timeline.summary.property", { property }) : null;
  }

  if (event.event_type === "item_weighed" && typeof weight === "number") {
    return `${t("portal.items.timeline.summary.weightKg", { weight })}${typeof occurredAt === "string" && occurredAt ? ` · ${occurredAt}` : ""}`;
  }

  if (event.event_type === "item_born" && typeof occurredAt === "string" && occurredAt) {
    return t("portal.items.timeline.summary.bornOn", { date: occurredAt });
  }

  // The name of what was applied or decided, not just the kind of event.
  const named: Record<string, unknown> = {
    item_vaccinated: payload.vaccine,
    item_treated: payload.treatment,
    item_classified: payload.classification,
  };
  const name = named[event.event_type];
  if (typeof name === "string" && name.trim()) return name.trim();

  const reason =
    event.event_type === "item_terminated" ? payload.motivo_baixa
      : event.event_type === "item_reactivated" ? payload.reactivation_reason
        : undefined;
  if (typeof reason === "string" && reason.trim()) {
    return t("portal.items.timeline.summary.reason", { reason: humanizeCode(reason) });
  }

  return null;
}

/** A code as the partner sends it ("MORTE_NATURAL", "MorteNatural") → "Morte natural". */
function humanizeCode(raw: string): string {
  const text = raw
    .trim()
    .replace(/([a-zà-ÿ])([A-ZÀ-Þ])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ");
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : raw;
}

/**
 * The day the fact happened, when the event says so and it differs from the day it was
 * declared. Returns null otherwise, so the line only shows one date when they agree.
 */
function occurredDay(event: Event, locale: string): string | null {
  const occurred = event.payload?.occurred_at;
  if (typeof occurred !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(occurred)) return null;
  const [y, m, d] = occurred.slice(0, 10).split("-").map(Number);
  const declared = event.created_at ? new Date(event.created_at) : null;
  // Compared in the viewer's timezone, the same one the declared time is shown in: a fact
  // declared at 22h in Brasília is the same day locally even when it is already tomorrow in UTC.
  if (
    declared &&
    !isNaN(declared.getTime()) &&
    declared.getFullYear() === y &&
    declared.getMonth() + 1 === m &&
    declared.getDate() === d
  ) {
    return null;
  }
  return new Date(y, m - 1, d).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** The declared time in the viewer's language. */
function formatDeclared(timestamp: string | undefined, locale: string): string {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleString(locale, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function trustLabel(
  level: string | undefined,
  score: number | undefined,
  t: TFunction,
): { text: string; className: string; textClassName: string } {
  if (!level && typeof score !== "number") {
    return { text: t("portal.items.timeline.trust.na"), className: "bg-muted text-muted-foreground", textClassName: "text-muted-foreground" };
  }

  const safeScore = typeof score === "number" ? Math.max(0, Math.min(100, score)) : undefined;
  const normalized = (level || (safeScore !== undefined && safeScore >= 80 ? "high" : safeScore !== undefined && safeScore >= 60 ? "medium" : "low")).toLowerCase();
  const suffix = safeScore !== undefined ? ` · ${safeScore}` : "";

  if (normalized === "high") {
    return { text: `${t("portal.items.timeline.trust.high")}${suffix}`, className: "bg-emerald-500/10 text-emerald-700", textClassName: "text-emerald-700" };
  }
  if (normalized === "medium") {
    return { text: `${t("portal.items.timeline.trust.medium")}${suffix}`, className: "bg-amber-500/10 text-amber-700", textClassName: "text-amber-700" };
  }
  return { text: `${t("portal.items.timeline.trust.low")}${suffix}`, className: "bg-rose-500/10 text-rose-700", textClassName: "text-muted-foreground" };
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

/** The technical records as one compact block: a count per kind, then one short line each. */
function TechnicalRecords({ events }: { events: Event[] }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language || "pt-BR";
  const byType = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of events) counts.set(e.event_type, (counts.get(e.event_type) ?? 0) + 1);
    return Array.from(counts.entries());
  }, [events]);
  const label = (type: string) =>
    t(`portal.enums.eventType.${type.toLowerCase()}`, { defaultValue: type });

  return (
    <details className="mt-3 rounded-xl border border-border bg-muted/20 px-4 py-3 text-xs">
      <summary className="cursor-pointer text-muted-foreground">
        {t("portal.items.timeline.technicalRecords", { count: events.length })}
        {" · "}
        {byType.map(([type, n]) => `${n} ${label(type)}`).join(" · ")}
      </summary>
      <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto">
        {events.map((e) => {
          const p = e.payload || {};
          const ref = [p.transaction_hash, p.tx_hash, p.content_id, p.cid].find(
            (v): v is string => typeof v === "string" && v.length > 0,
          );
          return (
            <li key={e.id} className="flex gap-2 text-muted-foreground">
              <span className="text-foreground/80">{label(e.event_type)}</span>
              <span>{formatDeclared(e.created_at, locale)}</span>
              {ref && <span className="truncate font-mono">{ref.slice(0, 12)}…</span>}
            </li>
          );
        })}
      </ul>
    </details>
  );
}

export function ItemTimeline({ events, isLoading }: ItemTimelineProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language || "pt-BR";
  const { toast } = useToast();
  const [showOperational, setShowOperational] = useState(false);
  const [loadingEventId, setLoadingEventId] = useState<string | null>(null);
  const [governanceByEvent, setGovernanceByEvent] = useState<Record<string, {
    canManageVisibility: boolean;
    canManageDisclosure: boolean;
  }>>({});
  const { user } = useAuth();

  const { realEvents, operationalEvents } = useMemo(() => {
    const real: Event[] = [];
    const ops: Event[] = [];
    for (const e of events) {
      if (REAL_LIFE_EVENT_TYPES.has(e.event_type)) {
        real.push(e);
      } else {
        ops.push(e);
      }
    }
    return { realEvents: real, operationalEvents: ops };
  }, [events]);
  const operationalCount = operationalEvents.length;

  // Technical records (anchoring, IPFS) never interleave with the animal's history: there can
  // be dozens of them per event. They open as one compact block under it.
  const visibleEvents = realEvents;

  const loadGovernance = async (eventId: string) => {
    setLoadingEventId(eventId);
    try {
      const g = await getEventGovernance(eventId);
      setGovernanceByEvent((prev) => ({
        ...prev,
        [eventId]: {
          canManageVisibility: g.caller_can_manage_visibility,
          canManageDisclosure: g.caller_can_manage_disclosure,
        },
      }));
    } finally {
      setLoadingEventId(null);
    }
  };

  const changeVisibility = async (eventId: string, visibility: "public" | "circuit_only" | "private") => {
    setLoadingEventId(eventId);
    try {
      await updateEventVisibility(eventId, { visibility });
      window.location.reload();
    } catch (err) {
      // #635: a public event cannot carry fields like the GTA; the backend names them.
      const notPublic =
        err instanceof ApiError && err.reason === "public_payload_field_not_allowed";
      toast({
        title: t("portal.items.timeline.visibilityFailed"),
        description: notPublic
          ? t("portal.items.timeline.visibilityFieldsNotPublic", { fields: err.details ?? "" })
          : undefined,
        variant: "destructive",
      });
    } finally {
      setLoadingEventId(null);
    }
  };

  const delegateManagement = async (eventId: string) => {
    const workspaceId = window.prompt(t("portal.items.timeline.delegatePrompt"));
    if (!workspaceId) return;
    setLoadingEventId(eventId);
    try {
      await grantEventDelegation(eventId, {
        delegate_workspace_id: workspaceId.trim(),
        can_manage_visibility: true,
        can_manage_disclosure: true,
      });
      await loadGovernance(eventId);
      window.alert(t("portal.items.timeline.delegateDone"));
    } finally {
      setLoadingEventId(null);
    }
  };

  return (
    <div>
      <div className="bg-background border border-border rounded-2xl p-5">
        {/* Cabeçalho de uma linha: título + a contagem HONESTA. Antes dizia "0 eventos"
            num item com 8 eventos técnicos escondidos atrás do toggle (#201). */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-border mb-4">
          <h2 className="text-base font-semibold text-foreground">
            {t("portal.items.timeline.title")}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {t("portal.items.timeline.eventsCount", { count: realEvents.length })}
              {operationalCount > 0 && (
                <> {t("portal.items.timeline.operationalCount", { count: operationalCount })}</>
              )}
            </span>
          </h2>

          {operationalCount > 0 && (
            <button
              onClick={() => setShowOperational((prev) => !prev)}
              className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showOperational ? (
                <>
                  <EyeOff className="h-3.5 w-3.5" />
                  {t("portal.items.timeline.hideOperational")}
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  {t("portal.items.timeline.showBlockchain")}
                </>
              )}
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : visibleEvents.length > 0 ? (
          <div className="space-y-1">
            {visibleEvents.map((event, index) => {
              const Icon = eventTypeIcons[event.event_type] || Activity;
              const isOperational = !REAL_LIFE_EVENT_TYPES.has(event.event_type);
              const summary = eventSummary(event, t);
              const details = compactDetails(event);
              const isOwner = !!event.event_owner_workspace_id && event.event_owner_workspace_id === user?.workspace_id;
              const governance = governanceByEvent[event.id];
              const canManage = governance?.canManageVisibility || isOwner;
              const trust = trustLabel(event.trust_level, event.trust_score, t);
              return (
              <div
                key={event.id}
                className={cn(
                  "relative pl-8 pb-4",
                  index !== visibleEvents.length - 1 && "border-l-2 border-border ml-3",
                  isOperational && "opacity-60"
                )}
              >
                <div
                  className={cn(
                    "absolute left-0 top-0 w-7 h-7 rounded-full flex items-center justify-center -translate-x-1/2",
                    eventTypeColors[event.event_type] || "bg-muted"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>

                <div className="ml-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-foreground">
                        {t(`portal.enums.eventType.${event.event_type?.toLowerCase()}`, { defaultValue: event.event_type })}
                      </span>
                      {summary && <p className="text-sm text-muted-foreground">{summary}</p>}
                      {!summary && details.length > 0 && (
                        <p className="text-xs text-muted-foreground break-all">{details.join(" · ")}</p>
                      )}
                      {/* Sinais em texto, não pílulas coloridas. A confiança só aparece nos
                          eventos de manejo: em evento técnico ela é sempre "baixa" por
                          construção, e uma pílula vermelha em cada âncora é alarme falso. */}
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                        <span>
                          {t(`portal.enums.eventVisibility.${event.visibility ?? "circuit_only"}`, {
                            defaultValue: t("portal.enums.eventVisibility.circuit_only"),
                          })}
                        </span>
                        {!isOperational && (
                          <>
                            <span aria-hidden>·</span>
                            <span
                              className={trust.textClassName}
                              title={
                                event.trust_factors
                                  ? `${t("portal.items.timeline.trust.model", { version: event.trust_model_version || "v1" })} · ${JSON.stringify(event.trust_factors)}`
                                  : t("portal.items.timeline.trust.model", { version: event.trust_model_version || "v1" })
                              }
                            >
                              {trust.text}
                            </span>
                          </>
                        )}
                        {isOwner && (
                          <>
                            <span aria-hidden>·</span>
                            <span>{t("portal.items.timeline.owner")}</span>
                          </>
                        )}
                        {event.is_duplicate && (
                          <>
                            <span aria-hidden>·</span>
                            <span className="text-amber-700">{t("portal.items.timeline.duplicate")}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      {(() => {
                        const occurred = occurredDay(event, locale);
                        return (
                          <span className="flex flex-col items-end leading-tight">
                            {occurred && (
                              <span className="text-foreground/80">
                                {t("portal.items.timeline.occurredOn", { date: occurred })}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {occurred
                                ? t("portal.items.timeline.declaredOn", { date: formatDeclared(event.created_at, locale) })
                                : formatDeclared(event.created_at, locale)}
                            </span>
                          </span>
                        );
                      })()}
                      {/* Governança de visibilidade num menu — eram 4 botões soltos por evento. */}
                      {(isOwner || governance?.canManageVisibility) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              aria-label={t("portal.items.timeline.manage")}
                              className="rounded p-1 hover:bg-muted/70"
                              disabled={loadingEventId === event.id}
                              onClick={() => {
                                if (!governance) loadGovernance(event.id);
                              }}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canManage ? (
                              <>
                                {(["public", "circuit_only", "private"] as const)
                                  // item_movement carries the GTA and can never be public (#635)
                                  .filter((v) => v !== "public" || event.event_type !== "item_movement")
                                  .map((v) => (
                                  <DropdownMenuItem key={v} onClick={() => changeVisibility(event.id, v)}>
                                    {t(`portal.enums.eventVisibility.${v}`)}
                                  </DropdownMenuItem>
                                ))}
                                {isOwner && (
                                  <DropdownMenuItem onClick={() => delegateManagement(event.id)}>
                                    {t("portal.items.timeline.delegate")}
                                  </DropdownMenuItem>
                                )}
                              </>
                            ) : (
                              <DropdownMenuItem disabled>
                                {loadingEventId === event.id ? "…" : t("portal.items.timeline.manage")}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
            {showOperational && <TechnicalRecords events={operationalEvents} />}
          </div>
        ) : operationalCount > 0 && showOperational ? (
          <TechnicalRecords events={operationalEvents} />
        ) : operationalCount > 0 ? (
          /* Não é "nenhum evento": existem N eventos técnicos. Dizer a verdade e oferecer
             o caminho, em duas linhas — não um vazio ilustrado que contradiz a contagem. */
          <p className="py-4 text-sm text-muted-foreground">
            {t("portal.items.timeline.onlyOperational", { count: operationalCount })}{" "}
            <button
              onClick={() => setShowOperational(true)}
              className="text-primary hover:underline"
            >
              {t("portal.items.timeline.showBlockchain")}
            </button>
          </p>
        ) : (
          <p className="py-4 text-sm text-muted-foreground">
            {t("portal.items.timeline.empty")} · {t("portal.items.timeline.emptyDesc")}
          </p>
        )}
      </div>
    </div>
  );
}
