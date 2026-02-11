import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Calculator, Wheat, Landmark } from "lucide-react";
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
import { calculateCPR, simulateHarvestAdvance, calculateLCA } from "@/lib/finance-api";
import type { CPRCalculateResponse, CPRSimulateResponse, LCACalculateResponse } from "@/lib/finance-api";

const formatBRL = (val: number | undefined) =>
  (val ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function FinanceSimulador() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Calculator className="h-6 w-6" />
          Simulador Financeiro
        </h1>
        <p className="text-muted-foreground">
          Simule CPR, LCA e cenários de antecipação de safra
        </p>
      </div>

      <Tabs defaultValue="cpr" className="space-y-6">
        <TabsList>
          <TabsTrigger value="cpr">CPR</TabsTrigger>
          <TabsTrigger value="advance">Antecipação Safra</TabsTrigger>
          <TabsTrigger value="lca">LCA</TabsTrigger>
        </TabsList>

        <TabsContent value="cpr">
          <CPRSimulator />
        </TabsContent>
        <TabsContent value="advance">
          <AdvanceSimulator />
        </TabsContent>
        <TabsContent value="lca">
          <LCASimulator />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CPRSimulator() {
  const [form, setForm] = useState({
    product: "soja",
    quantity: 1000,
    expected_price: 150,
    days_to_maturity: 180,
    discount_rate: 12.5,
  });

  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: () => calculateCPR(form),
    onError: (err: any) => {
      toast({ title: "Erro no cálculo", description: err?.message || "Falha ao calcular CPR", variant: "destructive" });
    },
  });

  const result = mutation.data;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wheat className="h-5 w-5" />
            Calculadora CPR
          </CardTitle>
          <CardDescription>
            Cédula de Produto Rural — calcule valor presente e taxa efetiva
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Produto</Label>
              <Select
                value={form.product}
                onValueChange={(v: any) => setForm((p) => ({ ...p, product: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="soja">Soja</SelectItem>
                  <SelectItem value="milho">Milho</SelectItem>
                  <SelectItem value="cafe">Café</SelectItem>
                  <SelectItem value="algodao">Algodão</SelectItem>
                  <SelectItem value="boi">Boi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantidade (ton)</Label>
              <Input
                type="number"
                value={form.quantity}
                onChange={(e) => setForm((p) => ({ ...p, quantity: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Preço/ton (R$)</Label>
              <Input
                type="number"
                value={form.expected_price}
                onChange={(e) => setForm((p) => ({ ...p, expected_price: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Dias até vencimento</Label>
              <Input
                type="number"
                value={form.days_to_maturity}
                onChange={(e) => setForm((p) => ({ ...p, days_to_maturity: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Taxa de desconto anual (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={form.discount_rate}
              onChange={(e) => setForm((p) => ({ ...p, discount_rate: Number(e.target.value) }))}
            />
          </div>
          <Button
            className="w-full"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Calculando..." : "Calcular CPR"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado da Simulação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Valor Futuro</p>
                <p className="text-xl font-bold text-foreground">{formatBRL(result.future_value)}</p>
              </div>
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Valor Presente</p>
                <p className="text-xl font-bold text-primary">{formatBRL(result.present_value)}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Desconto</p>
                <p className="text-xl font-bold text-destructive">{formatBRL(result.discount_amount)}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Taxa Efetiva</p>
                <p className="text-xl font-bold text-foreground">{result.effective_rate.toFixed(2)}%</p>
              </div>
            </div>
            {result.recommendation && (
              <div className="p-3 border rounded-lg">
                <p className="text-sm text-muted-foreground">💡 Recomendação</p>
                <p className="text-sm text-foreground mt-1">{result.recommendation}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AdvanceSimulator() {
  const [form, setForm] = useState({
    product: "soja",
    quantity: 1000,
    current_price: 140,
    expected_price: 150,
    days_to_harvest: 180,
    discount_rates: [8, 10, 12.5, 15, 17.5],
  });

  const mutation = useMutation({
    mutationFn: () => simulateHarvestAdvance(form),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Simulação de Antecipação de Safra</CardTitle>
          <CardDescription>
            Compare múltiplos cenários de desconto para planejar o financiamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Produto</Label>
              <Select
                value={form.product}
                onValueChange={(v: any) => setForm((p) => ({ ...p, product: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="soja">Soja</SelectItem>
                  <SelectItem value="milho">Milho</SelectItem>
                  <SelectItem value="cafe">Café</SelectItem>
                  <SelectItem value="algodao">Algodão</SelectItem>
                  <SelectItem value="boi">Boi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantidade (ton)</Label>
              <Input
                type="number"
                value={form.quantity}
                onChange={(e) => setForm((p) => ({ ...p, quantity: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Preço atual (R$/ton)</Label>
              <Input
                type="number"
                value={form.current_price}
                onChange={(e) => setForm((p) => ({ ...p, current_price: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Preço esperado (R$/ton)</Label>
              <Input
                type="number"
                value={form.expected_price}
                onChange={(e) => setForm((p) => ({ ...p, expected_price: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Dias até colheita</Label>
              <Input
                type="number"
                value={form.days_to_harvest}
                onChange={(e) => setForm((p) => ({ ...p, days_to_harvest: Number(e.target.value) }))}
              />
            </div>
          </div>
          <Button
            className="w-full"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Simulando..." : "Simular Cenários"}
          </Button>
        </CardContent>
      </Card>

      {mutation.data && (
        <Card>
          <CardHeader>
            <CardTitle>Cenários de Desconto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Taxa Desconto</th>
                    <th className="text-right py-3 px-2">Valor Presente</th>
                    <th className="text-right py-3 px-2">Desconto</th>
                    <th className="text-right py-3 px-2">Taxa Efetiva</th>
                    <th className="text-left py-3 px-2">Recomendação</th>
                  </tr>
                </thead>
                <tbody>
                  {mutation.data.scenarios.map((s, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-3 px-2 font-medium">{s.discount_rate}%</td>
                      <td className="py-3 px-2 text-right">{formatBRL(s.present_value)}</td>
                      <td className="py-3 px-2 text-right text-destructive">{formatBRL(s.discount_amount)}</td>
                      <td className="py-3 px-2 text-right">{s.effective_rate.toFixed(2)}%</td>
                      <td className="py-3 px-2 text-muted-foreground text-xs max-w-[200px]">{s.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LCASimulator() {
  const [form, setForm] = useState({
    investment_amount: 50000,
    maturity_months: 24,
    interest_type: "pos" as const,
    cdi_percentage: 95,
    cdi_rate: 13.75,
    is_legal_entity: false,
  });

  const mutation = useMutation({
    mutationFn: () => calculateLCA(form),
  });

  const result = mutation.data;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            Calculadora LCA
          </CardTitle>
          <CardDescription>
            Letra de Crédito do Agronegócio — isenta de IR para pessoa física
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Investimento (R$)</Label>
              <Input
                type="number"
                value={form.investment_amount}
                onChange={(e) => setForm((p) => ({ ...p, investment_amount: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Prazo (meses)</Label>
              <Input
                type="number"
                value={form.maturity_months}
                onChange={(e) => setForm((p) => ({ ...p, maturity_months: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tipo de taxa</Label>
            <Select
              value={form.interest_type}
              onValueChange={(v: any) => setForm((p) => ({ ...p, interest_type: v }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pre">Prefixada</SelectItem>
                <SelectItem value="pos">Pós-fixada (% CDI)</SelectItem>
                <SelectItem value="hybrid">Híbrida (IPCA +)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.interest_type === "pos" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>% do CDI</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={form.cdi_percentage}
                  onChange={(e) => setForm((p) => ({ ...p, cdi_percentage: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>CDI atual (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.cdi_rate}
                  onChange={(e) => setForm((p) => ({ ...p, cdi_rate: Number(e.target.value) }))}
                />
              </div>
            </div>
          )}
          <Button
            className="w-full"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Calculando..." : "Calcular LCA"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado LCA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Investimento</p>
                <p className="text-xl font-bold text-foreground">{formatBRL(result.investment_amount)}</p>
              </div>
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Valor Final</p>
                <p className="text-xl font-bold text-primary">{formatBRL(result.final_amount)}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Retorno Líquido</p>
                <p className="text-xl font-bold text-emerald-600">{formatBRL(result.net_return)}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Taxa Efetiva</p>
                <p className="text-xl font-bold text-foreground">{result.effective_rate.toFixed(2)}% a.a.</p>
              </div>
            </div>
            {result.ir_amount === 0 && (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                ✨ Isento de IR (Pessoa Física)
              </Badge>
            )}
            {result.recommendation && (
              <div className="p-3 border rounded-lg">
                <p className="text-sm text-muted-foreground">💡 Recomendação</p>
                <p className="text-sm text-foreground mt-1">{result.recommendation}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
