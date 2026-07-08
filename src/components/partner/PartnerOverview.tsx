import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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

// Onda 3, Fatia 2: guided first steps. Each step is now actionable — the first
// undone one is surfaced as the active step with a CTA that takes the partner there.
// label/cta/hint vêm do catálogo (portal.overview.steps.<key>.*).
const ONBOARDING_STEPS = [
  { key: "apiKey", to: "/app/api-keys" },
  { key: "template", to: "/app/parceiro/ingestao" },
  { key: "upload", to: "/app/parceiro/ingestao" },
  { key: "routing", to: "/app/parceiro/roteamento" },
] as const;

export function PartnerOverview() {
  const { t } = useTranslation();
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
  // The next thing to do: the first step that isn't done yet.
  const activeStep = ONBOARDING_STEPS.find((step) => !stepDone[step.key]);

  return (
    <div className="space-y-6">
      {/* "Seu recebimento": responde onde caem / está funcionando / como mando, na cara */}
      <ReceptionStrip />

      {/* Metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: t("portal.overview.metrics.circuits"), value: metrics.activeCircuits },
          { label: t("portal.overview.metrics.apiKeys"), value: metrics.activeKeys },
          { label: t("portal.overview.metrics.req24h"), value: metrics.requestsLast24h },
          { label: t("portal.overview.metrics.errors24h"), value: metrics.errorsLast24h, warn: metrics.errorsLast24h > 0 },
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
            <p className="text-sm font-medium text-foreground">{t("portal.overview.firstSteps")}</p>
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
          {/* The active step: the next thing to do, surfaced with a CTA that takes the
              partner straight there — turns a passive checklist into a guided flow. */}
          {activeStep && (
            <div className="mb-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-primary">
                {t("portal.overview.nextStep")}
              </p>
              <p className="mt-0.5 text-sm font-medium text-foreground">{t(`portal.overview.steps.${activeStep.key}.label`)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t(`portal.overview.steps.${activeStep.key}.hint`)}</p>
              <Button asChild size="sm" className="mt-2">
                <Link to={activeStep.to}>
                  {t(`portal.overview.steps.${activeStep.key}.cta`)}
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          )}
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
                    {t(`portal.overview.steps.${step.key}.label`)}
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
