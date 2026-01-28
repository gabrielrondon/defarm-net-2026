import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Plus, 
  Search, 
  Package, 
  MoreHorizontal,
  QrCode,
  ExternalLink,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Mock data for demo
const mockItems = [
  {
    dfid: "DFID-20260128-000142-A1B2",
    identifiers: [
      { key: "sisbov", value: "BR12345678901234" },
      { key: "brinco", value: "042" },
    ],
    status: "Active" as const,
    circuits: ["Cadeia Bovina Orgânica"],
    tokenized: true,
    createdAt: "2026-01-28T10:30:00Z",
  },
  {
    dfid: "DFID-20260127-000141-C3D4",
    identifiers: [
      { key: "sisbov", value: "BR98765432109876" },
      { key: "lote", value: "L2026-01" },
    ],
    status: "Active" as const,
    circuits: ["Exportação UE - EUDR"],
    tokenized: true,
    createdAt: "2026-01-27T14:22:00Z",
  },
  {
    dfid: "LID-abc123-def456",
    identifiers: [
      { key: "brinco", value: "087" },
    ],
    status: "Active" as const,
    circuits: [],
    tokenized: false,
    createdAt: "2026-01-26T09:15:00Z",
  },
  {
    dfid: "DFID-20260125-000139-E5F6",
    identifiers: [
      { key: "sisbov", value: "BR11223344556677" },
      { key: "gta", value: "GTA-2026-001" },
    ],
    status: "Deprecated" as const,
    circuits: ["Frigorífico Central"],
    tokenized: true,
    createdAt: "2026-01-25T16:45:00Z",
  },
];

export default function ItensList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "deprecated">("all");

  const filteredItems = mockItems.filter((item) => {
    const matchesSearch = 
      item.dfid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.identifiers.some(id => 
        id.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
        id.key.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && item.status === "Active") ||
      (statusFilter === "deprecated" && item.status === "Deprecated");
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Itens</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seus itens rastreados e tokenizados
          </p>
        </div>
        <Link to="/app/itens/novo">
          <Button className="btn-offset bg-primary hover:bg-primary text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" />
            Novo Item
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por DFID, SISBOV, brinco..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Status: {statusFilter === "all" ? "Todos" : statusFilter === "active" ? "Ativos" : "Deprecated"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setStatusFilter("all")}>Todos</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("active")}>Ativos</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("deprecated")}>Deprecated</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-background border border-border rounded-xl p-4">
          <p className="text-2xl font-bold text-foreground">{mockItems.length}</p>
          <p className="text-sm text-muted-foreground">Total de itens</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <p className="text-2xl font-bold text-foreground">
            {mockItems.filter(i => i.tokenized).length}
          </p>
          <p className="text-sm text-muted-foreground">Tokenizados</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <p className="text-2xl font-bold text-foreground">
            {mockItems.filter(i => i.circuits.length > 0).length}
          </p>
          <p className="text-sm text-muted-foreground">Em circuitos</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <p className="text-2xl font-bold text-foreground">
            {mockItems.filter(i => !i.tokenized).length}
          </p>
          <p className="text-sm text-muted-foreground">Pendentes</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-background border border-border rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>DFID / Identificador</TableHead>
              <TableHead>Identificadores</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Circuitos</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow key={item.dfid} className="group">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      item.tokenized ? "bg-primary/10" : "bg-muted"
                    )}>
                      {item.tokenized ? (
                        <QrCode className="h-4 w-4 text-primary" />
                      ) : (
                        <Package className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-mono text-sm font-medium text-foreground">
                        {item.dfid.length > 20 ? `${item.dfid.slice(0, 20)}...` : item.dfid}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.tokenized ? "Tokenizado" : "Local (não tokenizado)"}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {item.identifiers.slice(0, 2).map((id, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground"
                      >
                        {id.key}: {id.value.length > 10 ? `${id.value.slice(0, 10)}...` : id.value}
                      </span>
                    ))}
                    {item.identifiers.length > 2 && (
                      <span className="text-xs text-muted-foreground">
                        +{item.identifiers.length - 2}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
                    item.status === "Active" 
                      ? "bg-primary/10 text-primary" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    {item.status === "Active" ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    {item.status === "Active" ? "Ativo" : "Deprecated"}
                  </span>
                </TableCell>
                <TableCell>
                  {item.circuits.length > 0 ? (
                    <span className="text-sm text-foreground">
                      {item.circuits[0]}
                      {item.circuits.length > 1 && ` +${item.circuits.length - 1}`}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Nenhum
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ver detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem>Enviar para circuito</DropdownMenuItem>
                      <DropdownMenuItem>Adicionar evento</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Depreciar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Nenhum item encontrado
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "Tente uma busca diferente" : "Cadastre seu primeiro item"}
            </p>
            <Link to="/app/itens/novo">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Criar Item
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
