import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { 
  GitBranch, 
  Package, 
  Activity, 
  Plus,
  ArrowRight,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: typeof GitBranch;
  label: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  href: string;
}

function StatCard({ icon: Icon, label, value, change, changeType = "neutral", href }: StatCardProps) {
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
      <p className="text-3xl font-bold text-foreground mb-1">{value}</p>
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

// Mock recent activity for demo
const recentActivity = [
  { id: 1, type: "item_created", description: "Item DFID-20260128-000142 criado", time: "há 2 min" },
  { id: 2, type: "circuit_push", description: "5 itens enviados para Circuito Orgânico", time: "há 15 min" },
  { id: 3, type: "item_tokenized", description: "Item tokenizado na blockchain", time: "há 1 hora" },
  { id: 4, type: "member_joined", description: "Novo membro no Circuito Exportação", time: "há 3 horas" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Bom dia");
    else if (hour < 18) setGreeting("Boa tarde");
    else setGreeting("Boa noite");
  }, []);

  // In a real app, these would come from the API
  const stats = {
    circuits: 8,
    items: 1247,
    events: 3842,
    itemsThisMonth: 156,
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
          value={stats.circuits}
          href="/app/circuitos"
        />
        <StatCard
          icon={Package}
          label="Itens rastreados"
          value={stats.items.toLocaleString("pt-BR")}
          change={`+${stats.itemsThisMonth} este mês`}
          changeType="positive"
          href="/app/itens"
        />
        <StatCard
          icon={Activity}
          label="Eventos registrados"
          value={stats.events.toLocaleString("pt-BR")}
          href="/app/eventos"
        />
        <StatCard
          icon={TrendingUp}
          label="Taxa de tokenização"
          value="94%"
          change="+2.3%"
          changeType="positive"
          href="/app/itens"
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
          
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-4 py-3 border-b border-border last:border-0"
              >
                <div className="w-2 h-2 bg-primary rounded-full" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{activity.description}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {activity.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
