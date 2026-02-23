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
  CheckCircle2,
  CircleDashed,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getCircuits } from "@/lib/api/circuits";
import { listPartnerApiKeys, getPartnerApiKeyMetrics } from "@/lib/api/admin";
import { listIngestionTemplates } from "@/lib/api/ingestion-templates";
import { listRawPayloads, listRoutingIssues } from "@/lib/api/partner-routing";
import type { Circuit, PartnerApiKeyResponse } from "@/lib/api/types";

interface OverviewMetrics {
  activeCircuits: number;
  activeKeys: number;
  totalRequests: number;
  requestsLast24h: number;
  errorsLast24h: number;
  lastUsedAt: string | null;
  hasDefaultTemplate: boolean;
  hasUpload: boolean;
  hasRoutingPending: boolean;
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
    hasDefaultTemplate: false,
    hasUpload: false,
    hasRoutingPending: false,
  });

  useEffect(() => {
    async function fetchMetrics() {
      setLoading(true);
      try {
        const [circuits, keys, templates, rawHistory, routingIssues] = await Promise.all([
          getCircuits(),
          listPartnerApiKeys(),
          listIngestionTemplates(),
          listRawPayloads(5),
          listRoutingIssues(),
        ]);

        const activeKeys = keys.filter((k: PartnerApiKeyResponse) => k.is_active);

        // Aggregate metrics from all keys
        let totalRequests = 0;
        let requestsLast24h = 0;
        let errorsLast24h = 0;
        let lastUsedAt: string | null = null;

        const keyMetrics = await Promise.all(
          activeKeys.map(async (key) => {
            try {
              return await getPartnerApiKeyMetrics(key.id);
            } catch {
              return null;
            }
          })
        );
        keyMetrics.forEach((m) => {
          if (!m) return;
          totalRequests += m.requests_total;
          requestsLast24h += m.requests_last_24h;
          errorsLast24h += m.errors_last_24h;
          if (m.last_used_at && (!lastUsedAt || m.last_used_at > lastUsedAt)) {
            lastUsedAt = m.last_used_at;
          }
        });

        setMetrics({
          activeCircuits: circuits.length,
          activeKeys: activeKeys.length,
          totalRequests,
          requestsLast24h,
          errorsLast24h,
          lastUsedAt,
          hasDefaultTemplate: templates.some((t) => t.is_default),
          hasUpload: rawHistory.rows.length > 0,
          hasRoutingPending: routingIssues.count > 0,
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
      <Card className="p-6">
        <h3 className="text-base font-semibold text-foreground mb-2">Onboarding em 5 minutos</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Siga estes passos para sair de zero até primeira integração.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border p-3 flex items-center gap-2">
            {metrics.activeKeys > 0 ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <CircleDashed className="h-4 w-4 text-muted-foreground" />}
            <span>1. Criar API key operacional</span>
          </div>
          <div className="rounded-lg border p-3 flex items-center gap-2">
            {metrics.hasDefaultTemplate ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <CircleDashed className="h-4 w-4 text-muted-foreground" />}
            <span>2. Criar template padrão</span>
          </div>
          <div className="rounded-lg border p-3 flex items-center gap-2">
            {metrics.hasUpload ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <CircleDashed className="h-4 w-4 text-muted-foreground" />}
            <span>3. Enviar primeiro arquivo</span>
          </div>
          <div className="rounded-lg border p-3 flex items-center gap-2">
            {!metrics.hasRoutingPending ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <CircleDashed className="h-4 w-4 text-amber-600" />}
            <span>4. Resolver pendências de roteamento</span>
          </div>
          <div className="rounded-lg border p-3 flex items-center gap-2 md:col-span-2">
            {metrics.totalRequests > 0 ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <CircleDashed className="h-4 w-4 text-muted-foreground" />}
            <span>5. Validar recebimento no cliente (link/iframe)</span>
          </div>
        </div>
      </Card>

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
