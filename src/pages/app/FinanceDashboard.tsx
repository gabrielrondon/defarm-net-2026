import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Landmark,
  BarChart3,
  Calculator,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentIndicators, listCreditLines } from "@/lib/finance-api";

const trendIcon = (val: number) => {
  if (val > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
  if (val < 0) return <TrendingDown className="h-4 w-4 text-emerald-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

export default function FinanceDashboard() {
  const indicators = useQuery({
    queryKey: ["finance", "indicators"],
    queryFn: getCurrentIndicators,
  });

  const creditLines = useQuery({
    queryKey: ["finance", "credit-lines", { limit: 5, sort: "rate_asc" }],
    queryFn: () => listCreditLines({ limit: 5, sort: "rate_asc" }),
  });

  const programTypeLabel: Record<string, string> = {
    working_capital: "Capital de Giro",
    investment: "Investimento",
    financing: "Financiamento",
  };

  const audienceLabel: Record<string, string> = {
    family_farmer: "Agricultor Familiar",
    medium_producer: "Médio Produtor",
    large_producer: "Grande Produtor",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">DeFarm Finance</h1>
        <p className="text-muted-foreground">
          Crédito agrícola, instrumentos financeiros e indicadores de mercado
        </p>
      </div>

      {/* Market Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {indicators.isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))
        ) : indicators.data?.indicators?.map((ind) => (
          <Card key={ind.indicator_type}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {ind.indicator_type}
                </span>
                <Badge variant="outline" className="text-xs">
                  {ind.source}
                </Badge>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">
                  {ind.rate_value.toFixed(2)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Ref: {new Date(ind.reference_date).toLocaleDateString("pt-BR")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/app/finance/linhas-credito">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Landmark className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Linhas de Crédito</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Explore {creditLines.data?.pagination?.total ?? "..."} linhas de crédito agrícola disponíveis
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/app/finance/simulador">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Calculator className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Simulador</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Simule CPR, LCA e compare com crédito tradicional
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/app/finance/analise">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Análise & Comparação</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Compare linhas e receba recomendações personalizadas
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Top Credit Lines */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Melhores Taxas</CardTitle>
            <CardDescription>Linhas de crédito com menores taxas de juros</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/app/finance/linhas-credito">
              Ver todas <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {creditLines.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {creditLines.data?.data?.map((cl) => (
                <div
                  key={cl.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{cl.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {cl.program_type && (
                        <Badge variant="secondary" className="text-xs">
                          {programTypeLabel[cl.program_type] || cl.program_type}
                        </Badge>
                      )}
                      {cl.target_audience && (
                        <Badge variant="outline" className="text-xs">
                          {audienceLabel[cl.target_audience] || cl.target_audience}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-bold text-primary">
                      {cl.interest_rate_min != null
                        ? `${cl.interest_rate_min}%`
                        : "-"}
                      {cl.interest_rate_max != null && cl.interest_rate_max !== cl.interest_rate_min
                        ? ` - ${cl.interest_rate_max}%`
                        : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">a.a.</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
