import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { getOesaDashboard, type OesaAlert } from "@/lib/api/oesa";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// OESA Dashboard — fase 3 do épico OESA Dashboard (#111). Renderiza os agregados
// (movimentações da própria OESA) + os alertas de fraude (que cruzam a rede,
// ancorados na borda dela), do endpoint GET /api/oesa/dashboard.
function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

function alertStyle(severity: string): { badge: string; label: string } {
  if (severity === "high")
    return { badge: "bg-red-500/10 text-red-700", label: "Alta" };
  if (severity === "medium")
    return { badge: "bg-amber-500/10 text-amber-700", label: "Média" };
  return { badge: "bg-muted text-muted-foreground", label: severity };
}

function alertTitle(type: string): string {
  if (type === "duplicate_gta") return "GTA duplicada";
  if (type === "same_item_overlap") return "Movimentações simultâneas";
  return type;
}

function AlertRow({ alert }: { alert: OesaAlert }) {
  const s = alertStyle(alert.severity);
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-2 mb-1">
        <ShieldAlert className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{alertTitle(alert.type)}</span>
        <span
          className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${s.badge}`}
        >
          {s.label}
        </span>
        {alert.gta_number && (
          <span className="text-xs text-muted-foreground font-mono ml-auto">
            {alert.gta_number}
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-2">{alert.detail}</p>
      <div className="flex flex-wrap gap-2">
        {alert.item_dfids.map((dfid) => (
          <Link
            key={dfid}
            to={`/i/${dfid}`}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-mono"
          >
            {dfid} <ExternalLink className="h-3 w-3" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function OesaDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["oesa-dashboard"],
    queryFn: getOesaDashboard,
    retry: 1,
  });

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-2">
        <LayoutDashboard className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold">Painel da OESA</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Movimentações que você carimbou e alertas de integridade — GTAs duplicadas
        ou movimentações simultâneas do mesmo animal na rede.
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-12">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando painel...
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200/60 rounded-md px-3 py-4">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error instanceof Error
            ? error.message
            : "Não foi possível carregar o painel (acesso restrito a OESA)."}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard label="Movimentações" value={data.summary.movements_total} />
            <StatCard label="Animais movimentados" value={data.summary.items_moved} />
            <StatCard label="GTAs distintas" value={data.summary.gtas_distinct} />
            <StatCard label="Últimos 30 dias" value={data.summary.last_30d} />
          </div>

          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            Alertas de integridade
            {data.alerts.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 font-medium">
                {data.alerts.length}
              </span>
            )}
          </h2>

          {data.alerts.length === 0 ? (
            <div className="text-sm text-muted-foreground rounded-lg border border-border px-3 py-6 text-center">
              Nenhum alerta — nenhuma GTA duplicada ou movimentação simultânea
              detectada nas suas movimentações.
            </div>
          ) : (
            <div className="space-y-3">
              {data.alerts.map((a, i) => (
                <AlertRow key={`${a.type}-${i}`} alert={a} />
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
