import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listAdminJobs,
  getAdminJobsSummary,
  retryAdminJob,
  type AdapterJob,
  type JobsSummary,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Layers,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Loader2,
  Activity,
  Eye,
  RotateCcw,
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendente" },
  { value: "processing", label: "Processando" },
  { value: "completed", label: "Completo" },
  { value: "failed", label: "Falhou" },
  { value: "retrying", label: "Retentando" },
];

const STATUS_BADGE: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  pending: { variant: "secondary", icon: Clock },
  processing: { variant: "default", icon: Loader2 },
  completed: { variant: "outline", icon: CheckCircle },
  failed: { variant: "destructive", icon: XCircle },
  retrying: { variant: "secondary", icon: RefreshCw },
};

export default function AdminJobs() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedJob, setSelectedJob] = useState<AdapterJob | null>(null);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["admin-jobs-summary"],
    queryFn: getAdminJobsSummary,
  });

  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ["admin-jobs", statusFilter],
    queryFn: () =>
      listAdminJobs({
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: 50,
        offset: 0,
      }),
  });

  const retryMutation = useMutation({
    mutationFn: retryAdminJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["admin-jobs-summary"] });
      toast({ title: "Job reenfileirado com sucesso" });
    },
    onError: (err: any) =>
      toast({ title: "Erro ao reprocessar", description: err.message, variant: "destructive" }),
  });

  const jobs = jobsData?.jobs ?? (Array.isArray(jobsData) ? jobsData as AdapterJob[] : []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Fila de Jobs</h1>
        <Badge variant="outline" className="text-xs">Admin Only</Badge>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {summaryLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-12 w-full" /></CardContent></Card>
          ))
        ) : summary ? (
          <>
            <SummaryCard icon={Layers} label="Total" value={summary.total} />
            <SummaryCard icon={Clock} label="Pendentes" value={summary.pending} color="text-yellow-500" />
            <SummaryCard icon={Activity} label="Processando" value={summary.processing} color="text-blue-500" />
            <SummaryCard icon={CheckCircle} label="Completos" value={summary.completed} color="text-green-500" />
            <SummaryCard icon={XCircle} label="Falharam" value={summary.failed} color="text-destructive" />
          </>
        ) : null}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Filtrar status:</span>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
            queryClient.invalidateQueries({ queryKey: ["admin-jobs-summary"] });
          }}
        >
          <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
        </Button>
      </div>

      {/* Jobs table */}
      <Card>
        <CardContent className="p-0">
          {jobsLoading ? (
            <div className="p-6"><Skeleton className="h-40 w-full" /></div>
          ) : jobs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum job encontrado{statusFilter !== "all" ? ` com status "${statusFilter}"` : ""}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">ID</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Adapter</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Item</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tentativas</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Criado</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => {
                    const badge = STATUS_BADGE[job.status] || STATUS_BADGE.pending;
                    const BadgeIcon = badge.icon;
                    return (
                      <tr key={job.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {job.id.slice(0, 8)}…
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs uppercase">{job.adapter_type}</Badge>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {job.item_id?.slice(0, 8)}…
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={badge.variant} className="gap-1 text-xs">
                            <BadgeIcon className={`h-3 w-3 ${job.status === "processing" ? "animate-spin" : ""}`} />
                            {job.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">{job.attempts}/{job.max_attempts}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(job.created_at).toLocaleString("pt-BR")}
                        </td>
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
                            {(job.status === "failed" || job.status === "retrying") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-primary"
                                onClick={() => retryMutation.mutate(job.id)}
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

      {/* Detail dialog */}
      <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhe do Job</DialogTitle>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-3 text-sm">
              <Row label="ID" value={selectedJob.id} mono />
              <Row label="Adapter" value={selectedJob.adapter_type.toUpperCase()} />
              <Row label="Item ID" value={selectedJob.item_id} mono />
              <Row label="Circuit ID" value={selectedJob.circuit_id} mono />
              <Row label="Status" value={selectedJob.status} />
              <Row label="Tentativas" value={`${selectedJob.attempts}/${selectedJob.max_attempts}`} />
              <Row label="Criado" value={new Date(selectedJob.created_at).toLocaleString("pt-BR")} />
              <Row label="Atualizado" value={new Date(selectedJob.updated_at).toLocaleString("pt-BR")} />
              {selectedJob.completed_at && (
                <Row label="Concluído" value={new Date(selectedJob.completed_at).toLocaleString("pt-BR")} />
              )}
              {selectedJob.error_message && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Erro</p>
                  <pre className="bg-destructive/10 text-destructive rounded p-3 text-xs whitespace-pre-wrap break-all">
                    {selectedJob.error_message}
                  </pre>
                </div>
              )}
              {(selectedJob.status === "failed" || selectedJob.status === "retrying") && (
                <Button
                  className="w-full mt-2"
                  onClick={() => {
                    retryMutation.mutate(selectedJob.id);
                    setSelectedJob(null);
                  }}
                  disabled={retryMutation.isPending}
                >
                  <RotateCcw className="h-4 w-4 mr-2" /> Reprocessar Job
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: typeof Layers; label: string; value: number; color?: string }) {
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

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`text-foreground text-right break-all ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
