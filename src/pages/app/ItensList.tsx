import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BulkImportDialog } from "@/components/BulkImportDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  Package, 
  MoreHorizontal,
  Upload,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getItems, getItem, getCircuits, getCircuitItems, getItemAnchors, updateItemStatus, Item } from "@/lib/defarm-api";
import { PushToCircuitDialog } from "@/components/item-detail/PushToCircuitDialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { AdapterAnchorsResponse, ItemDetailsResponse } from "@/lib/api/types";

export default function ItensList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "deprecated">("all");
  const [pushDialogItem, setPushDialogItem] = useState<Item | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading, error, refetch } = useQuery({
    queryKey: ["items"],
    queryFn: () => getItems(),
  });

  // Fetch all circuits to build item→circuit mapping
  const { data: circuits = [] } = useQuery({
    queryKey: ["circuits"],
    queryFn: () => getCircuits(),
  });

  // Fetch circuit items for each circuit to build reverse map
  const { data: circuitItemsMap = {} } = useQuery({
    queryKey: ["allCircuitItems", circuits.map(c => c.id).join(",")],
    queryFn: async () => {
      const map: Record<string, { id: string; name: string }[]> = {};
      const results = await Promise.allSettled(
        circuits.map(async (circuit) => {
          const circuitItems = await getCircuitItems(circuit.id);
          return { circuit, items: circuitItems };
        })
      );
      results.forEach((result) => {
        if (result.status === "fulfilled") {
          const { circuit, items: cItems } = result.value;
          cItems.forEach((item) => {
            if (!map[item.id]) map[item.id] = [];
            map[item.id].push({ id: circuit.id, name: circuit.name });
          });
        }
      });
      return map;
    },
    enabled: circuits.length > 0,
  });

  // Fetch details (identifiers) for items
  const { data: itemDetailsMap = {} } = useQuery({
    queryKey: ["itemDetails", items.map(i => i.id).join(",")],
    queryFn: async () => {
      const details: Record<string, ItemDetailsResponse> = {};
      const itemsToFetch = items.slice(0, 30);
      const results = await Promise.allSettled(
        itemsToFetch.map(item => getItem(item.id))
      );
      results.forEach((result, i) => {
        if (result.status === "fulfilled") {
          details[itemsToFetch[i].id] = result.value;
        }
      });
      return details;
    },
    enabled: items.length > 0,
  });

  // Fetch anchors for items
  const { data: itemAnchorsMap = {} } = useQuery({
    queryKey: ["itemAnchors", items.map(i => i.id).join(",")],
    queryFn: async () => {
      const anchors: Record<string, AdapterAnchorsResponse> = {};
      const itemsToFetch = items.slice(0, 30);
      const results = await Promise.allSettled(
        itemsToFetch.map(item => getItemAnchors(item.id))
      );
      results.forEach((result, i) => {
        if (result.status === "fulfilled") {
          anchors[itemsToFetch[i].id] = result.value;
        }
      });
      return anchors;
    },
    enabled: items.length > 0,
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
            Todos os itens rastreados nos circuitos do seu workspace
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar CSV/JSON
          </Button>
          <Link to="/app/itens/novo">
            <Button className="btn-offset bg-primary hover:bg-primary text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Novo Item
            </Button>
          </Link>
        </div>
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
          <p className="text-2xl font-bold text-foreground">{circuits.length}</p>
          <p className="text-sm text-muted-foreground">Circuitos</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-background border border-border rounded-2xl overflow-hidden">
        {filteredItems.length > 0 ? (
          <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>DFID</TableHead>
                <TableHead>Identificadores</TableHead>
                <TableHead>Cadeia / País</TableHead>
                <TableHead>Circuito(s)</TableHead>
                <TableHead>Anchors</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Atualização</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => {
                const details = itemDetailsMap[item.id];
                const anchors = itemAnchorsMap[item.id];
                const allIdentifiers = details?.identifiers || [];
                const stellarAnchors = anchors?.blockchain_anchors || [];
                const ipfsRefs = anchors?.storage_refs || [];
                const latestStellar = stellarAnchors[0];
                const latestIpfs = ipfsRefs[0];
                const itemCircuits = circuitItemsMap[item.id] || [];
                const isTokenized = item.dfid?.startsWith("DFID-");

                return (
                  <TableRow
                    key={item.id}
                    className="group cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/app/itens/${item.id}`)}
                  >
                    {/* DFID */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          isTokenized ? "bg-primary/10" : "bg-muted"
                        )}>
                          <QrCode className={cn("h-4 w-4", isTokenized ? "text-primary" : "text-muted-foreground")} />
                        </div>
                        <p className="font-mono text-sm font-medium text-foreground">
                          {(item.dfid || "").length > 20 ? `${item.dfid.slice(0, 20)}...` : item.dfid}
                        </p>
                      </div>
                    </TableCell>

                    {/* Identificadores */}
                    <TableCell>
                      {allIdentifiers.length > 0 ? (
                        <div className="space-y-1">
                          {allIdentifiers.slice(0, 2).map((ident, idx) => (
                            <div key={idx} className="space-y-0.5">
                              <span className={cn(
                                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                                ident.is_canonical ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                              )}>
                                {ident.identifier_type}
                                {ident.is_canonical && " ★"}
                              </span>
                              <p className="font-mono text-xs text-muted-foreground">
                                {(ident.value || "").length > 16 ? `${(ident.value || "").slice(0, 16)}...` : ident.value || ""}
                              </p>
                            </div>
                          ))}
                          {allIdentifiers.length > 2 && (
                            <span className="text-[10px] text-muted-foreground">+{allIdentifiers.length - 2} mais</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    {/* Cadeia / País */}
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
                      </div>
                    </TableCell>

                    {/* Circuito(s) */}
                    <TableCell>
                      {itemCircuits.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {itemCircuits.slice(0, 2).map((c) => (
                            <Tooltip key={c.id}>
                              <TooltipTrigger asChild>
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-primary/10 text-primary cursor-pointer hover:bg-primary/20 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/app/circuitos/${c.id}`);
                                  }}
                                >
                                  <GitBranch className="h-3 w-3" />
                                  {c.name.length > 12 ? `${c.name.slice(0, 12)}...` : c.name}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">{c.name}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                          {itemCircuits.length > 2 && (
                            <span className="text-[10px] text-muted-foreground self-center">+{itemCircuits.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    {/* Anchors */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {latestStellar && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a
                                href={`https://stellar.expert/explorer/public/tx/${latestStellar.transaction_hash || ""}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Stellar
                              </a>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-mono text-xs">{(latestStellar.transaction_hash || "").slice(0, 20)}...</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {latestIpfs && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a
                                href={latestIpfs.gateway_url || `https://gateway.pinata.cloud/ipfs/${(latestIpfs as any).content_id || latestIpfs.cid || ""}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
                              >
                                <ExternalLink className="h-3 w-3" />
                                IPFS
                              </a>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-mono text-xs">{((latestIpfs as any).content_id || latestIpfs.cid || "").slice(0, 20)}...</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {!latestStellar && !latestIpfs && (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Status */}
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
                        {item.status === "Active" ? "active" : item.status?.toLowerCase() || "unknown"}
                      </span>
                    </TableCell>

                    {/* Atualização */}
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(item.updated_at || item.registered_at || item.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </TableCell>

                    {/* Actions */}
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
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setPushDialogItem(item); }}>
                            <GitBranch className="h-4 w-4 mr-2" />
                            Enviar para circuito
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => { e.stopPropagation(); depreciateMutation.mutate({ id: item.id }); }}
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
          </TooltipProvider>
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

      <BulkImportDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
