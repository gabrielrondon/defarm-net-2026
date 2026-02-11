import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Landmark, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listCreditLines } from "@/lib/finance-api";
import type { CreditLineFilters } from "@/lib/finance-api";

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

export default function FinanceCreditLines() {
  const [filters, setFilters] = useState<CreditLineFilters>({
    page: 1,
    limit: 20,
    sort: "rate_asc",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["finance", "credit-lines", filters],
    queryFn: () => listCreditLines(filters),
  });

  const updateFilter = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Landmark className="h-6 w-6" />
          Linhas de Crédito Agrícola
        </h1>
        <p className="text-muted-foreground">
          {data?.pagination?.total ?? "..."} linhas disponíveis de programas públicos e privados
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <Select
              value={filters.program_type || "all"}
              onValueChange={(v) => updateFilter("program_type", v === "all" ? undefined : v)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de Programa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="working_capital">Capital de Giro</SelectItem>
                <SelectItem value="investment">Investimento</SelectItem>
                <SelectItem value="financing">Financiamento</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.target_audience || "all"}
              onValueChange={(v) => updateFilter("target_audience", v === "all" ? undefined : v)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Público-alvo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="family_farmer">Agricultor Familiar</SelectItem>
                <SelectItem value="medium_producer">Médio Produtor</SelectItem>
                <SelectItem value="large_producer">Grande Produtor</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.sort || "rate_asc"}
              onValueChange={(v) => updateFilter("sort", v)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rate_asc">Menor taxa</SelectItem>
                <SelectItem value="rate_desc">Maior taxa</SelectItem>
                <SelectItem value="amount_desc">Maior valor</SelectItem>
                <SelectItem value="amount_asc">Menor valor</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="number"
              placeholder="Taxa máx. (%)"
              className="w-[140px]"
              onChange={(e) =>
                updateFilter("max_interest_rate", e.target.value ? Number(e.target.value) : undefined)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {data?.data?.map((cl) => (
            <Card key={cl.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">{cl.name}</h3>
                    {cl.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {cl.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {cl.program_type && (
                        <Badge variant="secondary">
                          {programTypeLabel[cl.program_type] || cl.program_type}
                        </Badge>
                      )}
                      {cl.target_audience && (
                        <Badge variant="outline">
                          {audienceLabel[cl.target_audience] || cl.target_audience}
                        </Badge>
                      )}
                      {cl.data_source && (
                        <Badge variant="outline" className="text-xs">
                          {cl.data_source.replace("_", " ").toUpperCase()}
                        </Badge>
                      )}
                      {cl.available_regions && cl.available_regions.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          📍 {cl.available_regions.slice(0, 5).join(", ")}
                          {cl.available_regions.length > 5 && ` +${cl.available_regions.length - 5}`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <p className="text-xs text-muted-foreground">Taxa de Juros</p>
                      <p className="text-xl font-bold text-primary">
                        {cl.interest_rate_min != null ? `${cl.interest_rate_min}%` : "-"}
                        {cl.interest_rate_max != null && cl.interest_rate_max !== cl.interest_rate_min
                          ? ` - ${cl.interest_rate_max}%`
                          : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">a.a.</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Valor Máx.</p>
                      <p className="font-semibold text-foreground">
                        {cl.max_amount
                          ? `R$ ${cl.max_amount.toLocaleString("pt-BR")}`
                          : "-"}
                      </p>
                    </div>
                    {cl.max_term_months && (
                      <div>
                        <p className="text-xs text-muted-foreground">Prazo</p>
                        <p className="font-semibold text-foreground">
                          {cl.max_term_months} meses
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data?.pagination && data.pagination.total_pages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            disabled={!data.pagination.has_prev}
            onClick={() => setFilters((p) => ({ ...p, page: (p.page || 1) - 1 }))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {data.pagination.page} de {data.pagination.total_pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!data.pagination.has_next}
            onClick={() => setFilters((p) => ({ ...p, page: (p.page || 1) + 1 }))}
          >
            Próxima <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
