import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, Circle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getCircuits } from "@/lib/api/circuits";
import { listPartnerApiKeys, getPartnerApiKeyMetrics } from "@/lib/api/admin";
import { listIngestionTemplates } from "@/lib/api/ingestion-templates";
import { listRawPayloads, listRoutingIssues } from "@/lib/api/partner-routing";
import { ReceptionStrip } from "@/components/partner/ReceptionStrip";
import type { Circuit, PartnerApiKeyResponse } from "@/lib/api/types";

interface OverviewMetrics {
  activeCircuits: number;
  activeKeys: number;
  requestsLast24h: number;
  errorsLast24h: number;
  hasDefaultTemplate: boolean;
  hasUpload: boolean;
  hasRoutingPending: boolean;
}

const ONBOARDING_STEPS = [
  { key: "apiKey", label: "Criar API key" },
  { key: "template", label: "Configurar template" },
  { key: "upload", label: "Enviar primeiro arquivo" },
  { key: "routing", label: "Resolver pendências" },
] as const;

export function PartnerOverview() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<OverviewMetrics>({
    activeCircuits: 0,
    activeKeys: 0,
    requestsLast24h: 0,
    errorsLast24h: 0,
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

        let requestsLast24h = 0;
        let errorsLast24h = 0;

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
          requestsLast24h += m.requests_last_24h;
          errorsLast24h += m.errors_last_24h;
        });

        setMetrics({
          activeCircuits: circuits.length,
          activeKeys: activeKeys.length,
          requestsLast24h,
          errorsLast24h,
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
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stepDone = {
    apiKey: metrics.activeKeys > 0,
    template: metrics.hasDefaultTemplate,
    upload: metrics.hasUpload,
    routing: !metrics.hasRoutingPending,
  };

  const completedSteps = Object.values(stepDone).filter(Boolean).length;
  const allDone = completedSteps === ONBOARDING_STEPS.length;

  return (
    <div className="space-y-6">
      {/* "Seu recebimento": responde onde caem / está funcionando / como mando, na cara */}
      <ReceptionStrip />

      {/* Metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Circuitos", value: metrics.activeCircuits },
          { label: "API keys", value: metrics.activeKeys },
          { label: "Req. 24h", value: metrics.requestsLast24h },
          { label: "Erros 24h", value: metrics.errorsLast24h, warn: metrics.errorsLast24h > 0 },
        ].map((m) => (
          <div key={m.label} className="rounded-xl bg-muted/40 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{m.label}</p>
            <p className={`text-2xl font-semibold mt-0.5 ${m.warn ? "text-destructive" : "text-foreground"}`}>
              {m.value}
            </p>
          </div>
        ))}
      </div>

      {/* Onboarding — only show if not all done */}
      {!allDone && (
        <div className="rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-foreground">Setup</p>
            <span className="text-xs text-muted-foreground">
              {completedSteps}/{ONBOARDING_STEPS.length}
            </span>
          </div>
          <div className="h-1 rounded-full bg-muted mb-3 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${(completedSteps / ONBOARDING_STEPS.length) * 100}%` }}
            />
          </div>
          <div className="space-y-1">
            {ONBOARDING_STEPS.map((step) => {
              const done = stepDone[step.key];
              return (
                <div
                  key={step.key}
                  className="flex items-center gap-2.5 py-1.5 text-sm"
                >
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  )}
                  <span className={done ? "text-muted-foreground line-through" : "text-foreground"}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
