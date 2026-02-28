import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api/client";
import {
  clearLog,
  getLogEntries,
  subscribeLog,
  type PartnerRequestLogEntry,
} from "@/lib/api/partner-request-log";
import { listRawPayloads, downloadRawPayload, type RawPayloadSummary } from "@/lib/api/partner-routing";
import { Download, ExternalLink, Loader2, Radio, ScrollText, Trash2, Webhook } from "lucide-react";

type TimelineEntry =
  | { source: "api"; id: string; ts: string; item: PartnerRequestLogEntry }
  | { source: "payload"; id: string; ts: string; item: RawPayloadSummary };

function prettyJson(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function buildRawPayloadSummary(row: RawPayloadSummary): string {
  const pieces = [
    `${row.status}`,
    `${row.payload_size_bytes.toLocaleString("pt-BR")} bytes`,
    row.file_name || "payload",
  ];
  if (row.error_message) pieces.push(`erro: ${row.error_message}`);
  return pieces.join(" · ");
}

export default function PartnerLogs() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rawHistory, setRawHistory] = useState<RawPayloadSummary[]>([]);
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

  const loadRawHistory = useCallback(async () => {
    try {
      const response = await listRawPayloads(120);
      setRawHistory(response.rows);
    } catch (err) {
      const description =
        err instanceof ApiError
          ? `${err.message}${err.details ? ` · ${err.details}` : ""}`
          : "Não foi possível carregar histórico de payload.";
      toast({
        title: "Falha ao carregar logs persistidos",
        description,
        variant: "destructive",
      });
    }
  }, [toast]);

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
        <p className="section-label mb-1">Parceiro</p>
        <h1 className="text-foreground">Logs de Ingestão</h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
          Timeline consolidada de tentativas de envio e payloads processados. Abra cada evento para ver request, resposta,
          status, erro e baixar o bruto enviado.
        </p>
      </div>

      <Card className="p-4 flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} id="auto-refresh-logs" />
          <Label htmlFor="auto-refresh-logs">Atualizar automaticamente (15s)</Label>
          <Switch checked={liveTail} onCheckedChange={setLiveTail} id="live-tail-logs" />
          <Label htmlFor="live-tail-logs" className="inline-flex items-center gap-1">
            <Radio className={`h-3.5 w-3.5 ${liveTail ? "text-primary" : "text-muted-foreground"}`} />
            Live Tail (3.5s)
          </Label>
          <Switch checked={onlyNew} onCheckedChange={setOnlyNew} id="only-new-logs" />
          <Label htmlFor="only-new-logs">Somente novos</Label>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadRawHistory()}>
            Atualizar agora
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={newIds.size === 0}
            onClick={() => setNewIds(new Set())}
          >
            Marcar {newIds.size} nova(s) como lida(s)
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
            Limpar logs de sessão
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/app/webhooks">
              <Webhook className="h-4 w-4 mr-1" />
              Escutar via Webhook
            </Link>
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar endpoint, arquivo, hash, erro..."
          />
          <Select value={sourceFilter} onValueChange={(value: "all" | "api" | "payload") => setSourceFilter(value)}>
            <SelectTrigger><SelectValue placeholder="Origem" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tudo</SelectItem>
              <SelectItem value="api">Tentativas API (sessão atual)</SelectItem>
              <SelectItem value="payload">Payloads processados (persistido)</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground self-center">
            {filteredTimeline.length} evento(s) na timeline
          </div>
        </div>
      </Card>

      {filteredTimeline.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Nenhum log encontrado"
          description="Envie um arquivo no portal parceiro ou ajuste os filtros para visualizar os eventos."
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
                      : (entry.item.file_name || "payload bruto")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.ts).toLocaleString("pt-BR")}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {entry.source === "api"
                      ? entry.item.responseSummary || entry.item.errorMessage || "Sem resumo"
                      : buildRawPayloadSummary(entry.item)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {newIds.has(entry.id) ? (
                    <span className="text-[11px] px-2 py-1 rounded-full border bg-primary/10 text-primary border-primary/20">
                      novo
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
                    {entry.source === "api" ? (entry.item.status ?? "rede") : entry.item.status}
                  </span>
                  <span className={`text-[11px] px-2 py-1 rounded-full border ${
                    entry.source === "api"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-violet-50 text-violet-700 border-violet-200"
                  }`}>
                    {entry.source === "api" ? "API" : "Persistido"}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected ? (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold">Detalhes do evento</h3>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
              Fechar
            </Button>
          </div>

          {selected.source === "api" ? (
            <div className="space-y-3">
              <p className="text-sm">
                <span className="font-medium">Endpoint:</span>{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">{selected.item.method} {selected.item.endpoint}</code>
              </p>
              <p className="text-sm text-muted-foreground">
                {new Date(selected.item.timestamp).toLocaleString("pt-BR")} · {selected.item.durationMs} ms · status{" "}
                {selected.item.status ?? "erro de rede"}
              </p>
              {selected.item.errorCode ? (
                <p className="text-sm text-destructive">
                  {selected.item.errorCode}: {selected.item.errorMessage || "sem mensagem"}
                </p>
              ) : null}
              {selected.item.requestBody ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Request enviado</p>
                  <pre className="code-block max-h-64 overflow-auto">{selected.item.requestBody}</pre>
                </div>
              ) : null}
              {selected.item.responseBody ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Response recebido</p>
                  <pre className="code-block max-h-64 overflow-auto">{selected.item.responseBody}</pre>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm">
                <span className="font-medium">Arquivo:</span> {selected.item.file_name || "payload"}
              </p>
              <p className="text-sm text-muted-foreground">
                {new Date(selected.item.created_at).toLocaleString("pt-BR")} · {selected.item.payload_size_bytes.toLocaleString("pt-BR")} bytes
              </p>
              <p className="text-xs text-muted-foreground">
                sha256: <code>{selected.item.payload_sha256}</code>
              </p>
              <p className="text-xs text-muted-foreground">
                content-type: {selected.item.content_type || "n/a"} · modo: {selected.item.intake_mode}
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
                        title: "Falha ao baixar payload bruto",
                        description: "Não foi possível baixar este arquivo.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Baixar bruto
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  <Link to="/app/parceiro">
                    Portal Parceiro <ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Metadata de processamento</p>
                <pre className="code-block max-h-72 overflow-auto">{prettyJson(selected.item.metadata)}</pre>
              </div>
            </div>
          )}
        </Card>
      ) : null}
    </div>
  );
}
