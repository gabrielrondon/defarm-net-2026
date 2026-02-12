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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPublicCircuits } from "@/lib/defarm-api";

export default function CircuitDiscovery() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: circuits = [], isLoading, error } = useQuery({
    queryKey: ["publicCircuits"],
    queryFn: () => getPublicCircuits(),
    retry: 1,
  });

  const filtered = circuits.filter((c: any) =>
    (c.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((circuit: any) => (
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
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  <Globe className="h-3 w-3" />
                  Público
                </span>
              </div>

              <h3 className="text-lg font-semibold text-foreground mb-1 line-clamp-1">
                {circuit.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {circuit.public_description || circuit.description || "Sem descrição"}
              </p>

              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                {circuit.view_count !== undefined && (
                  <span className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {circuit.view_count} views
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  {circuit.circuit_type || "Standard"}
                </span>
              </div>

              <Link to={`/c/${circuit.slug || circuit.id}`}>
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
    </div>
  );
}
