import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  GitBranch, 
  Users, 
  Package,
  MoreHorizontal,
  Globe,
  Lock,
  ArrowRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getCircuits } from "@/lib/defarm-api";

export default function CircuitosList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  const { data: circuits = [], isLoading, error, refetch } = useQuery({
    queryKey: ["circuits"],
    queryFn: () => getCircuits(),
  });

  const filteredCircuits = circuits.filter((circuit) => {
    const matchesSearch = circuit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (circuit.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === "all" || 
      (filter === "active" && circuit.status === "Active") ||
      (filter === "inactive" && circuit.status === "Inactive");
    return matchesSearch && matchesFilter;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando circuitos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Erro ao carregar circuitos
        </h1>
        <p className="text-muted-foreground mb-6">
          {error instanceof Error ? error.message : "Tente novamente mais tarde"}
        </p>
        <Button onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Circuitos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seus circuitos de compartilhamento de dados
          </p>
        </div>
        <Link to="/app/circuitos/novo">
          <Button className="btn-offset bg-primary hover:bg-primary text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" />
            Novo Circuito
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar circuitos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "active", "inactive"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className={cn(filter === f && "bg-primary hover:bg-primary")}
            >
              {f === "all" ? "Todos" : f === "active" ? "Ativos" : "Inativos"}
            </Button>
          ))}
        </div>
      </div>

      {/* Circuit grid */}
      {filteredCircuits.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCircuits.map((circuit) => (
            <div
              key={circuit.id}
              className="bg-background border border-border rounded-2xl p-6 hover:border-primary/50 transition-colors group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <GitBranch className="h-6 w-6 text-primary" />
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                    circuit.status === "Active" 
                      ? "bg-primary/10 text-primary" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      circuit.status === "Active" ? "bg-primary" : "bg-muted-foreground"
                    )} />
                    {circuit.status === "Active" ? "Ativo" : "Inativo"}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Editar</DropdownMenuItem>
                      <DropdownMenuItem>Gerenciar membros</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                  <Package className="h-4 w-4" />
                  {circuit.circuit_type || "Standard"}
                </span>
                <span className="flex items-center gap-1">
                  {circuit.visibility === "public" ? (
                    <Globe className="h-4 w-4" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  {circuit.visibility === "public" ? "Público" : "Privado"}
                </span>
              </div>

              <Link to={`/app/circuitos/${circuit.id}`}>
                <Button variant="outline" className="w-full group-hover:border-primary group-hover:text-primary">
                  Ver detalhes
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Nenhum circuito encontrado
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? "Tente uma busca diferente" : "Crie seu primeiro circuito para começar"}
          </p>
          <Link to="/app/circuitos/novo">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Criar Circuito
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
