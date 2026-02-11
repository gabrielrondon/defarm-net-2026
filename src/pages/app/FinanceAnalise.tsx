import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BarChart3, Sparkles, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  listCreditLines,
  compareCreditLinesAnalysis,
  getRecommendations,
  listLCAs,
  listCRAs,
} from "@/lib/finance-api";
import type { CompareAnalysisResponse, RecommendationItem, LCAItem, CRAItem } from "@/lib/finance-api";

const formatBRL = (val: number) =>
  val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function FinanceAnalise() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Análise & Comparação
        </h1>
        <p className="text-muted-foreground">
          Compare linhas de crédito, LCA, CRA e obtenha recomendações personalizadas
        </p>
      </div>

      <Tabs defaultValue="compare" className="space-y-6">
        <TabsList>
          <TabsTrigger value="compare">Comparar Linhas</TabsTrigger>
          <TabsTrigger value="instruments">LCA & CRA</TabsTrigger>
          <TabsTrigger value="recommendations">Recomendações</TabsTrigger>
        </TabsList>

        <TabsContent value="compare"><CompareSection /></TabsContent>
        <TabsContent value="instruments"><InstrumentsSection /></TabsContent>
        <TabsContent value="recommendations"><RecommendationsSection /></TabsContent>
      </Tabs>
    </div>
  );
}

function CompareSection() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [profile, setProfile] = useState({
    producer_type: "family_farmer",
    annual_revenue: 300000,
    state: "RS",
  });

  const creditLines = useQuery({
    queryKey: ["finance", "credit-lines-all"],
    queryFn: () => listCreditLines({ limit: 100 }),
  });

  const compareMutation = useMutation({
    mutationFn: () =>
      compareCreditLinesAnalysis({
        credit_line_ids: selectedIds,
        user_profile: {
          producer_type: profile.producer_type,
          annual_revenue: profile.annual_revenue,
          state: profile.state,
        },
      }),
  });

  const result = compareMutation.data;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Selecione até 5 linhas para comparar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo de produtor</Label>
              <Select
                value={profile.producer_type}
                onValueChange={(v) => setProfile((p) => ({ ...p, producer_type: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="family_farmer">Agricultor Familiar</SelectItem>
                  <SelectItem value="medium_producer">Médio Produtor</SelectItem>
                  <SelectItem value="large_producer">Grande Produtor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Receita anual (R$)</Label>
              <Input
                type="number"
                value={profile.annual_revenue}
                onChange={(e) => setProfile((p) => ({ ...p, annual_revenue: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Estado (UF)</Label>
              <Input
                value={profile.state}
                maxLength={2}
                className="uppercase"
                onChange={(e) => setProfile((p) => ({ ...p, state: e.target.value.toUpperCase() }))}
              />
            </div>
          </div>

          {creditLines.data?.data && (
            <div className="max-h-60 overflow-y-auto border rounded-lg p-2 space-y-1">
              {creditLines.data.data.map((cl) => (
                <label
                  key={cl.id}
                  className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(cl.id)}
                    onChange={(e) => {
                      if (e.target.checked && selectedIds.length < 5) {
                        setSelectedIds((prev) => [...prev, cl.id]);
                      } else {
                        setSelectedIds((prev) => prev.filter((id) => id !== cl.id));
                      }
                    }}
                    disabled={!selectedIds.includes(cl.id) && selectedIds.length >= 5}
                    className="rounded"
                  />
                  <span className="text-sm flex-1">{cl.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {cl.interest_rate_min != null ? `${cl.interest_rate_min}%` : "-"}
                  </span>
                </label>
              ))}
            </div>
          )}

          <Button
            className="w-full"
            disabled={selectedIds.length < 2 || compareMutation.isPending}
            onClick={() => compareMutation.mutate()}
          >
            {compareMutation.isPending
              ? "Analisando..."
              : `Comparar ${selectedIds.length} linhas`}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          {result.best_match && (
            <Card className="border-primary">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-6 w-6 text-primary" />
                  <div>
                    <h3 className="font-bold text-foreground">
                      Melhor opção: {result.best_match.credit_line_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Score: {result.best_match.score}/200 — {result.best_match.reasons.join("; ")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Menor taxa</p>
                <p className="text-2xl font-bold text-primary">{result.summary.lowest_rate}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Maior taxa</p>
                <p className="text-2xl font-bold text-foreground">{result.summary.highest_rate}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Elegíveis</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {result.summary.eligible_count}/{result.summary.total_compared}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Maior valor</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatBRL(result.summary.largest_max_amount)}
                </p>
              </CardContent>
            </Card>
          </div>

          {result.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recomendações</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-0.5">💡</span>
                      <span className="text-foreground">{r}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function InstrumentsSection() {
  const lcas = useQuery({
    queryKey: ["finance", "lcas"],
    queryFn: () => listLCAs({ limit: 20 }),
  });

  const cras = useQuery({
    queryKey: ["finance", "cras"],
    queryFn: () => listCRAs({ limit: 20 }),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>LCA — Letras de Crédito do Agronegócio</CardTitle>
          <CardDescription>
            {lcas.data?.total ?? "..."} ofertas de bancos • Isentas de IR para PF
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lcas.isLoading ? (
            <div className="h-40 bg-muted rounded animate-pulse" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Emissor</th>
                    <th className="text-left py-2 px-2">Produto</th>
                    <th className="text-right py-2 px-2">Inv. Mín.</th>
                    <th className="text-right py-2 px-2">Taxa/CDI</th>
                    <th className="text-right py-2 px-2">Prazo</th>
                  </tr>
                </thead>
                <tbody>
                  {lcas.data?.lcas?.map((lca) => (
                    <tr key={lca.id} className="border-b last:border-0">
                      <td className="py-2 px-2 font-medium">{lca.issuer}</td>
                      <td className="py-2 px-2 text-muted-foreground">{lca.product_name}</td>
                      <td className="py-2 px-2 text-right">{formatBRL(lca.min_investment)}</td>
                      <td className="py-2 px-2 text-right font-medium text-primary">
                        {lca.interest_type === "pos"
                          ? `${lca.index_percentage}% CDI`
                          : lca.annual_rate
                          ? `${lca.annual_rate}% a.a.`
                          : "-"}
                      </td>
                      <td className="py-2 px-2 text-right">{lca.maturity_months}m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CRA — Certificados de Recebíveis do Agronegócio</CardTitle>
          <CardDescription>
            {cras.data?.total ?? "..."} ofertas de securitizadoras • Isentas de IR para PF
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cras.isLoading ? (
            <div className="h-40 bg-muted rounded animate-pulse" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Securitizadora</th>
                    <th className="text-left py-2 px-2">Série</th>
                    <th className="text-right py-2 px-2">Inv. Mín.</th>
                    <th className="text-right py-2 px-2">Taxa</th>
                    <th className="text-center py-2 px-2">Rating</th>
                    <th className="text-right py-2 px-2">Prazo</th>
                  </tr>
                </thead>
                <tbody>
                  {cras.data?.cras?.map((cra) => (
                    <tr key={cra.id} className="border-b last:border-0">
                      <td className="py-2 px-2 font-medium">{cra.securitizer}</td>
                      <td className="py-2 px-2 text-muted-foreground text-xs">{cra.series}</td>
                      <td className="py-2 px-2 text-right">{formatBRL(cra.min_investment)}</td>
                      <td className="py-2 px-2 text-right font-medium text-primary">
                        {cra.interest_type === "hybrid" && cra.index_spread
                          ? `${cra.index_type} + ${cra.index_spread}%`
                          : cra.interest_rate
                          ? `${cra.interest_rate}% a.a.`
                          : cra.index_percentage
                          ? `${cra.index_percentage}% CDI`
                          : "-"}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <Badge variant="outline">{cra.risk_rating}</Badge>
                      </td>
                      <td className="py-2 px-2 text-right">{cra.maturity_months}m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RecommendationsSection() {
  const [form, setForm] = useState({
    user_type: "medium_producer" as const,
    annual_revenue: 500000,
    investment_capacity: 50000,
    risk_tolerance: "medium" as const,
    state: "RS",
    main_products: ["soja", "milho"],
    needs: ["working_capital", "cash_reserve"],
  });

  const mutation = useMutation({
    mutationFn: () => getRecommendations(form),
  });

  const categoryLabel: Record<string, string> = {
    financing: "Financiamento",
    investment: "Investimento",
    hedging: "Hedge",
    tax_optimization: "Otimização Fiscal",
  };

  const riskColors: Record<string, string> = {
    low: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    high: "bg-red-500/10 text-red-600 border-red-500/20",
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Recomendações Personalizadas
          </CardTitle>
          <CardDescription>
            Preencha seu perfil para receber sugestões inteligentes de instrumentos financeiros
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo de produtor</Label>
              <Select
                value={form.user_type}
                onValueChange={(v: any) => setForm((p) => ({ ...p, user_type: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="family_farmer">Agricultor Familiar</SelectItem>
                  <SelectItem value="medium_producer">Médio Produtor</SelectItem>
                  <SelectItem value="large_producer">Grande Produtor</SelectItem>
                  <SelectItem value="investor">Investidor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Receita anual (R$)</Label>
              <Input
                type="number"
                value={form.annual_revenue}
                onChange={(e) => setForm((p) => ({ ...p, annual_revenue: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Capacidade investimento (R$)</Label>
              <Input
                type="number"
                value={form.investment_capacity}
                onChange={(e) => setForm((p) => ({ ...p, investment_capacity: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tolerância ao risco</Label>
              <Select
                value={form.risk_tolerance}
                onValueChange={(v: any) => setForm((p) => ({ ...p, risk_tolerance: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Conservador</SelectItem>
                  <SelectItem value="medium">Moderado</SelectItem>
                  <SelectItem value="high">Agressivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estado (UF)</Label>
              <Input
                value={form.state}
                maxLength={2}
                className="uppercase"
                onChange={(e) => setForm((p) => ({ ...p, state: e.target.value.toUpperCase() }))}
              />
            </div>
          </div>
          <Button
            className="w-full"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Analisando perfil..." : "Obter Recomendações"}
          </Button>
        </CardContent>
      </Card>

      {mutation.data?.recommendations && (
        <div className="space-y-4">
          {mutation.data.recommendations.map((rec, i) => (
            <Card key={i} className={i === 0 ? "border-primary" : ""}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      #{rec.priority} {categoryLabel[rec.category] || rec.category}
                    </Badge>
                    <Badge className={riskColors[rec.risk_level]}>
                      Risco {rec.risk_level === "low" ? "Baixo" : rec.risk_level === "medium" ? "Médio" : "Alto"}
                    </Badge>
                  </div>
                  <span className="text-lg font-bold text-primary">
                    {rec.expected_rate.toFixed(1)}% a.a.
                  </span>
                </div>
                <h3 className="font-semibold text-foreground">{rec.instrument_name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{rec.why}</p>
                {rec.action_steps?.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {rec.action_steps.map((step, j) => (
                      <div key={j} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ArrowRight className="h-3 w-3 text-primary" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
