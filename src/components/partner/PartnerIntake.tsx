import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getCircuits } from "@/lib/api/circuits";
import { listRawPayloads, partnerIntake, type RawPayloadSummary } from "@/lib/api/partner-routing";
import type { Circuit } from "@/lib/api/types";
import { FileUp, Loader2 } from "lucide-react";

export function PartnerIntake() {
  const { toast } = useToast();
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [sourceCircuitId, setSourceCircuitId] = useState("");
  const [autoCreate, setAutoCreate] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<RawPayloadSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const circuitNameMap = useMemo(() => new Map(circuits.map((c) => [c.id, c.name])), [circuits]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [circuitsData, rawData] = await Promise.all([getCircuits(), listRawPayloads(40)]);
      setCircuits(circuitsData);
      setHistory(rawData.rows);
      if (!sourceCircuitId && circuitsData[0]) setSourceCircuitId(circuitsData[0].id);
    } catch {
      toast({
        title: "Erro ao carregar ingestões",
        description: "Não foi possível carregar histórico do intake.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, sourceCircuitId]);

  useEffect(() => {
    load();
  }, [load]);

  const onSubmit = async () => {
    if (!file || !sourceCircuitId) return;
    setSending(true);
    try {
      const result = await partnerIntake(file, sourceCircuitId, autoCreate);
      toast({
        title: "Intake processado",
        description: `Status: ${result.status}. Lotes roteados: ${result.routed_batches.length}.`,
      });
      setFile(null);
      await load();
    } catch {
      toast({
        title: "Falha no intake",
        description: "Não foi possível processar este arquivo.",
        variant: "destructive",
      });
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

  return (
    <div className="space-y-6">
      <Card className="p-5 space-y-4">
        <h3 className="text-base font-semibold">Ingestão Inteligente (staging)</h3>
        <p className="text-sm text-muted-foreground">
          Envie CSV/JSON uma única vez. A DeFarm persiste payload bruto, resolve cliente por identificador e roteia para os circuitos corretos.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select value={sourceCircuitId} onValueChange={setSourceCircuitId}>
            <SelectTrigger><SelectValue placeholder="Circuito de staging" /></SelectTrigger>
            <SelectContent>
              {circuits.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <label className="border rounded-md px-3 py-2 text-sm flex items-center gap-2 cursor-pointer">
            <FileUp className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{file?.name || "Selecionar arquivo"}</span>
            <input
              type="file"
              className="hidden"
              accept=".csv,.json,text/csv,application/json"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>

          <Button onClick={onSubmit} disabled={!file || !sourceCircuitId || sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Processar intake"}
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={autoCreate} onCheckedChange={setAutoCreate} id="auto-create" />
          <Label htmlFor="auto-create">Criar circuito automaticamente quando identificador não existir</Label>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="text-base font-semibold">Histórico de Payload Bruto</h3>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum payload registrado.</p>
        ) : (
          <div className="space-y-2">
            {history.map((row) => (
              <div key={row.id} className="rounded-lg border p-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{row.file_name || "payload"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(row.created_at).toLocaleString("pt-BR")} · {row.payload_size_bytes.toLocaleString("pt-BR")} bytes · sha256 {row.payload_sha256.slice(0, 12)}...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      staging: {row.source_circuit_id ? (circuitNameMap.get(row.source_circuit_id) || row.source_circuit_id) : "n/a"}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border ${
                    row.status === "completed"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : row.status === "partial"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : row.status === "failed"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-muted text-muted-foreground border-border"
                  }`}>
                    {row.status}
                  </span>
                </div>
                {row.error_message ? (
                  <p className="text-xs text-red-600 mt-2">{row.error_message}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
