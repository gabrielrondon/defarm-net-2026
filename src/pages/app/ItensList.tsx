import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  Package, 
  MoreHorizontal,
  QrCode,
  ExternalLink,
  Filter,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  GitBranch,
  Calendar,
  AlertTriangle,
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
import { getItems, updateItemStatus, Item } from "@/lib/defarm-api";
import { PushToCircuitDialog } from "@/components/item-detail/PushToCircuitDialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function ItensList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "deprecated">("all");
  const [pushDialogItem, setPushDialogItem] = useState<Item | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading, error, refetch } = useQuery({
    queryKey: ["items"],
    queryFn: () => getItems(),
  });

  const depreciateMutation = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      updateItemStatus(id, { status: "deprecated", user_id: user?.id || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast({ title: "Item depreciado", description: "O status foi atualizado." });
    },
    onError: (err) => {
      toast({
        title: "Erro ao depreciar",
        description: err instanceof Error ? err.message : "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const filteredItems = items.filter((item) => {
    const matchesSearch = 
      (item.dfid || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.value_chain || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.country || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && item.status === "Active") ||
      (statusFilter === "deprecated" && item.status === "Deprecated");
    return matchesSearch && matchesStatus;
  });

  const tokenizedCount = items.filter(i => i.dfid?.startsWith("DFID-")).length;
  const activeCount = items.filter(i => i.status === "Active").length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando itens...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Erro ao carregar itens
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
            placeholder="Buscar por DFID, cadeia, país..."
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
          <p className="text-2xl font-bold text-foreground">{items.length}</p>
          <p className="text-sm text-muted-foreground">Total de itens</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <p className="text-2xl font-bold text-foreground">{tokenizedCount}</p>
          <p className="text-sm text-muted-foreground">Tokenizados</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <p className="text-2xl font-bold text-foreground">{activeCount}</p>
          <p className="text-sm text-muted-foreground">Ativos</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <p className="text-2xl font-bold text-foreground">{items.length - tokenizedCount}</p>
          <p className="text-sm text-muted-foreground">Pendentes</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-background border border-border rounded-2xl overflow-hidden">
        {filteredItems.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>DFID / Identificador</TableHead>
                <TableHead>Cadeia / País</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => {
                const isTokenized = item.dfid?.startsWith("DFID-");
                
                return (
                  <TableRow key={item.id} className="group cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/app/itens/${item.id}`)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          isTokenized ? "bg-primary/10" : "bg-muted"
                        )}>
                          {isTokenized ? (
                            <QrCode className="h-4 w-4 text-primary" />
                          ) : (
                            <Package className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-mono text-sm font-medium text-foreground">
                            {(item.dfid || "").length > 24 ? `${item.dfid.slice(0, 24)}...` : item.dfid}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isTokenized ? "Tokenizado" : "Local (não tokenizado)"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.value_chain && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                            {item.value_chain}
                          </span>
                        )}
                        {item.country && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                            {item.country}
                          </span>
                        )}
                        {item.year && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                            {item.year}
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
                        {item.status === "Active" ? "Ativo" : item.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(item.registered_at).toLocaleDateString("pt-BR")}
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
                          <DropdownMenuItem asChild>
                            <Link to={`/app/itens/${item.id}`} className="flex items-center">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Ver detalhes
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setPushDialogItem(item)}>
                            <GitBranch className="h-4 w-4 mr-2" />
                            Enviar para circuito
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/app/itens/${item.id}`)}>
                            <Calendar className="h-4 w-4 mr-2" />
                            Ver eventos
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => depreciateMutation.mutate({ id: item.id })}
                          >
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Depreciar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
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

      {/* Push to Circuit Dialog */}
      {pushDialogItem && (
        <PushToCircuitDialog
          item={pushDialogItem}
          open={!!pushDialogItem}
          onOpenChange={(open) => {
            if (!open) setPushDialogItem(null);
          }}
        />
      )}
    </div>
  );
}
