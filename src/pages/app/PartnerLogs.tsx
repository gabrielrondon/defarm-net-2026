import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clipboard,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { downloadRawPayload, listRawPayloads, type RawPayloadSummary } from "@/lib/api/partner-routing";

type ResponseSnapshot = {
  summary?: {
    status?: string;
    total_rows?: number;
    processed_rows?: number;
    unresolved_rows?: number;
    items?: number;
    items_created?: number;
    items_enriched?: number;
    routes?: number;
    impacted_circuits?: number;
    partner_reference?: unknown;
  };
  items_count?: number;
  items_preview?: Array<{
    dfid?: string;
    url?: string;
    public_url?: string;
    resolution_result?: string;
    matched_existing_item?: boolean;
    partner_reference?: string | null;
  }>;
  errors?: Array<{ reason_code?: string; message?: string; partner_reference?: string | null }>;
};

function asResponseSnapshot(metadata: Record<string, unknown> | undefined): ResponseSnapshot | null {
  const snapshot = metadata?.response_snapshot;
  return snapshot && typeof snapshot === "object" ? (snapshot as ResponseSnapshot) : null;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    received: "Recebido",
    processing: "Processando",
    completed: "Concluido",
    partial: "Parcial",
    failed: "Falhou",
  };
  return labels[status] || status;
}

function statusClass(status: string): string {
  if (status === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "failed") return "bg-red-50 text-red-700 border-red-200";
  if (status === "partial") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-muted text-muted-foreground border-border";
}

function shortHash(hash: string): string {
  return hash.length > 16 ? `${hash.slice(0, 16)}...` : hash;
}

function formatDate(value?: string | null): string {
  return value ? new Date(value).toLocaleString("pt-BR") : "n/a";
}

function formatDateInTimeZone(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function receiptTimestampLines(label: string, value?: string | null): string[] {
  if (!value) {
    return [`${label}: n/a`];
  }
  return [
    `${label} (Brasília): ${formatDateInTimeZone(value, "America/Sao_Paulo")} BRT (UTC-03:00)`,
    `${label} (UTC): ${formatDateInTimeZone(value, "UTC")} UTC`,
  ];
}

function downloadTextFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function receiptShareUrl(row: RawPayloadSummary): string {
  return `${window.location.origin}/r/payload/${encodeURIComponent(row.id)}?sha256=${encodeURIComponent(row.payload_sha256)}`;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function buildReceipt(row: RawPayloadSummary): string {
  const snapshot = asResponseSnapshot(row.metadata);
  const summary = snapshot?.summary;
  const items = snapshot?.items_preview || [];
  const errors = snapshot?.errors || [];
  const lines = [
    "Recibo de envio DeFarm",
    "",
    `Payload: ${row.id}`,
    `Arquivo: ${row.file_name || "payload"}`,
    `Status: ${statusLabel(row.status)}`,
    ...receiptTimestampLines("Recebido em", row.created_at),
    ...receiptTimestampLines("Processado em", row.processed_at),
    `Tamanho: ${row.payload_size_bytes.toLocaleString("pt-BR")} bytes`,
    `SHA256: ${row.payload_sha256}`,
    "",
    "Resultado",
    `Linhas totais: ${summary?.total_rows ?? "n/a"}`,
    `Linhas processadas: ${summary?.processed_rows ?? "n/a"}`,
    `Itens retornados: ${snapshot?.items_count ?? summary?.items ?? items.length}`,
    `Itens criados: ${summary?.items_created ?? "n/a"}`,
    `Itens enriquecidos: ${summary?.items_enriched ?? "n/a"}`,
    `Rotas: ${summary?.routes ?? "n/a"}`,
    `Erros: ${errors.length}`,
  ];

  if (items.length > 0) {
    lines.push("", "Links retornados");
    for (const item of items) {
      lines.push(`- ${item.dfid || "DFID n/a"} · ${item.resolution_result || "resultado n/a"} · ${item.url || item.public_url || "sem URL"}`);
    }
  }

  if (errors.length > 0) {
    lines.push("", "Erros");
    for (const err of errors) {
      lines.push(`- ${err.reason_code || "erro"}: ${err.message || "sem mensagem"}`);
    }
  }

  lines.push("", "Observacao: este recibo confirma o recebimento e processamento tecnico do envio. Ele nao inclui identificadores sensiveis do payload bruto.");
  return lines.join("\n");
}

function prettyJson(value: unknown): string {
  if (value == null) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function PartnerLogs() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const payloadsQuery = useQuery({
    queryKey: ["partner-payload-center"],
    queryFn: () => listRawPayloads(150),
    refetchInterval: 15000,
  });

  const rows = useMemo(() => payloadsQuery.data?.rows || [], [payloadsQuery.data?.rows]);
  const selected = useMemo(
    () => rows.find((row) => row.id === selectedId) || rows[0] || null,
    [rows, selectedId]
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (!q) return true;
      const snapshot = asResponseSnapshot(row.metadata);
      const itemText = (snapshot?.items_preview || [])
        .map((item) => `${item.dfid || ""} ${item.partner_reference || ""} ${item.resolution_result || ""}`)
        .join(" ");
      return (
        (row.file_name || "").toLowerCase().includes(q) ||
        row.payload_sha256.toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q) ||
        itemText.toLowerCase().includes(q) ||
        (row.error_message || "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, status]);

  const stats = useMemo(() => {
    let completed = 0;
    let failed = 0;
    let items = 0;
    let errors = 0;
    for (const row of rows) {
      if (row.status === "completed") completed += 1;
      if (row.status === "failed") failed += 1;
      const snapshot = asResponseSnapshot(row.metadata);
      items += Number(snapshot?.items_count ?? snapshot?.summary?.items ?? snapshot?.items_preview?.length ?? 0);
      errors += snapshot?.errors?.length ?? (row.error_message ? 1 : 0);
    }
    return { total: rows.length, completed, failed, items, errors };
  }, [rows]);

  const handleDownloadRaw = useCallback(async (row: RawPayloadSummary) => {
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
    } catch (error: unknown) {
      toast({
        title: "Nao foi possivel baixar o payload",
        description: errorMessage(error, "Tente novamente em alguns instantes."),
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleCopyReceipt = useCallback(async (row: RawPayloadSummary) => {
    try {
      await navigator.clipboard.writeText(buildReceipt(row));
      toast({
        title: "Recibo copiado",
        description: "Voce pode enviar este recibo ao seu cliente ou suporte DeFarm.",
      });
    } catch (error: unknown) {
      toast({
        title: "Nao foi possivel copiar o recibo",
        description: errorMessage(error, "Baixe o recibo em arquivo texto."),
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleCopyReceiptLink = useCallback(async (row: RawPayloadSummary) => {
    try {
      await navigator.clipboard.writeText(receiptShareUrl(row));
      toast({
        title: "Link do recibo copiado",
        description: "Este link abre um recibo verificavel sem mostrar o payload bruto.",
      });
    } catch (error: unknown) {
      toast({
        title: "Nao foi possivel copiar o link",
        description: errorMessage(error, "Abra o recibo e copie a URL pelo navegador."),
        variant: "destructive",
      });
    }
  }, [toast]);

  if (payloadsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedSnapshot = selected ? asResponseSnapshot(selected.metadata) : null;
  const selectedSummary = selectedSnapshot?.summary;
  const selectedItems = selectedSnapshot?.items_preview || [];
  const selectedErrors = selectedSnapshot?.errors || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="section-label mb-1">Portal parceiro</p>
          <h1 className="text-foreground">Central de Envios</h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-3xl">
            Confira cada payload recebido pela DeFarm, a resposta devolvida pela API, os DFIDs gerados ou enriquecidos e o recibo tecnico do processamento.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => payloadsQuery.refetch()} disabled={payloadsQuery.isFetching}>
            {payloadsQuery.isFetching ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Atualizar
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/app/parceiro/ingestao">
              <UploadCloud className="h-4 w-4 mr-1" />
              Enviar novo
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          ["Envios", stats.total],
          ["Concluidos", stats.completed],
          ["Falhas", stats.failed],
          ["Itens retornados", stats.items],
          ["Erros no corpo", stats.errors],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por arquivo, DFID, hash, status ou referencia"
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="completed">Concluidos</SelectItem>
              <SelectItem value="partial">Parciais</SelectItem>
              <SelectItem value="failed">Falhas</SelectItem>
              <SelectItem value="processing">Processando</SelectItem>
              <SelectItem value="received">Recebidos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(360px,520px)_1fr] gap-4">
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b">
            <p className="text-sm font-semibold">Envios da sua workspace</p>
            <p className="text-xs text-muted-foreground">{filteredRows.length} registro(s)</p>
          </div>
          <div className="max-h-[680px] overflow-y-auto p-3 space-y-2">
            {filteredRows.length === 0 ? (
              <div className="text-sm text-muted-foreground p-6 text-center">
                Nenhum envio encontrado para os filtros atuais.
              </div>
            ) : (
              filteredRows.map((row) => {
                const snapshot = asResponseSnapshot(row.metadata);
                const summary = snapshot?.summary;
                const itemCount = snapshot?.items_count ?? summary?.items ?? snapshot?.items_preview?.length ?? 0;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setSelectedId(row.id)}
                    className={`w-full text-left rounded-lg border p-3 transition-colors hover:bg-muted/30 ${
                      selected?.id === row.id ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{row.file_name || "payload"}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(row.created_at)}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {row.payload_size_bytes.toLocaleString("pt-BR")} bytes · sha256 {shortHash(row.payload_sha256)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {itemCount} item(ns) · {summary?.items_created ?? 0} criado(s) · {summary?.items_enriched ?? 0} enriquecido(s)
                        </p>
                      </div>
                      <span className={`text-[11px] px-2 py-1 rounded-full border shrink-0 ${statusClass(row.status)}`}>
                        {statusLabel(row.status)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        <Card className="p-4 min-h-[560px]">
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-2">
              <FileText className="h-8 w-8" />
              <p className="text-sm">Selecione um envio para ver o recibo e a resposta.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-foreground">{selected.file_name || "payload"}</h2>
                    <span className={`text-[11px] px-2 py-1 rounded-full border ${statusClass(selected.status)}`}>
                      {statusLabel(selected.status)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Payload {selected.id} · recebido em {formatDate(selected.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleCopyReceipt(selected)}>
                    <Clipboard className="h-4 w-4 mr-1" />
                    Copiar recibo
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleCopyReceiptLink(selected)}>
                    <Share2 className="h-4 w-4 mr-1" />
                    Compartilhar recibo
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={receiptShareUrl(selected)} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Abrir recibo
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadTextFile(buildReceipt(selected), `recibo-defarm-${selected.id}.txt`)}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Baixar recibo
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDownloadRaw(selected)}>
                    <Download className="h-4 w-4 mr-1" />
                    Payload bruto
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Processadas</p>
                  <p className="text-sm font-semibold">{selectedSummary?.processed_rows ?? "n/a"}/{selectedSummary?.total_rows ?? "n/a"}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Itens</p>
                  <p className="text-sm font-semibold">{selectedSnapshot?.items_count ?? selectedSummary?.items ?? selectedItems.length}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Rotas</p>
                  <p className="text-sm font-semibold">{selectedSummary?.routes ?? "n/a"}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Erros</p>
                  <p className="text-sm font-semibold">{selectedErrors.length}</p>
                </div>
              </div>

              {selectedItems.length > 0 ? (
                <section className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <p className="text-sm font-semibold">Links retornados pela API</p>
                  </div>
                  <div className="space-y-2">
                    {selectedItems.map((item, index) => (
                      <div key={`${item.dfid || "item"}-${index}`} className="rounded-lg border bg-muted/20 p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-medium break-all">{item.dfid || "DFID nao retornado"}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.resolution_result || "resultado n/a"}
                              {typeof item.matched_existing_item === "boolean"
                                ? item.matched_existing_item ? " · item existente" : " · item novo"
                                : ""}
                            </p>
                            {item.partner_reference ? (
                              <p className="text-xs text-muted-foreground">Referencia: {item.partner_reference}</p>
                            ) : null}
                          </div>
                          {(item.url || item.public_url) ? (
                            <Button variant="outline" size="sm" asChild>
                              <a href={item.url || item.public_url} target="_blank" rel="noreferrer">
                                Abrir link <ExternalLink className="h-3.5 w-3.5 ml-1" />
                              </a>
                            </Button>
                          ) : null}
                        </div>
                        {(item.url || item.public_url) ? (
                          <p className="text-xs font-mono break-all text-muted-foreground mt-2">{item.url || item.public_url}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {selectedErrors.length > 0 ? (
                <section className="space-y-2">
                  <p className="text-sm font-semibold text-red-700">Erros retornados</p>
                  {selectedErrors.map((error, index) => (
                    <div key={`${error.reason_code || "error"}-${index}`} className="rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="text-sm font-medium text-red-800">{error.reason_code || "erro"}</p>
                      <p className="text-xs text-red-700 mt-1">{error.message || "sem mensagem"}</p>
                    </div>
                  ))}
                </section>
              ) : null}

              <section className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <p className="text-sm font-semibold">Prova tecnica do envio</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">SHA256</p>
                    <p className="font-mono break-all">{selected.payload_sha256}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Processado em</p>
                    <p>{formatDate(selected.processed_at)}</p>
                  </div>
                </div>
              </section>

              <details className="rounded-lg border p-3" open>
                <summary className="text-xs text-muted-foreground cursor-pointer select-none">Resposta exata registrada</summary>
                <pre className="mt-2 max-h-80 overflow-auto text-[11px] leading-relaxed bg-muted/40 rounded p-2">
                  {prettyJson(selectedSnapshot || { note: "Sem response_snapshot neste envio." })}
                </pre>
              </details>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
