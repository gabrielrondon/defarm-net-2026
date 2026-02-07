import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { 
  GitBranch, 
  Package, 
  Activity, 
  Plus,
  ArrowRight,
  TrendingUp,
  Calendar,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCircuits, getItems, getEvents } from "@/lib/defarm-api";

interface StatCardProps {
  icon: typeof GitBranch;
  label: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  href: string;
  isLoading?: boolean;
}

function StatCard({ icon: Icon, label, value, change, changeType = "neutral", href, isLoading }: StatCardProps) {
  return (
    <Link
      to={href}
      className="bg-background border border-border rounded-2xl p-6 hover:border-primary/50 transition-colors group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      {isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mb-2" />
      ) : (
        <p className="text-3xl font-bold text-foreground mb-1">{value}</p>
      )}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        {change && (
          <span className={cn(
            "text-xs font-medium",
            changeType === "positive" && "text-primary",
            changeType === "negative" && "text-destructive",
            changeType === "neutral" && "text-muted-foreground"
          )}>
            {change}
          </span>
        )}
      </div>
    </Link>
  );
}

interface QuickActionProps {
  icon: typeof Plus;
  label: string;
  description: string;
  href: string;
}

function QuickAction({ icon: Icon, label, description, href }: QuickActionProps) {
  return (
    <Link
      to={href}
      className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors group"
    >
      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Bom dia");
    else if (hour < 18) setGreeting("Boa tarde");
    else setGreeting("Boa noite");
  }, []);

  // Fetch data from API - wrap in arrow functions to avoid queryFn type issues
  const { data: circuits = [], isLoading: isLoadingCircuits } = useQuery({
    queryKey: ["circuits"],
    queryFn: () => getCircuits(),
  });

  const { data: items = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ["items"],
    queryFn: () => getItems(),
  });

  const { data: events = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ["events"],
    queryFn: () => getEvents(),
  });

  const activeCircuits = circuits.filter(c => c.status === "Active").length;
  const tokenizedItems = items.filter(i => i.dfid?.startsWith("DFID-")).length;
  const tokenizationRate = items.length > 0 ? Math.round((tokenizedItems / items.length) * 100) : 0;

  // Get recent events for activity feed
  const recentEvents = events.slice(0, 5);

  const eventTypeLabels: Record<string, string> = {
    ItemCreated: "Item criado",
    ItemEnriched: "Item enriquecido",
    CircuitPush: "Push para circuito",
    CircuitPull: "Pull de circuito",
  };

  const formatEventTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `há ${diffMins} min`;
    if (diffHours < 24) return `há ${diffHours}h`;
    if (diffDays < 7) return `há ${diffDays}d`;
    return date.toLocaleDateString("pt-BR");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {greeting}, {user?.username}
          </h1>
          <p className="text-muted-foreground mt-1">
            Aqui está um resumo da sua plataforma de rastreabilidade
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {new Date().toLocaleDateString("pt-BR", { 
            weekday: "long", 
            day: "numeric", 
            month: "long" 
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={GitBranch}
          label="Circuitos ativos"
          value={activeCircuits}
          href="/app/circuitos"
          isLoading={isLoadingCircuits}
        />
        <StatCard
          icon={Package}
          label="Itens rastreados"
          value={items.length.toLocaleString("pt-BR")}
          href="/app/itens"
          isLoading={isLoadingItems}
        />
        <StatCard
          icon={Activity}
          label="Eventos registrados"
          value={events.length.toLocaleString("pt-BR")}
          href="/app/eventos"
          isLoading={isLoadingEvents}
        />
        <StatCard
          icon={TrendingUp}
          label="Taxa de tokenização"
          value={`${tokenizationRate}%`}
          href="/app/itens"
          isLoading={isLoadingItems}
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <div className="lg:col-span-1 bg-background border border-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Ações rápidas
          </h2>
          <div className="space-y-3">
            <QuickAction
              icon={Plus}
              label="Novo Item"
              description="Cadastrar item para rastreamento"
              href="/app/itens/novo"
            />
            <QuickAction
              icon={GitBranch}
              label="Novo Circuito"
              description="Criar circuito de compartilhamento"
              href="/app/circuitos/novo"
            />
            <QuickAction
              icon={Package}
              label="Push para Circuito"
              description="Enviar itens para um circuito"
              href="/app/circuitos"
            />
          </div>
        </div>

        {/* Recent activity */}
        <div className="lg:col-span-2 bg-background border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Atividade recente
            </h2>
            <Link to="/app/eventos">
              <Button variant="ghost" size="sm">
                Ver tudo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          
          {isLoadingEvents ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentEvents.length > 0 ? (
            <div className="space-y-4">
              {recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-4 py-3 border-b border-border last:border-0"
                >
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">
                      {eventTypeLabels[event.event_type] || event.event_type}:{" "}
                      <span className="font-mono text-xs">
                        {(event.item_id || event.source_id || "").length > 20
                          ? `${(event.item_id || event.source_id || "").slice(0, 20)}...`
                          : event.item_id || event.source_id || "-"}
                      </span>
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatEventTime(event.created_at)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhuma atividade recente
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
