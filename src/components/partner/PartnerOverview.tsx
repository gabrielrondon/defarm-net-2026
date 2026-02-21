import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Activity,
  AlertTriangle,
  Wifi,
  Clock,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getCircuits } from "@/lib/api/circuits";
import { listPartnerApiKeys, getPartnerApiKeyMetrics } from "@/lib/api/admin";
import type { Circuit, PartnerApiKeyResponse } from "@/lib/api/types";

interface OverviewMetrics {
  activeCircuits: number;
  activeKeys: number;
  totalRequests: number;
  requestsLast24h: number;
  errorsLast24h: number;
  lastUsedAt: string | null;
}

export function PartnerOverview() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<OverviewMetrics>({
    activeCircuits: 0,
    activeKeys: 0,
    totalRequests: 0,
    requestsLast24h: 0,
    errorsLast24h: 0,
    lastUsedAt: null,
  });

  useEffect(() => {
    async function fetchMetrics() {
      setLoading(true);
      try {
        const [circuits, keys] = await Promise.all([
          getCircuits(),
          listPartnerApiKeys(),
        ]);

        const activeKeys = keys.filter((k: PartnerApiKeyResponse) => k.is_active);

        // Aggregate metrics from all keys
        let totalRequests = 0;
        let requestsLast24h = 0;
        let errorsLast24h = 0;
        let lastUsedAt: string | null = null;

        for (const key of activeKeys) {
          try {
            const m = await getPartnerApiKeyMetrics(key.id);
            totalRequests += m.requests_total;
            requestsLast24h += m.requests_last_24h;
            errorsLast24h += m.errors_last_24h;
            if (m.last_used_at && (!lastUsedAt || m.last_used_at > lastUsedAt)) {
              lastUsedAt = m.last_used_at;
            }
          } catch {
            // Metrics not available for this key
          }
        }

        setMetrics({
          activeCircuits: circuits.length,
          activeKeys: activeKeys.length,
          totalRequests,
          requestsLast24h,
          errorsLast24h,
          lastUsedAt,
        });
      } catch (err) {
        console.error("Failed to fetch partner metrics:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const cards = [
    {
      label: "Circuitos Ativos",
      value: metrics.activeCircuits,
      icon: Package,
      color: "text-primary",
    },
    {
      label: "API Keys Ativas",
      value: metrics.activeKeys,
      icon: Activity,
      color: "text-primary",
    },
    {
      label: "Requests (24h)",
      value: metrics.requestsLast24h.toLocaleString("pt-BR"),
      icon: Clock,
      color: "text-primary",
    },
    {
      label: "Erros (24h)",
      value: metrics.errorsLast24h,
      icon: AlertTriangle,
      color: "text-destructive",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Organization header */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {user?.username || "Organização Parceira"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Parceiro de dados integrado via API
            </p>
          </div>
          <Badge className="bg-primary/10 text-primary border-primary/20">
            <Wifi className="h-3 w-3 mr-1" />
            Conectado
          </Badge>
        </div>
        {metrics.lastUsedAt && (
          <p className="text-xs text-muted-foreground mt-3">
            Última atividade:{" "}
            {new Date(metrics.lastUsedAt).toLocaleString("pt-BR")}
          </p>
        )}
      </Card>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.label} className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <card.icon className={`h-4 w-4 ${card.color}`} />
              <span className="text-xs font-medium">{card.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
          </Card>
        ))}
      </div>

      {/* Total requests */}
      <Card className="p-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-1">
          Total de Requests (todas as chaves)
        </h3>
        <p className="text-3xl font-bold text-foreground">
          {metrics.totalRequests.toLocaleString("pt-BR")}
        </p>
      </Card>
    </div>
  );
}
