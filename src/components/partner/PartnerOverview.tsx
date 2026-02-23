import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import {
  Loader2,
  CheckCircle2,
  Circle,
  ArrowRight,
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

const ONBOARDING_STEPS = [
  { key: "apiKey", label: "Criar API key operacional" },
  { key: "template", label: "Criar template padrão" },
  { key: "upload", label: "Enviar primeiro arquivo" },
  { key: "routing", label: "Resolver pendências de roteamento" },
  { key: "validate", label: "Validar recebimento no cliente" },
] as const;

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

  const stepDone = {
    apiKey: metrics.activeKeys > 0,
    template: metrics.hasDefaultTemplate,
    upload: metrics.hasUpload,
    routing: !metrics.hasRoutingPending,
    validate: metrics.totalRequests > 0,
  };

  const completedSteps = Object.values(stepDone).filter(Boolean).length;

  return (
    <div className="space-y-8">
      {/* Organization header — flat, no card */}
      <div>
        <h2 className="text-foreground">
          {user?.username || "Organização Parceira"}
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Parceiro de dados integrado via API
        </p>
      </div>

      {/* Metrics — minimal grid, no icons inside */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Circuitos", value: metrics.activeCircuits },
          { label: "API keys", value: metrics.activeKeys },
          { label: "Req. 24h", value: metrics.requestsLast24h.toLocaleString("pt-BR") },
          { label: "Erros 24h", value: metrics.errorsLast24h, warn: metrics.errorsLast24h > 0 },
        ].map((m) => (
          <div key={m.label} className="rounded-xl bg-muted/40 p-4">
            <p className="metric-label">{m.label}</p>
            <p className={`metric-value mt-1 ${m.warn ? "text-destructive" : "text-foreground"}`}>
              {m.value}
            </p>
          </div>
        ))}
      </div>

      {/* Onboarding — accent left card */}
      <Card className="card-accent-left p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="section-label">Setup</p>
            <h3 className="text-foreground mt-1">Onboarding rápido</h3>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {completedSteps}/{ONBOARDING_STEPS.length}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1 rounded-full bg-muted mb-4 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${(completedSteps / ONBOARDING_STEPS.length) * 100}%` }}
          />
        </div>
        <div className="space-y-2">
          {ONBOARDING_STEPS.map((step) => {
            const done = stepDone[step.key];
            return (
              <div
                key={step.key}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  done ? "text-muted-foreground" : "text-foreground bg-muted/30"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                )}
                <span className={done ? "line-through decoration-muted-foreground/40" : ""}>
                  {step.label}
                </span>
                {!done && (
                  <ArrowRight className="h-3 w-3 ml-auto text-muted-foreground/40" />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Total + last activity — subtle card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted/40 p-5">
          <p className="metric-label">Total de requests</p>
          <p className="metric-value mt-1 text-foreground">
            {metrics.totalRequests.toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="rounded-xl bg-muted/40 p-5">
          <p className="metric-label">Última atividade</p>
          <p className="text-sm font-medium text-foreground mt-2">
            {metrics.lastUsedAt
              ? new Date(metrics.lastUsedAt).toLocaleString("pt-BR")
              : "Nenhuma atividade registrada"}
          </p>
        </div>
      </div>
    </div>
  );
}
