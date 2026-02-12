import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Search,
  Globe,
  GitBranch,
  Users,
  Eye,
  Package,
  Loader2,
  ArrowRight,
  Compass,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPublicCircuits } from "@/lib/defarm-api";
import type { PublicCircuitInfo } from "@/lib/api/types";

export default function CircuitDiscovery() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["publicCircuits", searchQuery],
    queryFn: () => getPublicCircuits({ search: searchQuery || undefined }),
    retry: 1,
  });

  const circuits = data?.circuits ?? [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Compass className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Descobrir Circuitos</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          Explore circuitos públicos e solicite participação
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar circuitos públicos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Buscando circuitos públicos...</p>
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Erro ao carregar circuitos públicos
          </h3>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : "Tente novamente mais tarde"}
          </p>
        </div>
      ) : circuits.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {circuits.map((circuit: PublicCircuitInfo) => (
            <div
              key={circuit.id}
              className="bg-background border border-border rounded-2xl p-6 hover:border-primary/50 transition-colors group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  {circuit.public_logo_url ? (
                    <img
                      src={circuit.public_logo_url}
                      alt={circuit.name}
                      className="h-8 w-8 rounded-lg object-cover"
                    />
                  ) : (
                    <GitBranch className="h-6 w-6 text-primary" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {circuit.featured && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600">
                      <Star className="h-3 w-3" />
                      Destaque
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    <Globe className="h-3 w-3" />
                    Público
                  </span>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-foreground mb-1 line-clamp-1">
                {circuit.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {circuit.description || "Sem descrição"}
              </p>

              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {circuit.member_count} membros
                </span>
                <span className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  {circuit.item_count} itens
                </span>
              </div>

              <Link to={`/c/${circuit.public_slug || circuit.id}`}>
                <Button
                  variant="outline"
                  className="w-full group-hover:border-primary group-hover:text-primary"
                >
                  Ver portfólio
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Compass className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {searchQuery ? "Nenhum circuito encontrado" : "Nenhum circuito público disponível"}
          </h3>
          <p className="text-muted-foreground">
            {searchQuery
              ? "Tente uma busca diferente"
              : "Circuitos públicos aparecerão aqui quando disponíveis"}
          </p>
        </div>
      )}

      {data && data.total > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Mostrando {circuits.length} de {data.total} circuitos públicos
        </p>
      )}
    </div>
  );
}
