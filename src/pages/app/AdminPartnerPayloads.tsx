import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, ExternalLink, FileJson, FileSpreadsheet, Radio, RefreshCw, ScrollText, Webhook } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { listRawPayloads, downloadRawPayload, type RawPayloadSummary } from "@/lib/api/partner-routing";
import { listWorkspaces, reprocessIngestion, type AdminWorkspace } from "@/lib/api/admin-users";
import { Link } from "react-router-dom";

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsv(rows: RawPayloadSummary[], workspaceLabel: (id: string) => string): string {
  const headers = [
    "created_at",
    "workspace_id",
    "workspace_label",
    "payload_id",
    "file_name",
    "status",
    "intake_mode",
    "source_circuit_id",
    "content_type",
    "payload_size_bytes",
    "payload_sha256",
    "error_message",
    "processed_at",
  ];
  const lines: string[] = [headers.join(",")];
  for (const row of rows) {
    const cols = [
      row.created_at,
      row.workspace_id,
      workspaceLabel(row.workspace_id),
      row.id,
      row.file_name || "",
      row.status,
      row.intake_mode,
      row.source_circuit_id || "",
      row.content_type || "",
      String(row.payload_size_bytes),
      row.payload_sha256,
      row.error_message || "",
      row.processed_at || "",
    ].map((v) => csvEscape(v));
    lines.push(cols.join(","));
  }
  return lines.join("\n");
}

function downloadTextFile(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminPartnerPayloads() {
  const { toast } = useToast();
  const [workspaceId, setWorkspaceId] = useState<string>("all");
  const [limit, setLimit] = useState<number>(100);
  const [search, setSearch] = useState<string>("");
  const [status, setStatus] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [liveTail, setLiveTail] = useState(false);
  const [onlyNew, setOnlyNew] = useState(false);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const workspacesQuery = useQuery({
    queryKey: ["admin-workspaces-all"],
    queryFn: listWorkspaces,
  });

  const payloadsQuery = useQuery({
    queryKey: ["admin-partner-payloads", workspaceId, limit],
    queryFn: () => listRawPayloads(limit, workspaceId === "all" ? undefined : workspaceId),
  });

  const partnerWorkspaces = useMemo(
    () => (workspacesQuery.data || []).filter((w: AdminWorkspace) => w.workspace_type === "partner"),
    [workspacesQuery.data]
  );

  const [reprocessing, setReprocessing] = useState(false);
  const handleReprocess = async (rawPayloadId: string, dryRun: boolean) => {
    if (!dryRun && !window.confirm("Reprocessar este payload? O pipeline roda de novo e pode criar/enriquecer itens e eventos.")) {
      return;
    }
    setReprocessing(true);
    try {
      const r = await reprocessIngestion(rawPayloadId, dryRun);
      toast({
        title: dryRun ? "Simulação concluída (dry-run)" : "Reprocessamento concluído",
        description: `status: ${r.status} · itens: ${r.items_found} (enriquecidos ${r.items_enriched}) · eventos: ${r.events_created} (dup ignorados ${r.events_skipped_duplicate})`,
      });
      if (!dryRun) payloadsQuery.refetch();
    } catch (e: any) {
      toast({
        title: dryRun ? "Falha na simulação" : "Falha no reprocessamento",
        description: e?.message || "Não foi possível reprocessar o payload.",
        variant: "destructive",
      });
    } finally {
      setReprocessing(false);
    }
  };

  const rows = payloadsQuery.data?.rows || [];
  const filteredRows = rows.filter((row: RawPayloadSummary) => {
    if (status !== "all" && row.status !== status) return false;
    if (onlyNew && !newIds.has(row.id)) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (row.file_name || "").toLowerCase().includes(q) ||
      row.payload_sha256.toLowerCase().includes(q) ||
      row.workspace_id.toLowerCase().includes(q) ||
      (row.error_message || "").toLowerCase().includes(q)
    );
  });

  const workspaceLabel = (id: string) => {
    const ws = partnerWorkspaces.find((w) => w.id === id);
    return ws ? `${ws.name} (${ws.slug})` : id;
  };

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selected = pagedRows.find((r) => r.id === selectedId) || pagedRows[0] || null;
  const listStart = filteredRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const listEnd = Math.min(filteredRows.length, currentPage * pageSize);
  const totalBytes = filteredRows.reduce((sum, row) => sum + row.payload_size_bytes, 0);
  const completedCount = filteredRows.filter((row) => row.status === "completed").length;
  const failedCount = filteredRows.filter((row) => row.status === "failed").length;
  const partialCount = filteredRows.filter((row) => row.status === "partial").length;

  useEffect(() => {
    if (!liveTail) return;
    const id = window.setInterval(() => {
      payloadsQuery.refetch();
    }, 3500);
    return () => window.clearInterval(id);
  }, [liveTail, payloadsQuery]);

  useEffect(() => {
    const ids = rows.map((r) => r.id);
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
  }, [rows]);

  useEffect(() => {
    setPage(1);
  }, [workspaceId, limit, search, status, onlyNew, pageSize]);

  useEffect(() => {
    if (!selectedId && selected) {
      setSelectedId(selected.id);
      return;
    }
    if (selectedId && !pagedRows.some((row) => row.id === selectedId)) {
      setSelectedId(selected?.id ?? null);
    }
  }, [selectedId, pagedRows, selected]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payloads Brutos de Parceiros</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const payload = {
                exported_at: new Date().toISOString(),
                count: filteredRows.length,
                rows: filteredRows,
              };
              downloadTextFile(
                JSON.stringify(payload, null, 2),
                `partner-ingestions-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`,
                "application/json;charset=utf-8"
              );
            }}
            disabled={filteredRows.length === 0}
          >
            <FileJson className="h-4 w-4 mr-1" />
            Export JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const csv = toCsv(filteredRows, workspaceLabel);
              downloadTextFile(
                csv,
                `partner-ingestions-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`,
                "text/csv;charset=utf-8"
              );
            }}
            disabled={filteredRows.length === 0}
          >
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timeline Global Multi-Workspace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Select value={workspaceId} onValueChange={setWorkspaceId}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar workspace parceiro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os workspaces parceiros</SelectItem>
                {partnerWorkspaces.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id}>
                    {ws.name} ({ws.slug})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50 registros</SelectItem>
                <SelectItem value="100">100 registros</SelectItem>
                <SelectItem value="200">200 registros</SelectItem>
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="partial">Parcial</SelectItem>
                <SelectItem value="failed">Falha</SelectItem>
                <SelectItem value="processing">Processando</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Buscar por arquivo/hash/workspace/erro"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="md:col-span-1"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => payloadsQuery.refetch()}
              disabled={payloadsQuery.isFetching}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${payloadsQuery.isFetching ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button
              variant={liveTail ? "default" : "outline"}
              size="sm"
              onClick={() => setLiveTail((v) => !v)}
            >
              <Radio className="h-4 w-4 mr-1" />
              {liveTail ? "Live Tail ativo" : "Live Tail"}
            </Button>
            <Button
              variant={onlyNew ? "default" : "outline"}
              size="sm"
              onClick={() => setOnlyNew((v) => !v)}
            >
              Somente novos
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={newIds.size === 0}
              onClick={() => setNewIds(new Set())}
            >
              Marcar {newIds.size} nova(s)
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/app/webhooks">
                <Webhook className="h-4 w-4 mr-1" />
                Escutar Webhooks
              </Link>
            </Button>
            <span className="text-xs text-muted-foreground">
              {payloadsQuery.isLoading ? "Carregando..." : `${filteredRows.length} registro(s)`}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <p>
              Exibindo {listStart}-{listEnd} de {filteredRows.length}
            </p>
            <div className="flex items-center gap-2">
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10/página</SelectItem>
                  <SelectItem value="25">25/página</SelectItem>
                  <SelectItem value="50">50/página</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Próxima
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Registros filtrados</p>
              <p className="text-lg font-semibold">{filteredRows.length}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Concluídos</p>
              <p className="text-lg font-semibold text-primary">{completedCount}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Parcial/Falha</p>
              <p className="text-lg font-semibold">{partialCount + failedCount}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Volume total</p>
              <p className="text-lg font-semibold">{totalBytes.toLocaleString("pt-BR")} bytes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-muted-foreground" />
              Timeline de Envios e Tentativas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[720px] overflow-auto">
            {pagedRows.map((row) => (
              <button
                key={row.id}
                type="button"
                className={`w-full text-left rounded-lg border p-3 hover:bg-muted/20 transition-colors ${
                  selected?.id === row.id
                    ? "ring-2 ring-primary/30 border-primary/40"
                    : newIds.has(row.id)
                      ? "border-primary/40 bg-primary/5"
                      : ""
                }`}
                onClick={() => setSelectedId(row.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{row.file_name || "payload"}</p>
                  <div className="flex items-center gap-2">
                    {newIds.has(row.id) ? (
                      <span className="text-[11px] px-2 py-1 rounded-full border bg-primary/10 text-primary border-primary/20">
                        novo
                      </span>
                    ) : null}
                    <span className={`text-[11px] px-2 py-1 rounded-full border ${
                      row.status === "completed"
                        ? "bg-primary/10 text-primary border-primary/20"
                        : row.status === "failed"
                          ? "bg-destructive/10 text-destructive border-destructive/20"
                          : "bg-muted text-muted-foreground border-border"
                    }`}>
                      {row.status}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(row.created_at).toLocaleString("pt-BR")} · {workspaceLabel(row.workspace_id)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {row.payload_size_bytes.toLocaleString("pt-BR")} bytes · sha256 {row.payload_sha256.slice(0, 16)}...
                </p>
                {row.error_message ? (
                  <p className="text-xs text-destructive mt-1">{row.error_message}</p>
                ) : null}
              </button>
            ))}
            {!payloadsQuery.isLoading && pagedRows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Nenhum payload encontrado para os filtros atuais.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalhes do Evento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selected ? (
              <p className="text-sm text-muted-foreground">Selecione um evento na timeline para abrir detalhes.</p>
            ) : (
              <>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Workspace</p>
                  <p className="text-sm">{workspaceLabel(selected.workspace_id)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Arquivo</p>
                  <p className="text-sm">{selected.file_name || "payload"}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Criado em</p>
                    <p className="text-sm">{new Date(selected.created_at).toLocaleString("pt-BR")}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Processado em</p>
                    <p className="text-sm">{selected.processed_at ? new Date(selected.processed_at).toLocaleString("pt-BR") : "n/a"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="text-sm">{selected.status}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Tamanho</p>
                    <p className="text-sm">{selected.payload_size_bytes.toLocaleString("pt-BR")} bytes</p>
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">SHA256</p>
                  <p className="text-xs font-mono break-all">{selected.payload_sha256}</p>
                </div>
                {selected.error_message ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <p className="text-xs text-muted-foreground">Erro retornado</p>
                    <p className="text-sm text-destructive">{selected.error_message}</p>
                  </div>
                ) : null}
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground mb-2">Resposta snapshot (quando disponível)</p>
                  <pre className="max-h-64 overflow-auto text-[11px] leading-relaxed bg-muted/40 rounded p-2">
                    {JSON.stringify((selected.metadata as any)?.response_snapshot || {
                      note: "Sem response_snapshot neste registro (payload antigo ou anterior ao patch).",
                    }, null, 2)}
                  </pre>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground mb-2">Metadata operacional</p>
                  <pre className="max-h-64 overflow-auto text-[11px] leading-relaxed bg-muted/40 rounded p-2">
                    {JSON.stringify(selected.metadata, null, 2)}
                  </pre>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const { blob, fileName } = await downloadRawPayload(selected.id, {
                          suggestedFileName: selected.file_name,
                          contentType: selected.content_type,
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = fileName;
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch (e: any) {
                        toast({
                          title: "Falha ao baixar payload",
                          description: e?.message || "Não foi possível baixar o payload bruto.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Baixar payload bruto
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={reprocessing}
                    onClick={() => handleReprocess(selected.id, true)}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Simular (dry-run)
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    disabled={reprocessing}
                    onClick={() => handleReprocess(selected.id, false)}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Reprocessar
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <a
                      href={`https://defarm.net/app/admin/payloads-parceiros`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir em nova aba <ExternalLink className="h-3.5 w-3.5 ml-1" />
                    </a>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
