import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  UserPlus,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getCircuit, getJoinRequests, reviewJoinRequest } from "@/lib/defarm-api";
import type { JoinRequest } from "@/lib/api/types";

const statusConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: "Pendente", icon: Clock, className: "bg-amber-500/10 text-amber-600" },
  approved: { label: "Aprovado", icon: CheckCircle2, className: "bg-primary/10 text-primary" },
  rejected: { label: "Rejeitado", icon: XCircle, className: "bg-destructive/10 text-destructive" },
};

export default function JoinRequestsAdmin() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("pending");

  const { data: circuit } = useQuery({
    queryKey: ["circuit", id],
    queryFn: () => getCircuit(id!),
    enabled: !!id,
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["joinRequests", id, statusFilter],
    queryFn: () => getJoinRequests(id!, statusFilter),
    enabled: !!id,
  });

  const decideMutation = useMutation({
    mutationFn: ({ requestId, action }: { requestId: string; action: 'approve' | 'reject' }) =>
      reviewJoinRequest(id!, requestId, {
        action,
        role: action === 'approve' ? 'member' : undefined,
      }),
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["joinRequests", id] });
      toast({
        title: action === "approve" ? "Solicitação aprovada!" : "Solicitação rejeitada",
        description:
          action === "approve"
            ? "O usuário foi adicionado ao circuito."
            : "A solicitação foi rejeitada.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao processar solicitação",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate(`/app/circuitos/${id}`)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o circuito
        </button>

        <div className="flex items-center gap-3 mb-1">
          <UserPlus className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Solicitações de Entrada</h1>
        </div>
        <p className="text-muted-foreground">
          Gerencie solicitações para o circuito "{circuit?.name || "..."}"
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {["pending", "approved", "rejected"].map((s) => {
          const config = statusConfig[s];
          return (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
              className={cn(statusFilter === s && "bg-primary hover:bg-primary")}
            >
              <config.icon className="h-4 w-4 mr-1" />
              {config.label}
            </Button>
          );
        })}
      </div>

      {/* Requests list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : requests.length > 0 ? (
        <div className="space-y-3">
          {requests.map((req: JoinRequest) => {
            const config = statusConfig[req.status] || statusConfig.pending;
            const StatusIcon = config.icon;

            return (
              <div
                key={req.id}
                className="bg-background border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm font-mono">
                      {req.user_id.slice(0, 8)}...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Solicitado em{" "}
                      {new Date(req.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    {req.message && (
                      <p className="text-sm text-muted-foreground mt-1 italic">
                        "{req.message}"
                      </p>
                    )}
                    {req.user_metadata && Object.keys(req.user_metadata).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {Object.entries(req.user_metadata).map(([k, v]) => (
                          <span key={k} className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                            {k}: {String(v)}
                          </span>
                        ))}
                      </div>
                    )}
                    {req.rejection_reason && (
                      <p className="text-xs text-destructive mt-1">
                        Motivo: {req.rejection_reason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                      config.className
                    )}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {config.label}
                  </span>

                  {req.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          decideMutation.mutate({ requestId: req.id, action: "approve" })
                        }
                        disabled={decideMutation.isPending}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          decideMutation.mutate({ requestId: req.id, action: "reject" })
                        }
                        disabled={decideMutation.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Rejeitar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Nenhuma solicitação {statusConfig[statusFilter]?.label.toLowerCase()}
          </h3>
          <p className="text-muted-foreground">
            Solicitações de entrada aparecerão aqui quando disponíveis.
          </p>
        </div>
      )}
    </div>
  );
}
