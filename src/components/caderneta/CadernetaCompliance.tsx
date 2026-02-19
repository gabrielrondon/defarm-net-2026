import { useQuery } from "@tanstack/react-query";
import { listSources } from "@/lib/check-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, CheckCircle, AlertTriangle, XCircle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const statusConfig = {
  healthy: { icon: CheckCircle, color: "text-primary", bg: "bg-primary/10", label: "OK" },
  degraded: { icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-100", label: "Atenção" },
  unhealthy: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Falha" },
} as const;

const categoryLabels: Record<string, string> = {
  environmental: "Ambiental",
  social: "Social",
  legal: "Legal",
  certification: "Certificação",
};

export function CadernetaCompliance() {
  const navigate = useNavigate();

  const { data: sources, isLoading } = useQuery({
    queryKey: ["check-sources"],
    queryFn: () => listSources(),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  // Group by category
  const grouped = (sources ?? []).reduce<Record<string, typeof sources>>((acc, s) => {
    const cat = s.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(s);
    return acc;
  }, {});

  const enabledCount = sources?.filter((s) => s.enabled).length ?? 0;
  const totalCount = sources?.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">Compliance</h3>
          <p className="text-sm text-muted-foreground">
            {enabledCount} de {totalCount} verificações ativas
          </p>
        </div>
        <Button
          size="sm"
          className="btn-offset border-2 border-foreground bg-primary text-primary-foreground"
          onClick={() => navigate("/app/compliance")}
        >
          <Shield className="h-4 w-4 mr-1" />
          Verificar
        </Button>
      </div>

      {!sources?.length ? (
        <Card className="border-2 border-dashed border-muted-foreground/30">
          <CardContent className="p-8 text-center">
            <Shield className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm">
              Nenhuma fonte de compliance disponível.
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([category, catSources]) => (
          <div key={category} className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              {categoryLabels[category] || category}
            </p>
            {catSources!.map((source) => {
              const cfg = statusConfig[source.status as keyof typeof statusConfig] || statusConfig.degraded;
              const StatusIcon = cfg.icon;
              return (
                <Card
                  key={source.name}
                  className="border-2 border-foreground"
                  style={{ boxShadow: "3px 3px 0 0 hsl(var(--foreground))" }}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                      <StatusIcon className={`h-4 w-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{source.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{source.description}</p>
                    </div>
                    <Badge variant={source.enabled ? "default" : "secondary"} className="text-xs shrink-0">
                      {source.enabled ? cfg.label : "Desativado"}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ))
      )}

      <Button
        variant="ghost"
        className="w-full text-muted-foreground"
        onClick={() => navigate("/app/compliance")}
      >
        Ir para DeFarm Compliance <ArrowRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}
