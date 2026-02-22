import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Search, Database, BarChart3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { searchItems, searchByIdentifier, getAnalyticsKpis, getBlockchainMetrics } from "@/lib/defarm-api";

export default function AdminSearchAnalytics() {
  const [query, setQuery] = useState("BEEF");
  const [identifierType, setIdentifierType] = useState("SISBOV");
  const [identifierValue, setIdentifierValue] = useState("");

  const kpisQuery = useQuery({
    queryKey: ["analytics-kpis"],
    queryFn: getAnalyticsKpis,
  });

  const blockchainQuery = useQuery({
    queryKey: ["analytics-blockchain"],
    queryFn: () => getBlockchainMetrics({ days: 30 }),
  });

  const searchMutation = useMutation({
    mutationFn: () => searchItems({ query, page_size: 10 }),
  });

  const identifierMutation = useMutation({
    mutationFn: () => searchByIdentifier(identifierType, identifierValue),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Search & Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              KPIs
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {kpisQuery.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : kpisQuery.data ? (
              <div className="space-y-1">
                <p>Itens ativos: {kpisQuery.data.active_items}</p>
                <p>Itens 24h: {kpisQuery.data.items_24h}</p>
                <p>Circuitos ativos: {kpisQuery.data.active_circuits}</p>
                <p>Eventos 1h: {kpisQuery.data.events_1h}</p>
              </div>
            ) : (
              <p className="text-muted-foreground">Sem dados.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Blockchain Metrics (30d)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {blockchainQuery.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : blockchainQuery.data ? (
              <div className="space-y-1">
                <p>Total anchors: {blockchainQuery.data.total_anchors}</p>
                <p>Confirmados: {blockchainQuery.data.confirmed_anchors}</p>
                <p>Falhos: {blockchainQuery.data.failed_anchors}</p>
                <p>Sucesso: {blockchainQuery.data.success_rate.toFixed(1)}%</p>
              </div>
            ) : (
              <p className="text-muted-foreground">Sem dados.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            Busca textual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ex.: BEEF, CAR, lote..." />
            <Button onClick={() => searchMutation.mutate()} disabled={searchMutation.isPending}>
              {searchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
            </Button>
          </div>
          {searchMutation.data && (
            <p className="text-sm text-muted-foreground">
              {searchMutation.data.total} resultados (mostrando {searchMutation.data.results.length})
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Busca por identificador</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Input value={identifierType} onChange={(e) => setIdentifierType(e.target.value.toUpperCase())} placeholder="SISBOV" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Valor</Label>
              <Input value={identifierValue} onChange={(e) => setIdentifierValue(e.target.value)} placeholder="10550048..." />
            </div>
          </div>
          <Button onClick={() => identifierMutation.mutate()} disabled={identifierMutation.isPending || !identifierValue}>
            {identifierMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar identificador"}
          </Button>
          {identifierMutation.data && (
            <p className="text-sm text-muted-foreground">
              {identifierMutation.data.length} resultado(s) encontrado(s)
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
