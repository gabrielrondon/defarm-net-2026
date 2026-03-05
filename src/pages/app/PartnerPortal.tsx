import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getCircuits } from "@/lib/api/circuits";
import { listPartnerApiKeys, getPartnerApiKeyMetrics } from "@/lib/api/admin";
import { listRawPayloads, listRoutingIssues } from "@/lib/api/partner-routing";
import type { PartnerApiKeyResponse } from "@/lib/api/types";
import {
  Loader2,
  CheckCircle2,
  Circle,
  ExternalLink,
  ArrowRight,
  Route,
  FileUp,
  Key,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface OverviewMetrics {
  activeCircuits: number;
  activeKeys: number;
  requestsLast24h: number;
  errorsLast24h: number;
  hasUpload: boolean;
  hasRoutingPending: boolean;
}

const SETUP_STEPS = [
  { key: "apiKey", label: "Criar API key", href: "/app/api-keys", icon: Key },
  { key: "upload", label: "Enviar primeiro arquivo", href: "/app/parceiro/ingestao", icon: FileUp },
  { key: "routing", label: "Configurar roteamento", href: "/app/parceiro/roteamento", icon: Route },
] as const;

export default function PartnerPortal() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<OverviewMetrics>({
    activeCircuits: 0,
    activeKeys: 0,
    requestsLast24h: 0,
    errorsLast24h: 0,
    hasUpload: false,
    hasRoutingPending: false,
  });

  useEffect(() => {
    async function fetchMetrics() {
      setLoading(true);
      try {
        const [circuits, keys, rawHistory, routingIssues] = await Promise.all([
          getCircuits(),
          listPartnerApiKeys(),
          listRawPayloads(5),
          listRoutingIssues(),
        ]);

        const activeKeys = keys.filter((k: PartnerApiKeyResponse) => k.is_active);

        let requestsLast24h = 0;
        let errorsLast24h = 0;

        const keyMetrics = await Promise.all(
          activeKeys.map(async (key) => {
            try { return await getPartnerApiKeyMetrics(key.id); } catch { return null; }
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
    upload: metrics.hasUpload,
    routing: !metrics.hasRoutingPending,
  };
  const completedSteps = Object.values(stepDone).filter(Boolean).length;
  const allDone = completedSteps === SETUP_STEPS.length;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-1">Parceiro</p>
        <h1 className="text-foreground">{user?.username || "Portal do Parceiro"}</h1>
      </div>

      {/* Docs banner */}
      <a
        href="https://docs.defarm.net"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 hover:bg-primary/10 transition-colors group"
      >
        <BookOpen className="h-6 w-6 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Documentação da API</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Guia de integração, referência de endpoints e exemplos.
          </p>
        </div>
        <ExternalLink className="h-4 w-4 text-primary/50 group-hover:text-primary transition-colors shrink-0" />
      </a>

      {/* Metrics */}
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

      {/* Setup checklist — only if incomplete */}
      {!allDone && (
        <div className="rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-foreground">Primeiros passos</p>
            <span className="text-xs text-muted-foreground">{completedSteps}/{SETUP_STEPS.length}</span>
          </div>
          <div className="h-1 rounded-full bg-muted mb-4 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${(completedSteps / SETUP_STEPS.length) * 100}%` }}
            />
          </div>
          <div className="space-y-1">
            {SETUP_STEPS.map((step) => {
              const done = stepDone[step.key];
              return (
                <Link
                  key={step.key}
                  to={step.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted/50 ${
                    done ? "text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  )}
                  <span className={done ? "line-through" : ""}>{step.label}</span>
                  {!done && <ArrowRight className="h-3 w-3 ml-auto text-muted-foreground/40" />}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Button variant="outline" asChild className="justify-start">
          <Link to="/app/parceiro/ingestao">
            <FileUp className="h-4 w-4 mr-2" />
            Enviar dados
          </Link>
        </Button>
        <Button variant="outline" asChild className="justify-start">
          <Link to="/app/parceiro/roteamento">
            <Route className="h-4 w-4 mr-2" />
            Roteamento
          </Link>
        </Button>
        <Button variant="outline" asChild className="justify-start">
          <Link to="/app/api-keys">
            <Key className="h-4 w-4 mr-2" />
            API Keys
          </Link>
        </Button>
      </div>
    </div>
  );
}
