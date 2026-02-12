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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getPublicCircuit, createJoinRequest } from "@/lib/defarm-api";
import { useAuth } from "@/contexts/AuthContext";
import logoIcon from "@/assets/logo-icon.png";
import { useState } from "react";

export default function PublicCircuit() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [joinSent, setJoinSent] = useState(false);

  const { data: circuit, isLoading, error } = useQuery({
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

  if (error || !circuit) {
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
                {circuit.public_description || circuit.description || "Sem descrição"}
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
                {circuit.view_count !== undefined && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    {circuit.view_count} visualizações
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Join button */}
          <div className="flex-shrink-0">
            {joinSent ? (
              <Button disabled className="btn-offset bg-primary hover:bg-primary text-primary-foreground">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Solicitação enviada
              </Button>
            ) : isAuthenticated ? (
              <Button
                onClick={() => joinMutation.mutate()}
                disabled={joinMutation.isPending}
                className="btn-offset bg-primary hover:bg-primary text-primary-foreground"
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
                <Button className="btn-offset bg-primary hover:bg-primary text-primary-foreground">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Entrar para solicitar
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {circuit.public_website && (
            <a
              href={circuit.public_website}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-background border border-border rounded-xl p-4 flex items-center gap-3 hover:border-primary/50 transition-colors"
            >
              <ExternalLink className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Website</p>
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {circuit.public_website}
                </p>
              </div>
            </a>
          )}
          {circuit.public_contact_email && (
            <a
              href={`mailto:${circuit.public_contact_email}`}
              className="bg-background border border-border rounded-xl p-4 flex items-center gap-3 hover:border-primary/50 transition-colors"
            >
              <Mail className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Contato</p>
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {circuit.public_contact_email}
                </p>
              </div>
            </a>
          )}
          <div className="bg-background border border-border rounded-xl p-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Circuito aberto</p>
              <p className="text-xs text-muted-foreground">Aceita solicitações de entrada</p>
            </div>
          </div>
        </div>

        {/* Metadata / extra info */}
        {circuit.metadata && Object.keys(circuit.metadata).length > 0 && (
          <div className="bg-background border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Informações adicionais</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(circuit.metadata).map(([key, value]) => (
                <div key={key} className="flex justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground capitalize">
                    {key.replace(/_/g, " ")}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {String(value)}
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
