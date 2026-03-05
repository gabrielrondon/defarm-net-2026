import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getCircuits } from "@/lib/api/circuits";
import {
  downloadRawPayload,
  listRawPayloads,
  partnerIntake,
  type PartnerIntakeResponse,
  type RawPayloadSummary,
} from "@/lib/api/partner-routing";
import type { Circuit } from "@/lib/api/types";
import { Download, FileUp, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ApiError } from "@/lib/api/client";

export function PartnerIntake() {
  const { toast } = useToast();
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [sourceCircuitId, setSourceCircuitId] = useState("");
  const [autoCreate, setAutoCreate] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<RawPayloadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [circuitsData, rawData] = await Promise.all([
        getCircuits(),
        listRawPayloads(40),
      ]);
      setCircuits(circuitsData);
      setHistory(rawData.rows);
      if (!sourceCircuitId && circuitsData[0]) {
        const staging = circuitsData.find(
          (c) => c?.metadata?.partner_staging === true || c?.metadata?.partner_staging === "true"
        );
        setSourceCircuitId(staging?.id || circuitsData[0].id);
      }
    } catch {
      toast({ title: "Erro ao carregar", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, sourceCircuitId]);

  useEffect(() => { load(); }, [load]);

  const onSubmit = async () => {
    if (!file) return;
    setSending(true);
    try {
      await partnerIntake(file, sourceCircuitId, autoCreate);
      toast({ title: "Arquivo processado" });
      setFile(null);
      await load();
    } catch (err) {
      const msg = err instanceof ApiError
        ? `${err.message} (${err.status})`
        : err instanceof Error ? err.message : "Erro na ingestão.";
      toast({ title: "Falha", description: msg, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filteredHistory = history.filter((row) =>
    statusFilter === "all" || row.status === statusFilter
  );

  const completedCount = history.filter((h) => h.status === "completed").length;
  const failedCount = history.filter((h) => h.status === "failed").length;

  return (
    <div className="space-y-6">
      {/* Upload */}
      <div className="rounded-xl bg-muted/40 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Select value={sourceCircuitId} onValueChange={setSourceCircuitId}>
            <SelectTrigger><SelectValue placeholder="Circuito" /></SelectTrigger>
            <SelectContent>
              {circuits.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <label className="border rounded-lg px-3 py-2 text-sm flex items-center gap-2 cursor-pointer bg-background">
            <FileUp className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate text-muted-foreground">{file?.name || "Selecionar arquivo"}</span>
            <input
              type="file"
              className="hidden"
              accept=".csv,.json,text/csv,application/json"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>

          <Button onClick={onSubmit} disabled={!file || sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Processar"}
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={autoCreate} onCheckedChange={setAutoCreate} id="auto-create" />
          <Label htmlFor="auto-create" className="text-sm">Criar circuito automaticamente</Label>
        </div>
      </div>

      {/* Stats + History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Histórico · {history.length}
          </p>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="completed">Sucesso</SelectItem>
              <SelectItem value="failed">Falha</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-xl bg-muted/40 px-3 py-2">
            <p className="text-[11px] uppercase text-muted-foreground">Enviados</p>
            <p className="text-lg font-semibold text-foreground">{history.length}</p>
          </div>
          <div className="rounded-xl bg-muted/40 px-3 py-2">
            <p className="text-[11px] uppercase text-muted-foreground">Sucesso</p>
            <p className="text-lg font-semibold text-primary">{completedCount}</p>
          </div>
          <div className="rounded-xl bg-muted/40 px-3 py-2">
            <p className="text-[11px] uppercase text-muted-foreground">Falha</p>
            <p className="text-lg font-semibold text-destructive">{failedCount}</p>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <EmptyState icon={FileUp} title="Nenhum payload" description="Envie um arquivo acima." />
        ) : (
          <div className="divide-y divide-border rounded-xl border">
            {filteredHistory.slice(0, 20).map((row) => (
              <div key={row.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{row.file_name || "payload"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(row.created_at).toLocaleString("pt-BR")} · {(row.payload_size_bytes / 1024).toFixed(0)}KB
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                    row.status === "completed" ? "bg-primary/10 text-primary"
                      : row.status === "failed" ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground"
                  }`}>
                    {row.status}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={async () => {
                      try {
                        const { blob, fileName } = await downloadRawPayload(row.id, {
                          suggestedFileName: row.file_name,
                          contentType: row.content_type,
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = fileName;
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch {
                        toast({ title: "Falha ao baixar", variant: "destructive" });
                      }
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
