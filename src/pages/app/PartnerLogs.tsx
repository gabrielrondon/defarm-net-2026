import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation, type TFunction } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api/client";
import {
  clearLog,
  getLogEntries,
  subscribeLog,
  type PartnerRequestLogEntry,
} from "@/lib/api/partner-request-log";
import { listRawPayloads, downloadRawPayload, type RawPayloadSummary } from "@/lib/api/partner-routing";
import { Download, ExternalLink, Info, Languages, Loader2, Radio, ScrollText, Trash2, Webhook } from "lucide-react";
import { usePartnerPortalLocale } from "@/components/partner/usePartnerPortalLocale";

type TimelineEntry =
  | { source: "api"; id: string; ts: string; item: PartnerRequestLogEntry }
  | { source: "payload"; id: string; ts: string; item: RawPayloadSummary };

type CanonicalEntry = { canonicalKey: string; rawKeys: string[]; value: unknown };
type FieldDef = { canonical: string; aliases: string[] };

// Rótulos dos campos canônicos vivem no catálogo (portal.logs.fields.<canonical>);
// aqui ficam só canonical + aliases (a máquina de normalização/agrupamento).
const FIELD_DEFS: FieldDef[] = [
  { canonical: "value_chain", aliases: ["value_chain", "valuechain"] },
  { canonical: "sisbov", aliases: ["sisbov"] },
  { canonical: "chip", aliases: ["chip", "rfid"] },
  { canonical: "inscricao_estadual", aliases: ["inscricao_estadual", "ie"] },
  { canonical: "car", aliases: ["car"] },
  { canonical: "weight_kg", aliases: ["weight_kg", "weight", "peso_kg", "peso"] },
  { canonical: "data_peso", aliases: ["data_peso", "data_pesagem", "weight_date", "date"] },
  {
    canonical: "partner_internal_id",
    aliases: ["partner_internal_id", "partner_reference", "external_id", "animal_id"],
  },
];

const FIELD_ALIAS = (() => {
  const map = new Map<string, string>();
  for (const def of FIELD_DEFS) {
    map.set(def.canonical, def.canonical);
    for (const alias of def.aliases) map.set(alias, def.canonical);
  }
  return map;
})();

function normalizeField(key: string): string {
  return key
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function canonicalLabel(key: string, t: TFunction): string {
  return t(`portal.logs.fields.${key}`, { defaultValue: key });
}

function parseCanonicalEntriesFromRequestBody(body: string | null | undefined): CanonicalEntry[] {
  if (!body) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return [];
  }

  const obj = parsed as Record<string, unknown>;
  const firstItem =
    Array.isArray(parsed)
      ? (parsed[0] as Record<string, unknown> | undefined)
      : Array.isArray(obj?.items)
        ? (obj.items[0] as Record<string, unknown> | undefined)
        : undefined;
  if (!firstItem || typeof firstItem !== "object") return [];

  const grouped = new Map<string, CanonicalEntry>();
  for (const [rawKey, value] of Object.entries(firstItem)) {
    if (value === null || value === undefined || value === "") continue;
    const canonical = FIELD_ALIAS.get(normalizeField(rawKey)) || normalizeField(rawKey);
    const current = grouped.get(canonical);
    if (!current) {
      grouped.set(canonical, { canonicalKey: canonical, rawKeys: [rawKey], value });
      continue;
    }
    if (!current.rawKeys.includes(rawKey)) current.rawKeys.push(rawKey);
    if (normalizeField(rawKey) === canonical) current.value = value;
  }
  return Array.from(grouped.values()).sort((a, b) => a.canonicalKey.localeCompare(b.canonicalKey));
}

function prettyJson(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

// Rótulo bilíngue do status de payload persistido. Enum alinhado ao CHECK real de
// ingestion_raw_payloads.status (migration 20260223000006):
// received | processing | completed | partial | failed (DEFAULT 'received').
// Módulo-level pra ser reusado tanto pelo badge quanto pelo resumo (não vazar cru).
// Enum alinhado ao CHECK real de ingestion_raw_payloads.status (migration
// 20260223000006): received | processing | completed | partial | failed. defaultValue
// devolve o cru (NOT NULL + DEFAULT 'received' → praticamente inatingível).
function payloadStatusLabel(status: string | null | undefined, t: TFunction): string {
  if (!status) return "—";
  return t(`portal.enums.payloadStatus.${status}`, { defaultValue: status });
}

function buildRawPayloadSummary(row: RawPayloadSummary, t: TFunction): string {
  const pieces = [
    payloadStatusLabel(row.status, t),
    `${row.payload_size_bytes.toLocaleString("pt-BR")} bytes`,
    row.file_name || "payload",
  ];
  if (row.error_message) pieces.push(`${t("portal.logs.summaryError")}: ${row.error_message}`);
  return pieces.join(" · ");
}

export default function PartnerLogs() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { locale: metadataLocale, setLocale: setMetadataLocale } = usePartnerPortalLocale();
  // Delega ao helper module-level (mesmo enum usado no resumo do payload).
  const formatPayloadStatus = (status: string | null | undefined): string =>
    payloadStatusLabel(status, t);
  const [loading, setLoading] = useState(true);
  const [rawHistory, setRawHistory] = useState<RawPayloadSummary[]>([]);
  const [rawCursor, setRawCursor] = useState<string | null>(null);
  const [rawHasMore, setRawHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [localLogs, setLocalLogs] = useState<PartnerRequestLogEntry[]>(getLogEntries);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "api" | "payload">("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [liveTail, setLiveTail] = useState(false);
  const [onlyNew, setOnlyNew] = useState(false);
  const [selected, setSelected] = useState<TimelineEntry | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const loadRawHistory = useCallback(async (cursor?: string | null) => {
    try {
      const response = await listRawPayloads(120, undefined, cursor ?? undefined);
      // cursor presente = "carregar mais" (anexa); ausente = primeira página (substitui).
      setRawHistory((prev) => (cursor ? [...prev, ...response.rows] : response.rows));
      setRawCursor(response.next_cursor ?? null);
      setRawHasMore(!!response.next_cursor);
    } catch (err) {
      const description =
        err instanceof ApiError
          ? `${err.message}${err.details ? ` · ${err.details}` : ""}`
          : t("portal.logs.toasts.loadErrorDesc");
      toast({
        title: t("portal.logs.toasts.loadErrorTitle"),
        description,
        variant: "destructive",
      });
    }
  }, [t, toast]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      await loadRawHistory();
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [loadRawHistory]);

  useEffect(() => {
    return subscribeLog(() => setLocalLogs(getLogEntries()));
  }, []);

  useEffect(() => {
    if (!autoRefresh && !liveTail) return;
    const id = window.setInterval(() => {
      void loadRawHistory();
    }, liveTail ? 3500 : 15000);
    return () => window.clearInterval(id);
  }, [autoRefresh, liveTail, loadRawHistory]);

  const timeline = useMemo<TimelineEntry[]>(() => {
    const apiEntries: TimelineEntry[] = localLogs.map((item) => ({
      source: "api",
      id: `api-${item.id}`,
      ts: item.timestamp,
      item,
    }));
    const payloadEntries: TimelineEntry[] = rawHistory.map((item) => ({
      source: "payload",
      id: `payload-${item.id}`,
      ts: item.created_at,
      item,
    }));
    return [...apiEntries, ...payloadEntries].sort((a, b) => +new Date(b.ts) - +new Date(a.ts));
  }, [localLogs, rawHistory]);

  const filteredTimeline = useMemo(() => {
    const text = search.trim().toLowerCase();
    return timeline.filter((entry) => {
      if (sourceFilter !== "all" && entry.source !== sourceFilter) return false;
      if (onlyNew && !newIds.has(entry.id)) return false;
      if (!text) return true;
      if (entry.source === "api") {
        const e = entry.item;
        return (
          e.endpoint.toLowerCase().includes(text) ||
          (e.errorCode || "").toLowerCase().includes(text) ||
          (e.errorMessage || "").toLowerCase().includes(text) ||
          (e.responseSummary || "").toLowerCase().includes(text)
        );
      }
      const e = entry.item;
      return (
        (e.file_name || "").toLowerCase().includes(text) ||
        e.status.toLowerCase().includes(text) ||
        e.payload_sha256.toLowerCase().includes(text) ||
        (e.error_message || "").toLowerCase().includes(text)
      );
    });
  }, [timeline, sourceFilter, search, onlyNew, newIds]);

  useEffect(() => {
    const ids = timeline.map((e) => e.id);
    if (!initializedRef.current) {
      seenIdsRef.current = new Set(ids);
      initializedRef.current = true;
      return;
    }
    const incoming = ids.filter((id) => !seenIdsRef.current.has(id));
    if (incoming.length > 0) {
      setNewIds((prev) => {
        const next = new Set(prev);
        for (const id of incoming) next.add(id);
        return next;
      });
      for (const id of incoming) {
        seenIdsRef.current.add(id);
      }
    }
  }, [timeline]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="section-label mb-1">{t("portal.portal.section")}</p>
        <h1 className="text-foreground">{t("portal.logs.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
          {t("portal.logs.subtitle")}
        </p>
        <div className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/30 p-1 mt-3">
          <Languages className="h-3.5 w-3.5 text-muted-foreground ml-1" />
          <Button
            size="sm"
            variant={metadataLocale === "pt-BR" ? "default" : "ghost"}
            className="h-6 px-2 text-[11px]"
            onClick={() => setMetadataLocale("pt-BR")}
          >
            PT-BR
          </Button>
          <Button
            size="sm"
            variant={metadataLocale === "en" ? "default" : "ghost"}
            className="h-6 px-2 text-[11px]"
            onClick={() => setMetadataLocale("en")}
          >
            EN
          </Button>
        </div>
      </div>

      <Card className="p-4 flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} id="auto-refresh-logs" />
          <Label htmlFor="auto-refresh-logs">
            {t("portal.logs.autoRefresh")}
          </Label>
          <Switch checked={liveTail} onCheckedChange={setLiveTail} id="live-tail-logs" />
          <Label htmlFor="live-tail-logs" className="inline-flex items-center gap-1">
            <Radio className={`h-3.5 w-3.5 ${liveTail ? "text-primary" : "text-muted-foreground"}`} />
            Live Tail (3.5s)
          </Label>
          <Switch checked={onlyNew} onCheckedChange={setOnlyNew} id="only-new-logs" />
          <Label htmlFor="only-new-logs">{t("portal.logs.onlyNew")}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadRawHistory()}>
            {t("portal.logs.refreshNow")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={newIds.size === 0}
            onClick={() => setNewIds(new Set())}
          >
            {t("portal.logs.markRead", { count: newIds.size })}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={localLogs.length === 0}
            onClick={() => {
              clearLog();
              setLocalLogs([]);
              setNewIds(new Set());
              seenIdsRef.current = new Set();
              initializedRef.current = false;
            }}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {t("portal.logs.clearSession")}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/app/webhooks">
              <Webhook className="h-4 w-4 mr-1" />
              {t("portal.logs.listenWebhook")}
            </Link>
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("portal.logs.searchPlaceholder")}
          />
          <Select value={sourceFilter} onValueChange={(value: "all" | "api" | "payload") => setSourceFilter(value)}>
            <SelectTrigger><SelectValue placeholder={t("portal.logs.source")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("portal.logs.sourceAll")}</SelectItem>
              <SelectItem value="api">{t("portal.logs.sourceApi")}</SelectItem>
              <SelectItem value="payload">{t("portal.logs.sourcePayload")}</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground self-center">
            {t("portal.logs.eventsCount", { count: filteredTimeline.length })}
          </div>
        </div>
      </Card>

      {filteredTimeline.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={t("portal.logs.emptyTitle")}
          description={t("portal.logs.emptyDesc")}
        />
      ) : (
        <div className="space-y-2">
          {filteredTimeline.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setSelected(entry)}
              className={`w-full text-left rounded-lg border p-3 hover:bg-muted/30 transition-colors ${
                newIds.has(entry.id) ? "border-primary/40 bg-primary/5" : ""
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:justify-between">
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {entry.source === "api"
                      ? `${entry.item.method} ${entry.item.endpoint}`
                      : (entry.item.file_name || t("portal.logs.payloadFallback"))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.ts).toLocaleString("pt-BR")}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {entry.source === "api"
                      ? entry.item.responseSummary || entry.item.errorMessage || t("portal.logs.noSummary")
                      : buildRawPayloadSummary(entry.item, t)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {newIds.has(entry.id) ? (
                    <span className="text-[11px] px-2 py-1 rounded-full border bg-primary/10 text-primary border-primary/20">
                      {t("portal.logs.new")}
                    </span>
                  ) : null}
                  <span className={`text-[11px] px-2 py-1 rounded-full border ${
                    entry.source === "api"
                      ? (entry.item.status != null && entry.item.status < 400
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-destructive/10 text-destructive border-destructive/20")
                      : (entry.item.status === "completed"
                          ? "bg-primary/10 text-primary border-primary/20"
                          : entry.item.status === "failed"
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : "bg-muted text-muted-foreground border-border")
                  }`}>
                    {entry.source === "api"
                      ? (entry.item.status ?? t("portal.logs.network"))
                      : formatPayloadStatus(entry.item.status)}
                  </span>
                  <span className={`text-[11px] px-2 py-1 rounded-full border ${
                    entry.source === "api"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-violet-50 text-violet-700 border-violet-200"
                  }`}>
                    {entry.source === "api" ? "API" : t("portal.logs.badgePersisted")}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {rawHasMore && sourceFilter !== "api" ? (
        <div className="flex justify-center pt-1">
          <Button
            variant="outline"
            size="sm"
            disabled={loadingMore}
            onClick={async () => {
              setLoadingMore(true);
              await loadRawHistory(rawCursor);
              setLoadingMore(false);
            }}
          >
            {loadingMore ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {t("portal.logs.loadMore")}
          </Button>
        </div>
      ) : null}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
          <DialogTitle>{t("portal.logs.detailsTitle")}</DialogTitle>
          <DialogDescription>
              {selected?.source === "api"
                ? t("portal.logs.detailsApiDesc")
                : t("portal.logs.detailsPayloadDesc")}
            </DialogDescription>
          </DialogHeader>

          {selected ? (
            <div className="space-y-3 overflow-y-auto pr-1">
              {selected.source === "api" ? (
                <div className="space-y-3">
                  <p className="text-sm">
                    <span className="font-medium">Endpoint:</span>{" "}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">{selected.item.method} {selected.item.endpoint}</code>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selected.item.timestamp).toLocaleString("pt-BR")} · {selected.item.durationMs} ms · status{" "}
                    {selected.item.status ?? t("portal.logs.networkError")}
                  </p>
                  {selected.item.errorCode ? (
                    <p className="text-sm text-destructive">
                      {selected.item.errorCode}: {selected.item.errorMessage || t("portal.logs.noMessage")}
                    </p>
                  ) : null}
                  {selected.item.requestBody ? (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {t("portal.logs.sentRequest")}
                      </p>
                      <pre className="code-block max-h-64 overflow-auto">{selected.item.requestBody}</pre>
                    </div>
                  ) : null}
                  {(() => {
                    const entries = parseCanonicalEntriesFromRequestBody(selected.item.requestBody);
                    if (entries.length === 0) return null;
                    return (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          {t("portal.logs.canonicalInterp")}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {entries.map((entry) => (
                            <div key={`${entry.canonicalKey}-${entry.rawKeys.join(",")}`} className="rounded border p-2 bg-muted/20">
                              <div className="flex items-center gap-1.5">
                                <p className="text-[11px] font-medium text-foreground">
                                  {canonicalLabel(entry.canonicalKey, t)}
                                </p>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button type="button" className="text-muted-foreground hover:text-foreground">
                                      <Info className="h-3 w-3" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs max-w-xs">
                                    {t("portal.logs.originalFields")}
                                    {entry.rawKeys.join(", ")}
                                    <br />
                                    {t("portal.logs.officialField")}
                                    <code>{entry.canonicalKey}</code>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <p className="text-xs text-muted-foreground break-words mt-1">{String(entry.value)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  {selected.item.responseBody ? (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {t("portal.logs.receivedResponse")}
                      </p>
                      <pre className="code-block max-h-64 overflow-auto">{selected.item.responseBody}</pre>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm">
                    <span className="font-medium">{t("portal.logs.file")}</span> {selected.item.file_name || "payload"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selected.item.created_at).toLocaleString("pt-BR")} · {selected.item.payload_size_bytes.toLocaleString("pt-BR")} bytes
                  </p>
                  <p className="text-xs text-muted-foreground">
                    sha256: <code>{selected.item.payload_sha256}</code>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    content-type: {selected.item.content_type || "n/a"} · {t("portal.logs.mode")}: {selected.item.intake_mode}
                  </p>
                  {selected.item.error_message ? (
                    <p className="text-sm text-destructive">{selected.item.error_message}</p>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const { blob, fileName } = await downloadRawPayload(selected.item.id, {
                            suggestedFileName: selected.item.file_name,
                            contentType: selected.item.content_type,
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = fileName;
                          a.click();
                          URL.revokeObjectURL(url);
                        } catch {
                          toast({
                            title: t("portal.logs.toasts.downloadErrorTitle"),
                            description: t("portal.logs.toasts.downloadErrorDesc"),
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      {t("portal.logs.downloadRaw")}
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <Link to="/app/parceiro">
                        {t("portal.logs.partnerPortal")} <ExternalLink className="h-3.5 w-3.5 ml-1" />
                      </Link>
                    </Button>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("portal.logs.processingMetadata")}
                    </p>
                    <pre className="code-block max-h-72 overflow-auto">{prettyJson(selected.item.metadata)}</pre>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
