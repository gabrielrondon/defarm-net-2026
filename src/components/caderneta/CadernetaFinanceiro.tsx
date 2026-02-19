import { useQuery } from "@tanstack/react-query";
import { listCreditLines } from "@/lib/finance-api/credit-lines";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Landmark, ArrowRight, TrendingUp, Calculator } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function CadernetaFinanceiro() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["credit-lines-summary"],
    queryFn: () => listCreditLines({ limit: 5 }),
  });

  const creditLines = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">Financeiro</h3>
          <p className="text-sm text-muted-foreground">
            {data?.pagination?.total ?? 0} linha{(data?.pagination?.total ?? 0) !== 1 ? "s" : ""} de crédito disponíve{(data?.pagination?.total ?? 0) !== 1 ? "is" : "l"}
          </p>
        </div>
        <Button
          size="sm"
          className="btn-offset border-2 border-foreground bg-primary text-primary-foreground"
          onClick={() => navigate("/app/finance/simulador")}
        >
          <Calculator className="h-4 w-4 mr-1" />
          Simular
        </Button>
      </div>

      {/* Resumo rápido */}
      <Card className="border-2 border-foreground bg-primary/5" style={{ boxShadow: "4px 4px 0 0 hsl(var(--foreground))" }}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Requisitos preenchidos</p>
          </div>
          <Progress value={35} className="h-2.5" />
          <p className="text-xs text-muted-foreground mt-1.5">
            Complete seu perfil e compliance para desbloquear mais oportunidades
          </p>
        </CardContent>
      </Card>

      {!creditLines.length ? (
        <Card className="border-2 border-dashed border-muted-foreground/30">
          <CardContent className="p-8 text-center">
            <Landmark className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm">
              Nenhuma linha de crédito disponível no momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {creditLines.map((cl) => (
            <Card
              key={cl.id}
              className="border-2 border-foreground cursor-pointer hover:translate-x-0.5 hover:translate-y-0.5 transition-transform"
              style={{ boxShadow: "4px 4px 0 0 hsl(var(--foreground))" }}
              onClick={() => navigate("/app/finance/linhas-credito")}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{cl.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {cl.program_type === "working_capital" && "Capital de Giro"}
                      {cl.program_type === "investment" && "Investimento"}
                      {cl.program_type === "financing" && "Financiamento"}
                      {!cl.program_type && "—"}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {cl.interest_rate_min != null
                      ? `${cl.interest_rate_min}%–${cl.interest_rate_max}% a.a.`
                      : "Sob consulta"}
                  </Badge>
                </div>
                {(cl.max_amount != null) && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Até R$ {cl.max_amount.toLocaleString("pt-BR")}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="ghost"
          className="flex-1 text-muted-foreground"
          onClick={() => navigate("/app/finance/linhas-credito")}
        >
          Todas as linhas <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
        <Button
          variant="ghost"
          className="flex-1 text-muted-foreground"
          onClick={() => navigate("/app/finance")}
        >
          Dashboard Finance <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
