import { useMemo, useState } from "react";
import { useTranslation, type TFunction } from "react-i18next";
import { Activity, Clock, Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Event } from "@/lib/defarm-api";
import { eventTypeColors, eventTypeIcons, formatTime, REAL_LIFE_EVENT_TYPES } from "./constants";
import { useAuth } from "@/contexts/AuthContext";
import {
  getEventGovernance,
  grantEventDelegation,
  updateEventVisibility,
} from "@/lib/api/events";

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

  return null;
}

function trustLabel(level: string | undefined, score: number | undefined, t: TFunction): { text: string; className: string } {
  if (!level && typeof score !== "number") {
    return { text: t("portal.items.timeline.trust.na"), className: "bg-muted text-muted-foreground" };
  }

  const safeScore = typeof score === "number" ? Math.max(0, Math.min(100, score)) : undefined;
  const normalized = (level || (safeScore !== undefined && safeScore >= 80 ? "high" : safeScore !== undefined && safeScore >= 60 ? "medium" : "low")).toLowerCase();
  const suffix = safeScore !== undefined ? ` · ${safeScore}` : "";

  if (normalized === "high") {
    return { text: `${t("portal.items.timeline.trust.high")}${suffix}`, className: "bg-emerald-500/10 text-emerald-700" };
  }
  if (normalized === "medium") {
    return { text: `${t("portal.items.timeline.trust.medium")}${suffix}`, className: "bg-amber-500/10 text-amber-700" };
  }
  return { text: `${t("portal.items.timeline.trust.low")}${suffix}`, className: "bg-rose-500/10 text-rose-700" };
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
  const { t } = useTranslation();
  const [showOperational, setShowOperational] = useState(false);
  const [loadingEventId, setLoadingEventId] = useState<string | null>(null);
  const [governanceByEvent, setGovernanceByEvent] = useState<Record<string, {
    canManageVisibility: boolean;
    canManageDisclosure: boolean;
  }>>({});
  const { user } = useAuth();

  const { realEvents, operationalCount } = useMemo(() => {
    let opCount = 0;
    const real: Event[] = [];
    for (const e of events) {
      if (REAL_LIFE_EVENT_TYPES.has(e.event_type)) {
        real.push(e);
      } else {
        opCount++;
      }
    }
    return { realEvents: real, operationalCount: opCount };
  }, [events]);

  const visibleEvents = showOperational ? events : realEvents;

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
    <div className="lg:col-span-2">
      <div className="bg-background border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t("portal.items.timeline.title")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("portal.items.timeline.eventsCount", { count: realEvents.length })}
                {operationalCount > 0 && (
                  <span className="text-muted-foreground/60"> {t("portal.items.timeline.operationalCount", { count: operationalCount })}</span>
                )}
              </p>
            </div>
          </div>

          {operationalCount > 0 && (
            <button
              onClick={() => setShowOperational((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border hover:bg-muted/50"
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
                  "relative pl-8 pb-6",
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

                <div className="bg-muted/50 rounded-xl p-4 ml-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full",
                          eventTypeColors[event.event_type] || "bg-muted text-muted-foreground"
                        )}
                      >
                        {t(`portal.enums.eventType.${event.event_type?.toLowerCase()}`, { defaultValue: event.event_type })}
                      </span>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-background border border-border text-muted-foreground">
                          {t(`portal.enums.eventVisibility.${event.visibility ?? "circuit_only"}`, { defaultValue: t("portal.enums.eventVisibility.circuit_only") })}
                        </span>
                        {isOwner && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {t("portal.items.timeline.owner")}
                          </span>
                        )}
                        {event.is_duplicate && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700">
                            {t("portal.items.timeline.duplicate")}
                          </span>
                        )}
                        <span
                          className={cn("text-[11px] px-2 py-0.5 rounded-full", trust.className)}
                          title={
                            event.trust_factors
                              ? `${t("portal.items.timeline.trust.model", { version: event.trust_model_version || "v1" })} · ${JSON.stringify(event.trust_factors)}`
                              : t("portal.items.timeline.trust.model", { version: event.trust_model_version || "v1" })
                          }
                        >
                          {trust.text}
                        </span>
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
                            <p className="text-xs text-muted-foreground">{t("portal.items.timeline.summary.noDetails")}</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(event.created_at)}
                      </span>
                      {(isOwner || governance?.canManageVisibility) && (
                        <div className="mt-2 flex flex-wrap justify-end gap-1">
                          {!governance && (
                            <button
                              onClick={() => loadGovernance(event.id)}
                              className="px-2 py-1 rounded border border-border hover:bg-muted/50 text-[11px]"
                              disabled={loadingEventId === event.id}
                            >
                              {loadingEventId === event.id ? "..." : t("portal.items.timeline.manage")}
                            </button>
                          )}
                          {canManage && (
                            <>
                              <button
                                onClick={() => changeVisibility(event.id, "public")}
                                className="px-2 py-1 rounded border border-border hover:bg-muted/50 text-[11px]"
                                disabled={loadingEventId === event.id}
                              >
                                {t("portal.enums.eventVisibility.public")}
                              </button>
                              <button
                                onClick={() => changeVisibility(event.id, "circuit_only")}
                                className="px-2 py-1 rounded border border-border hover:bg-muted/50 text-[11px]"
                                disabled={loadingEventId === event.id}
                              >
                                {t("portal.enums.eventVisibility.circuit_only")}
                              </button>
                              <button
                                onClick={() => changeVisibility(event.id, "private")}
                                className="px-2 py-1 rounded border border-border hover:bg-muted/50 text-[11px]"
                                disabled={loadingEventId === event.id}
                              >
                                {t("portal.enums.eventVisibility.private")}
                              </button>
                              {isOwner && (
                                <button
                                  onClick={() => delegateManagement(event.id)}
                                  className="px-2 py-1 rounded border border-border hover:bg-muted/50 text-[11px]"
                                  disabled={loadingEventId === event.id}
                                >
                                  {t("portal.items.timeline.delegate")}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
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
              {t("portal.items.timeline.empty")}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t("portal.items.timeline.emptyDesc")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
