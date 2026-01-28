import { useState } from "react";
import { Link } from "react-router-dom";
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

// Mock data for demo
const mockCircuits = [
  {
    id: "circuit-001",
    name: "Cadeia Bovina Orgânica",
    description: "Rastreamento de gado orgânico certificado IBD",
    status: "Active" as const,
    members: 12,
    items: 342,
    isPublic: true,
    createdAt: "2025-11-15",
  },
  {
    id: "circuit-002",
    name: "Exportação UE - EUDR",
    description: "Circuito de compliance para exportação à União Europeia",
    status: "Active" as const,
    members: 8,
    items: 1205,
    isPublic: false,
    createdAt: "2025-10-02",
  },
  {
    id: "circuit-003",
    name: "Frigorífico Central",
    description: "Integração com frigorífico para abate e processamento",
    status: "Active" as const,
    members: 5,
    items: 89,
    isPublic: false,
    createdAt: "2026-01-10",
  },
  {
    id: "circuit-004",
    name: "Cooperativa Regional",
    description: "Circuito compartilhado entre produtores da região",
    status: "Inactive" as const,
    members: 24,
    items: 567,
    isPublic: true,
    createdAt: "2025-08-20",
  },
];

export default function CircuitosList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  const filteredCircuits = mockCircuits.filter((circuit) => {
    const matchesSearch = circuit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      circuit.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === "all" || 
      (filter === "active" && circuit.status === "Active") ||
      (filter === "inactive" && circuit.status === "Inactive");
    return matchesSearch && matchesFilter;
  });

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
              {circuit.description}
            </p>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {circuit.members}
              </span>
              <span className="flex items-center gap-1">
                <Package className="h-4 w-4" />
                {circuit.items}
              </span>
              <span className="flex items-center gap-1">
                {circuit.isPublic ? (
                  <Globe className="h-4 w-4" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                {circuit.isPublic ? "Público" : "Privado"}
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

      {filteredCircuits.length === 0 && (
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
