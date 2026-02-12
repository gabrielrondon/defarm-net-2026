import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  GitBranch,
  Globe,
  Package,
  Eye,
  Users,
  ExternalLink,
  Mail,
  Loader2,
  ArrowLeft,
  UserPlus,
  CheckCircle2,
  BarChart3,
  MapPin,
  Layers,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getPublicCircuit, createJoinRequest } from "@/lib/defarm-api";
import type { PublicCircuitPortfolio, ItemSummary } from "@/lib/api/types";
import { useAuth } from "@/contexts/AuthContext";
import logoIcon from "@/assets/logo-icon.png";
import { useState } from "react";

export default function PublicCircuit() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [joinSent, setJoinSent] = useState(false);

  const { data: portfolio, isLoading, error } = useQuery({
    queryKey: ["publicCircuit", id],
    queryFn: () => getPublicCircuit(id!),
    enabled: !!id,
    retry: 1,
  });

  const joinMutation = useMutation({
    mutationFn: () => createJoinRequest(id!),
    onSuccess: () => {
      setJoinSent(true);
      toast({
        title: "Solicitação enviada!",
        description: "O administrador do circuito será notificado.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao solicitar entrada",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando circuito...</p>
        </div>
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Circuito não encontrado</h1>
          <p className="text-muted-foreground mb-6">
            Este circuito não existe ou não está disponível publicamente.
          </p>
          <Link to="/">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao início
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const circuit = portfolio.circuit;
  const stats = portfolio.stats;
  const recentItems = portfolio.recent_items;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoIcon} alt="DeFarm" className="h-7 w-7" />
            <span className="font-bold text-foreground">DeFarm</span>
          </Link>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Link to="/app">
                <Button variant="outline" size="sm">Ir para o App</Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button variant="outline" size="sm">Entrar</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Banner */}
      {circuit.public_banner_url && (
        <div className="w-full h-48 sm:h-64 overflow-hidden">
          <img
            src={circuit.public_banner_url}
            alt="Banner"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              {circuit.public_logo_url ? (
                <img
                  src={circuit.public_logo_url}
                  alt={circuit.name}
                  className="h-12 w-12 rounded-xl object-cover"
                />
              ) : (
                <GitBranch className="h-8 w-8 text-primary" />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{circuit.name}</h1>
              <p className="text-muted-foreground mt-1">
                {circuit.description || "Sem descrição"}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  <Globe className="h-3 w-3" />
                  Público
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                  <Package className="h-3 w-3" />
                  {circuit.circuit_type || "Standard"}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {circuit.member_count} membros
                </span>
              </div>
            </div>
          </div>

          {/* Join button */}
          <div className="flex-shrink-0">
            {!circuit.allow_join_requests ? (
              <Button disabled variant="outline">
                Não aceita solicitações
              </Button>
            ) : joinSent ? (
              <Button disabled className="bg-primary hover:bg-primary text-primary-foreground">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Solicitação enviada
              </Button>
            ) : isAuthenticated ? (
              <Button
                onClick={() => joinMutation.mutate()}
                disabled={joinMutation.isPending}
                className="bg-primary hover:bg-primary text-primary-foreground"
              >
                {joinMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                Solicitar Entrada
              </Button>
            ) : (
              <Link to="/login">
                <Button className="bg-primary hover:bg-primary text-primary-foreground">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Entrar para solicitar
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-background border border-border rounded-xl p-4 text-center">
            <Package className="h-5 w-5 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats.total_items}</p>
            <p className="text-xs text-muted-foreground">Itens totais</p>
          </div>
          <div className="bg-background border border-border rounded-xl p-4 text-center">
            <CheckCircle2 className="h-5 w-5 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats.active_items}</p>
            <p className="text-xs text-muted-foreground">Itens ativos</p>
          </div>
          <div className="bg-background border border-border rounded-xl p-4 text-center">
            <Layers className="h-5 w-5 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats.value_chains.length}</p>
            <p className="text-xs text-muted-foreground">Cadeias de valor</p>
          </div>
          <div className="bg-background border border-border rounded-xl p-4 text-center">
            <Activity className="h-5 w-5 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats.recent_activity_count}</p>
            <p className="text-xs text-muted-foreground">Atividade (7d)</p>
          </div>
        </div>

        {/* Value chains & countries */}
        {(stats.value_chains.length > 0 || stats.countries.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats.value_chains.length > 0 && (
              <div className="bg-background border border-border rounded-xl p-4">
                <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  Cadeias de Valor
                </h3>
                <div className="flex flex-wrap gap-2">
                  {stats.value_chains.map((vc) => (
                    <span
                      key={vc}
                      className="px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary"
                    >
                      {vc}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {stats.countries.length > 0 && (
              <div className="bg-background border border-border rounded-xl p-4">
                <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Países
                </h3>
                <div className="flex flex-wrap gap-2">
                  {stats.countries.map((c) => (
                    <span
                      key={c}
                      className="px-2 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent items */}
        {recentItems.length > 0 && (
          <div className="bg-background border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Itens Recentes
            </h2>
            <div className="space-y-2">
              {recentItems.map((item: ItemSummary) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-3 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Package className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-mono font-medium text-foreground">
                        {item.dfid.length > 35 ? `${item.dfid.slice(0, 35)}...` : item.dfid}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.value_chain} · {item.country} · {item.year}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs text-muted-foreground">
            Verificado pela plataforma DeFarm · Rastreabilidade do campo à mesa
          </p>
        </div>
      </footer>
    </div>
  );
}
