import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Search,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Filter,
  Clock,
  Loader2,
  RefreshCw,
  Hash,
  User,
  FileText,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getAuditLogs, verifyHashChain } from "@/lib/defarm-api";
import { toast } from "@/hooks/use-toast";

const actionLabels: Record<string, string> = {
  create: "Criação",
  update: "Atualização",
  delete: "Exclusão",
  merge: "Mesclagem",
  split: "Divisão",
  transfer: "Transferência",
  archive: "Arquivamento",
  status_change: "Mudança de Status",
};

const resourceLabels: Record<string, string> = {
  item: "Item",
  circuit: "Circuito",
  member: "Membro",
  event: "Evento",
  webhook: "Webhook",
  snapshot: "Snapshot",
  merkle_tree: "Árvore Merkle",
};

const actionColors: Record<string, string> = {
  create: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  update: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  delete: "bg-red-500/10 text-red-600 border-red-500/20",
  merge: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  split: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  transfer: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  archive: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20",
  status_change: "bg-orange-500/10 text-orange-600 border-orange-500/20",
};

export default function AuditTrail() {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const { data: logs = [], isLoading, error, refetch } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => getAuditLogs({ limit: 100 }),
  });

  const verifyMutation = useMutation({
    mutationFn: () => verifyHashChain(100),
    onSuccess: (result) => {
      toast({
        title: result.valid ? "Cadeia íntegra ✓" : "Integridade comprometida!",
        description: `${result.logs_checked} registros verificados. ${result.message}`,
        variant: result.valid ? "default" : "destructive",
      });
    },
    onError: (err) => {
      toast({
        title: "Erro na verificação",
        description: err instanceof Error ? err.message : "Falha ao verificar a cadeia de hash",
        variant: "destructive",
      });
    },
  });

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      (log.resource_id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resource_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.user_id || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `há ${diffMins} min`;
    if (diffHours < 24) return `há ${diffHours}h`;
    if (diffDays < 7) return `há ${diffDays}d`;
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const truncateId = (id: string | null | undefined) => {
    if (!id) return "—";
    return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando trilha de auditoria...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Erro ao carregar auditoria
        </h1>
        <p className="text-muted-foreground mb-6">
          {error instanceof Error ? error.message : "Tente novamente mais tarde"}
        </p>
        <Button onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Trilha de Auditoria</h1>
          <p className="text-muted-foreground mt-1">
            Registros imutáveis com verificação de cadeia de hash
          </p>
        </div>
        <Button
          onClick={() => verifyMutation.mutate()}
          disabled={verifyMutation.isPending}
          className="gap-2"
        >
          {verifyMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
          Verificar Integridade
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por recurso, ação, usuário..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Ação: {actionFilter === "all" ? "Todas" : actionLabels[actionFilter] || actionFilter}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setActionFilter("all")}>Todas</DropdownMenuItem>
            {Object.keys(actionLabels).map((action) => (
              <DropdownMenuItem key={action} onClick={() => setActionFilter(action)}>
                {actionLabels[action]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-background border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{logs.length}</p>
          <p className="text-xs text-muted-foreground">Total de registros</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">
            {new Set(logs.map((l) => l.user_id).filter(Boolean)).size}
          </p>
          <p className="text-xs text-muted-foreground">Usuários ativos</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">
            {new Set(logs.map((l) => l.resource_type)).size}
          </p>
          <p className="text-xs text-muted-foreground">Tipos de recurso</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">
            {logs.filter((l) => l.hash).length}
          </p>
          <p className="text-xs text-muted-foreground">Com hash</p>
        </div>
      </div>

      {/* Log entries */}
      {filteredLogs.length > 0 ? (
        <div className="space-y-2">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="bg-background border border-border rounded-xl p-4 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start gap-4">
                {/* Hash indicator */}
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                  log.hash ? "bg-emerald-500/10" : "bg-zinc-500/10"
                )}>
                  {log.hash ? (
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <ShieldAlert className="h-5 w-5 text-zinc-400" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        actionColors[log.action] || "bg-muted text-muted-foreground"
                      )}
                    >
                      {actionLabels[log.action] || log.action}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      <FileText className="h-3 w-3 mr-1" />
                      {resourceLabels[log.resource_type] || log.resource_type}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    {log.resource_id && (
                      <span className="font-mono" title={log.resource_id}>
                        ID: {truncateId(log.resource_id)}
                      </span>
                    )}
                    {log.user_id && (
                      <span className="flex items-center gap-1" title={log.user_id}>
                        <User className="h-3 w-3" />
                        {truncateId(log.user_id)}
                      </span>
                    )}
                    {log.hash && (
                      <span className="flex items-center gap-1 font-mono" title={log.hash}>
                        <Hash className="h-3 w-3" />
                        {truncateId(log.hash)}
                      </span>
                    )}
                  </div>

                  {/* Changes preview */}
                  {log.changes && Object.keys(log.changes).length > 0 && (
                    <div className="mt-2 p-2 bg-muted/50 rounded-lg text-xs font-mono text-muted-foreground max-h-20 overflow-auto">
                      {Object.entries(log.changes).slice(0, 3).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-foreground">{key}</span>:{" "}
                          {typeof value === "object" ? JSON.stringify(value) : String(value)}
                        </div>
                      ))}
                      {Object.keys(log.changes).length > 3 && (
                        <span className="text-muted-foreground">
                          +{Object.keys(log.changes).length - 3} campos
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <div className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1 shrink-0">
                  <Clock className="h-3 w-3" />
                  {formatTime(log.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Nenhum registro encontrado
          </h3>
          <p className="text-muted-foreground">
            {searchQuery ? "Tente uma busca diferente" : "Os registros de auditoria aparecerão aqui"}
          </p>
        </div>
      )}
    </div>
  );
}
