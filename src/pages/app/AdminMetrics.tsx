import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdapterStats, type AdapterStatsResponse } from "@/lib/api/admin-users";
import {
  BarChart3,
  Activity,
  Server,
  DollarSign,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Layers,
} from "lucide-react";

export default function AdminMetrics() {
  const [stats, setStats] = useState<AdapterStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdapterStats()
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Métricas do Sistema</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Métricas do Sistema</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Erro ao carregar métricas: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) return null;

  const successPct = (stats.jobs.success_rate * 100).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Métricas do Sistema</h1>
        <Badge variant="outline" className="text-xs">Admin Only</Badge>
      </div>

      {/* Jobs */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" /> Jobs
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Layers} label="Total" value={stats.jobs.total.toLocaleString()} />
          <StatCard icon={CheckCircle} label="Completos" value={stats.jobs.completed.toLocaleString()} color="text-green-500" />
          <StatCard icon={XCircle} label="Falharam" value={stats.jobs.failed.toLocaleString()} color="text-red-500" />
          <StatCard icon={Activity} label="Taxa de Sucesso" value={`${successPct}%`} color={Number(successPct) > 95 ? "text-green-500" : "text-yellow-500"} />
        </div>
      </div>

      {/* Queue */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <Server className="h-5 w-5 text-primary" /> Fila
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard icon={Layers} label="Profundidade da Fila" value={stats.queue.depth.toString()} />
          <StatCard icon={Activity} label="Workers Ativos" value={stats.queue.active_workers.toString()} />
        </div>
      </div>

      {/* Adapters */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" /> Adaptadores
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(stats.adapters).map(([name, data]) => (
            <Card key={name}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium capitalize">{name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-foreground">{(data.success_rate * 100).toFixed(1)}%</span>
                  <span className="text-xs text-muted-foreground">sucesso</span>
                </div>
                <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="text-green-500">{data.success} ✓</span>
                  <span className="text-red-500">{data.failed} ✗</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Costs */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" /> Custos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={DollarSign} label="Stellar (XLM)" value={stats.costs.stellar_xlm.toFixed(4)} />
          <StatCard icon={DollarSign} label="Stellar (USD)" value={`$${stats.costs.stellar_usd.toFixed(4)}`} />
          <StatCard icon={Server} label="IPFS Storage" value={`${stats.costs.ipfs_storage_gb.toFixed(3)} GB`} />
          <StatCard icon={ShieldAlert} label="Rate Limit Rejeições" value={stats.rate_limits.rejections.toString()} color="text-yellow-500" />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
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
