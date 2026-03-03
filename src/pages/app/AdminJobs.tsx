import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminIngestionsSummary,
  getAdminJobsSummary,
  getAdminPipelineStatus,
  getAdminQueueStatus,
  getAdminTokenizationHealth,
  listAdminJobs,
  retryAdminJob,
  retryAdminJobsBatch,
  type AdapterJob,
  type AdapterJobStatus,
} from "@/lib/api/admin-jobs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Layers,
  Loader2,
  RefreshCw,
  RotateCcw,
  XCircle,
} from "lucide-react";

const STATUS_OPTIONS: { value: "all" | AdapterJobStatus; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendente" },
  { value: "scheduled", label: "Agendado" },
  { value: "processing", label: "Processando" },
  { value: "completed", label: "Completo" },
  { value: "failed", label: "Falhou" },
  { value: "retrying", label: "Retentando" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "Todas prioridades" },
  { value: "1", label: "P1 • Produção parceiro" },
  { value: "2", label: "P2 • Retry admin" },
  { value: "3", label: "P3 • Tráfego teste" },
  { value: "4", label: "P4 • Backfill/lote" },
];

const BATCH_PRIORITY_OPTIONS = [
  { value: "2", label: "P2 • Retry admin (recomendado)" },
  { value: "1", label: "P1 • Produção (urgente)" },
  { value: "3", label: "P3 • Teste" },
  { value: "4", label: "P4 • Backfill/lote" },
];

const STATUS_BADGE: Record<
  string,
  { variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }
> = {
  pending: { variant: "secondary", icon: Clock },
  scheduled: { variant: "secondary", icon: Clock },
  processing: { variant: "default", icon: Loader2 },
  completed: { variant: "outline", icon: CheckCircle },
  failed: { variant: "destructive", icon: XCircle },
  retrying: { variant: "secondary", icon: RefreshCw },
};

export default function AdminJobs() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<"all" | AdapterJobStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [adapterFilter, setAdapterFilter] = useState("");
  const [qualityFilter, setQualityFilter] = useState("all");
  const [selectedJob, setSelectedJob] = useState<AdapterJob | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const [batchStatus, setBatchStatus] = useState("failed");
  const [batchAdapter, setBatchAdapter] = useState("");
  const [batchPriority, setBatchPriority] = useState("2");
  const [batchLimit, setBatchLimit] = useState("200");

  const jobsQuery = useQuery({
    queryKey: [
      "admin-jobs",
      statusFilter,
      priorityFilter,
      adapterFilter,
      qualityFilter,
      page,
      pageSize,
    ],
    queryFn: () =>
      listAdminJobs({
        status: statusFilter === "all" ? undefined : statusFilter,
        priority: priorityFilter === "all" ? undefined : Number(priorityFilter),
        adapter: adapterFilter.trim() || undefined,
        has_errors:
          qualityFilter === "has_errors"
            ? true
            : qualityFilter === "clean"
              ? false
              : undefined,
        missing_stellar: qualityFilter === "missing_stellar" ? true : undefined,
        missing_ipfs: qualityFilter === "missing_ipfs" ? true : undefined,
        limit: pageSize,
        offset: page * pageSize,
      }),
    refetchInterval: 10000,
  });

  const summaryQuery = useQuery({
    queryKey: ["admin-jobs-summary"],
    queryFn: getAdminJobsSummary,
    refetchInterval: 10000,
  });

  const queueQuery = useQuery({
    queryKey: ["admin-queues"],
    queryFn: getAdminQueueStatus,
    refetchInterval: 5000,
  });

  const tokenizationHealthQuery = useQuery({
    queryKey: ["admin-tokenization-health"],
    queryFn: getAdminTokenizationHealth,
    refetchInterval: 15000,
  });

  const pipelineStatusQuery = useQuery({
    queryKey: ["admin-pipeline-status"],
    queryFn: getAdminPipelineStatus,
    refetchInterval: 15000,
  });

  const ingestionsSummaryQuery = useQuery({
    queryKey: ["admin-ingestions-summary"],
    queryFn: getAdminIngestionsSummary,
    refetchInterval: 15000,
  });

  const retryMutation = useMutation({
    mutationFn: ({ jobId, force }: { jobId: string; force?: boolean }) =>
      retryAdminJob(jobId, !!force),
    onSuccess: () => {
      invalidateAll(queryClient);
      toast({ title: "Job reenfileirado com sucesso" });
    },
    onError: (err: any) =>
      toast({
        title: "Erro ao reprocessar job",
        description:
          err.name === "AbortError"
            ? "Timeout no retry de job (30s). Tente novamente."
            : err.message,
        variant: "destructive",
      }),
  });

  const retryBatchMutation = useMutation({
    mutationFn: retryAdminJobsBatch,
    onSuccess: (data) => {
      invalidateAll(queryClient);
      toast({
        title: "Lote reenfileirado",
        description: `${data.queued} job(s) -> ${data.queue}`,
      });
    },
    onError: (err: any) =>
      toast({
        title: "Erro no retry em lote",
        description:
          err.name === "AbortError"
            ? "Timeout no retry em lote (30s). Tente novamente com limite menor."
            : err.message,
        variant: "destructive",
      }),
  });

  const jobs = jobsQuery.data?.data ?? [];
  const hasNextPage = jobs.length === pageSize;
  const hasPreviousPage = page > 0;
  const activeQueueNames = useMemo(
    () => new Set(queueQuery.data?.active_queues ?? []),
    [queueQuery.data?.active_queues]
  );
  const summary = summaryQuery.data?.summary;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-foreground">Fila de Jobs (Adapters)</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Admin Only
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => invalidateAll(queryClient)}
            disabled={
              jobsQuery.isFetching ||
              summaryQuery.isFetching ||
              queueQuery.isFetching ||
              pipelineStatusQuery.isFetching ||
              ingestionsSummaryQuery.isFetching
            }
          >
            <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
          </Button>
        </div>
      </div>

      {queueQuery.data?.low_xlm_mode && (
        <Card className="border-yellow-400/60 bg-yellow-50/30">
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">
                  Modo de proteção por saldo XLM ativo
                </p>
                <p className="text-sm text-muted-foreground">
                  Filas P3/P4 pausadas. Somente P1/P2 estão sendo consumidas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <SummaryCard icon={Layers} label="Total" value={sumSummary(summary)} />
        <SummaryCard icon={CheckCircle} label="Completos limpos" value={summary?.completed_clean ?? 0} color="text-green-500" />
        <SummaryCard icon={AlertTriangle} label="Completos c/ erro" value={summary?.completed_with_errors ?? 0} color="text-amber-500" />
        <SummaryCard icon={Clock} label="Pendentes" value={summary?.pending ?? 0} color="text-yellow-500" />
        <SummaryCard icon={Loader2} label="Processando" value={summary?.processing ?? 0} color="text-blue-500" />
        <SummaryCard icon={XCircle} label="Falharam" value={summary?.failed ?? 0} color="text-destructive" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline (funnel)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pipelineStatusQuery.isLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : pipelineStatusQuery.isError ? (
            <p className="text-sm text-destructive">
              Não foi possível carregar /v1/adapter/admin/pipeline-status.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <KeyValue
                  label="Ingested"
                  value={String(pipelineStatusQuery.data?.pipeline.ingested.total ?? 0)}
                />
                <KeyValue
                  label="DFID"
                  value={String(pipelineStatusQuery.data?.pipeline.dfid_assigned.total ?? 0)}
                />
                <KeyValue
                  label="IPFS"
                  value={String(pipelineStatusQuery.data?.pipeline.ipfs_pinned.total ?? 0)}
                />
                <KeyValue
                  label="Stellar"
                  value={String(pipelineStatusQuery.data?.pipeline.stellar_anchored.total ?? 0)}
                />
                <KeyValue
                  label="Fully tokenized"
                  value={String(
                    pipelineStatusQuery.data?.pipeline.fully_tokenized.total ?? 0
                  )}
                />
                <KeyValue
                  label="Pending confirm."
                  value={String(
                    pipelineStatusQuery.data?.pipeline.stuck.pending_confirmation ?? 0
                  )}
                />
              </div>
              <div className="rounded border border-amber-400/40 bg-amber-50/40 p-3 text-xs text-amber-900">
                missing_stellar:{" "}
                <strong>
                  {pipelineStatusQuery.data?.pipeline.stuck.missing_stellar ?? 0}
                </strong>{" "}
                • pending_confirmation:{" "}
                <strong>
                  {pipelineStatusQuery.data?.pipeline.stuck.pending_confirmation ?? 0}
                </strong>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Top errors</p>
                {pipelineStatusQuery.data?.errors.top?.length ? (
                  <div className="space-y-1">
                    {pipelineStatusQuery.data.errors.top.slice(0, 5).map((row, idx) => (
                      <div
                        key={`${idx}-${row.error}`}
                        className="flex items-start justify-between gap-2 text-xs rounded border px-2 py-1"
                      >
                        <span className="text-muted-foreground break-all">{row.error}</span>
                        <Badge variant="outline">{row.count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Sem erros agregados.</p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ingestions (summary)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ingestionsSummaryQuery.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : ingestionsSummaryQuery.isError ? (
            <p className="text-sm text-destructive">
              Não foi possível carregar /v1/adapter/admin/ingestions/summary.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <KeyValue
                  label="Total ingestions"
                  value={String(ingestionsSummaryQuery.data?.total_ingestions ?? 0)}
                />
                <KeyValue
                  label="Rows processed"
                  value={String(ingestionsSummaryQuery.data?.total_rows_processed ?? 0)}
                />
                <KeyValue
                  label="Items created"
                  value={String(ingestionsSummaryQuery.data?.total_items_created ?? 0)}
                />
                <KeyValue
                  label="Items updated"
                  value={String(ingestionsSummaryQuery.data?.total_items_updated ?? 0)}
                />
                <KeyValue
                  label="Events created"
                  value={String(ingestionsSummaryQuery.data?.total_events_created ?? 0)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saúde de tokenização por cadeia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tokenizationHealthQuery.isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : tokenizationHealthQuery.isError ? (
            <p className="text-sm text-destructive">
              Não foi possível carregar /v1/adapter/admin/tokenization-health.
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Total de itens: {tokenizationHealthQuery.data?.total_items ?? 0}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.entries(tokenizationHealthQuery.data?.by_value_chain ?? {}).map(
                  ([chain, row]) => (
                    <div key={chain} className="rounded border p-3 text-xs space-y-1">
                      <p className="font-semibold text-sm">{chain}</p>
                      <p className="text-muted-foreground">
                        total: {row.total} • full: {row.fully_tokenized}
                      </p>
                      <p className="text-muted-foreground">
                        missing_stellar: {row.missing_stellar} • missing_ipfs: {row.missing_ipfs}
                      </p>
                    </div>
                  )
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    retryBatchMutation.mutate({
                      filter: { status: "completed", has_errors: true },
                      priority: 4,
                      limit: 500,
                    })
                  }
                  disabled={retryBatchMutation.isPending}
                >
                  Reenfileirar completos com erro (P4)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatusFilter("completed");
                    setQualityFilter("has_errors");
                    setPage(0);
                  }}
                >
                  Ver somente completos com erro
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Queues + XLM</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {queueQuery.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : queueQuery.isError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              Falha ao carregar filas/saldo XLM. Verifique o endpoint
              <span className="font-mono"> /v1/adapter/admin/queues</span> e permissões admin.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <QueuePill label="P1" value={queueQuery.data?.queue_depths.p1 ?? 0} active={activeQueueNames.has("adapter_jobs:p1")} />
                <QueuePill label="P2" value={queueQuery.data?.queue_depths.p2 ?? 0} active={activeQueueNames.has("adapter_jobs:p2")} />
                <QueuePill label="P3" value={queueQuery.data?.queue_depths.p3 ?? 0} active={activeQueueNames.has("adapter_jobs:p3")} />
                <QueuePill label="P4" value={queueQuery.data?.queue_depths.p4 ?? 0} active={activeQueueNames.has("adapter_jobs:p4")} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <KeyValue label="Total em fila" value={String(queueQuery.data?.queue_depths.total ?? 0)} />
                <KeyValue
                  label="Saldo XLM"
                  value={
                    queueQuery.data?.xlm_balance == null
                      ? "N/D"
                      : Number(queueQuery.data.xlm_balance).toFixed(6)
                  }
                />
                <KeyValue
                  label="Threshold"
                  value={String(queueQuery.data?.xlm_low_balance_threshold ?? 0)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Retry em lote</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={batchStatus} onValueChange={setBatchStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="failed">failed</SelectItem>
                <SelectItem value="scheduled">scheduled</SelectItem>
                <SelectItem value="pending">pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Adapter (opcional)</Label>
            <Input
              value={batchAdapter}
              onChange={(e) => setBatchAdapter(e.target.value)}
              placeholder="stellar_mainnet"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Prioridade destino</Label>
            <Select value={batchPriority} onValueChange={setBatchPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BATCH_PRIORITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Limite</Label>
            <Input
              value={batchLimit}
              onChange={(e) => setBatchLimit(e.target.value)}
              placeholder="200"
            />
          </div>
          <div className="flex items-end">
            <Button
              className="w-full"
              onClick={() =>
                retryBatchMutation.mutate({
                  filter: {
                    status: batchStatus || undefined,
                    adapter: batchAdapter.trim() || undefined,
                  },
                  priority: Number(batchPriority),
                  limit: Number(batchLimit) || 200,
                })
              }
              disabled={retryBatchMutation.isPending}
            >
              {retryBatchMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Reenfileirar lote
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros de Jobs</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as "all" | AdapterJobStatus);
                setPage(0);
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Prioridade</Label>
            <Select
              value={priorityFilter}
              onValueChange={(v) => {
                setPriorityFilter(v);
                setPage(0);
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Adapter</Label>
            <Input
              value={adapterFilter}
              onChange={(e) => {
                setAdapterFilter(e.target.value);
                setPage(0);
              }}
              placeholder="stellar_mainnet / ipfs_pinata"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Qualidade</Label>
            <Select
              value={qualityFilter}
              onValueChange={(v) => {
                setQualityFilter(v);
                setPage(0);
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="has_errors">Com erros no result</SelectItem>
                <SelectItem value="clean">Sem erros no result</SelectItem>
                <SelectItem value="missing_stellar">Sem âncora Stellar</SelectItem>
                <SelectItem value="missing_ipfs">Sem CID IPFS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Página {page + 1} • {jobs.length} job(s) carregados
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!hasPreviousPage || jobsQuery.isFetching}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasNextPage || jobsQuery.isFetching}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {jobsQuery.isLoading ? (
            <div className="p-6">
              <Skeleton className="h-40 w-full" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum job encontrado com os filtros atuais.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">ID</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Adapter(s)</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Priority</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Qualidade</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tentativas</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Criado</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => {
                    const status = job.status ?? "pending";
                    const badge = STATUS_BADGE[status] || STATUS_BADGE.pending;
                    const BadgeIcon = badge.icon;
                    const attempts = `${job.retry_count ?? 0}/${job.max_retries ?? 0}`;
                    const created = job.created_at
                      ? new Date(job.created_at).toLocaleString("pt-BR")
                      : "-";
                    const resultErrors = Array.isArray(job.result?.errors)
                      ? job.result?.errors.length
                      : 0;
                    const hasStellar =
                      Array.isArray(job.result?.blockchain_anchors) &&
                      job.result.blockchain_anchors.length > 0;
                    const hasIpfs =
                      Array.isArray(job.result?.storage_refs) &&
                      job.result.storage_refs.length > 0;
                    return (
                      <tr
                        key={job.id}
                        className="border-b border-border last:border-0 hover:bg-muted/20"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {shortUuid(job.id)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(job.adapters ?? []).map((adapter) => (
                              <Badge key={adapter} variant="outline" className="text-[10px] uppercase">
                                {adapter}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">P{job.priority ?? 3}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={badge.variant} className="gap-1 text-xs">
                            <BadgeIcon
                              className={`h-3 w-3 ${status === "processing" ? "animate-spin" : ""}`}
                            />
                            {status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {status === "completed" ? (
                            <Badge
                              variant={resultErrors > 0 ? "destructive" : "outline"}
                              className="text-[11px]"
                            >
                              {resultErrors > 0
                                ? `parcial (${resultErrors} erro${resultErrors > 1 ? "s" : ""})`
                                : hasStellar && hasIpfs
                                  ? "ok (stellar+ipfs)"
                                  : "incompleto"}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">{attempts}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{created}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setSelectedJob(job)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {(status === "failed" ||
                              status === "retrying" ||
                              status === "completed") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-primary"
                                onClick={() =>
                                  retryMutation.mutate({
                                    jobId: job.id,
                                    force: status === "completed",
                                  })
                                }
                                disabled={retryMutation.isPending}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Detalhe do Job</DialogTitle>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-3 text-sm">
              <Row label="ID" value={selectedJob.id} mono />
              <Row label="Adapter(s)" value={(selectedJob.adapters ?? []).join(", ") || "-"} />
              <Row label="Item ID" value={selectedJob.item_id} mono />
              <Row label="Circuit ID" value={selectedJob.circuit_id} mono />
              <Row label="Priority" value={`P${selectedJob.priority ?? 3}`} />
              <Row label="Status" value={selectedJob.status ?? "pending"} />
              <Row
                label="Tentativas"
                value={`${selectedJob.retry_count ?? 0}/${selectedJob.max_retries ?? 0}`}
              />
              <Row label="Criado" value={formatTs(selectedJob.created_at)} />
              <Row label="Atualizado" value={formatTs(selectedJob.updated_at)} />
              <Row label="Próximo retry" value={formatTs(selectedJob.next_retry_at)} />
              <Row label="Concluído" value={formatTs(selectedJob.completed_at)} />
              <Row
                label="Erros no result"
                value={String(Array.isArray(selectedJob.result?.errors) ? selectedJob.result.errors.length : 0)}
              />
              {selectedJob.error_message && (
                <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Erro</p>
                <pre className="bg-destructive/10 text-destructive rounded p-3 text-xs whitespace-pre-wrap break-all">
                  {selectedJob.error_message}
                </pre>
              </div>
            )}
            {selectedJob.status === "completed" && (
              <div className="rounded-md border border-green-500/30 bg-green-500/5 p-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">completed</span> =
                processamento finalizado; valide `result.errors`, anchors Stellar e CIDs IPFS para saber se foi full ou parcial.
              </div>
            )}
            {(selectedJob.status === "failed" || selectedJob.status === "completed") && (
              <Button
                className="w-full"
                onClick={() =>
                  retryMutation.mutate({
                    jobId: selectedJob.id,
                    force: selectedJob.status === "completed",
                  })
                }
                disabled={retryMutation.isPending}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reenfileirar {selectedJob.status === "completed" ? "(force=true)" : ""}
              </Button>
            )}
            {Array.isArray(selectedJob.result?.errors) && selectedJob.result.errors.length > 0 && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-xs font-medium text-destructive mb-1">Erros do result</p>
                <ul className="text-xs text-destructive list-disc ml-4 space-y-1">
                  {selectedJob.result.errors.slice(0, 8).map((err, idx) => (
                    <li key={`${idx}-${err}`}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </DialogContent>
      </Dialog>
    </div>
  );
}

function sumSummary(summary?: {
  pending: number;
  scheduled: number;
  processing: number;
  failed: number;
  completed: number;
}) {
  if (!summary) return 0;
  return summary.pending + summary.scheduled + summary.processing + summary.failed + summary.completed;
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
  queryClient.invalidateQueries({ queryKey: ["admin-jobs-summary"] });
  queryClient.invalidateQueries({ queryKey: ["admin-pipeline-status"] });
  queryClient.invalidateQueries({ queryKey: ["admin-ingestions-summary"] });
  queryClient.invalidateQueries({ queryKey: ["admin-tokenization-health"] });
  queryClient.invalidateQueries({ queryKey: ["admin-queues"] });
}

function shortUuid(value: string) {
  return value ? `${value.slice(0, 8)}…` : "-";
}

function formatTs(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Layers;
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${color || "text-muted-foreground"}`} />
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-xl font-bold ${color || "text-foreground"}`}>{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QueuePill({
  label,
  value,
  active,
}: {
  label: string;
  value: number;
  active: boolean;
}) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Badge variant={active ? "default" : "secondary"} className="text-[10px]">
          {active ? "ativa" : "pausada"}
        </Badge>
      </div>
      <p className="text-xl font-semibold mt-1">{value}</p>
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-1">{value}</p>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`text-foreground text-right break-all ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}
