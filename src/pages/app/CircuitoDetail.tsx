import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  GitBranch,
  Users,
  Package,
  Globe,
  Lock,
  Pencil,
  MoreHorizontal,
  Plus,
  Search,
  ExternalLink,
  QrCode,
  Loader2,
  Copy,
  CheckCircle2,
  XCircle,
  Shield,
  Trash2,
  UserPlus,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { 
  getCircuit, 
  getCircuitItems, 
  updateItem,
  getItems,
  getItem,
  getItemAnchors,
  Item, 
} from "@/lib/defarm-api";
import { ManageMembersDialog, DeleteCircuitDialog } from "@/components/circuit";
import CircuitAdaptersPanel from "@/components/circuit/CircuitAdaptersPanel";
export default function CircuitoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isPushDialogOpen, setIsPushDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Fetch circuit details
  const { data: circuit, isLoading: isLoadingCircuit, error: circuitError } = useQuery({
    queryKey: ["circuit", id],
    queryFn: () => getCircuit(id!),
    enabled: !!id,
  });

  // Fetch circuit items
  const { data: circuitItems = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ["circuitItems", id],
    queryFn: () => getCircuitItems(id!),
    enabled: !!id,
  });

  // Fetch details (identifiers) for each circuit item
  const { data: itemDetailsMap = {} } = useQuery({
    queryKey: ["circuitItemDetails", id, circuitItems.map(i => i.id).join(",")],
    queryFn: async () => {
      const details: Record<string, Awaited<ReturnType<typeof getItem>>> = {};
      // Fetch details for up to 20 items to avoid too many requests
      const itemsToFetch = circuitItems.slice(0, 20);
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
    enabled: circuitItems.length > 0,
  });

  // Fetch anchors for each circuit item
  const { data: itemAnchorsMap = {} } = useQuery({
    queryKey: ["circuitItemAnchors", id, circuitItems.map(i => i.id).join(",")],
    queryFn: async () => {
      const anchors: Record<string, Awaited<ReturnType<typeof getItemAnchors>>> = {};
      const itemsToFetch = circuitItems.slice(0, 20);
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
    enabled: circuitItems.length > 0,
  });

  // Fetch all items (for push dialog)
  const { data: allItems = [] } = useQuery({
    queryKey: ["items"],
    queryFn: () => getItems(),
  });

  // Push item mutation
  const pushMutation = useMutation({
    mutationFn: ({ circuitId, itemId }: { circuitId: string; itemId: string }) =>
      updateItem(itemId, { metadata: { circuit_id: circuitId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circuitItems", id] });
      toast({
        title: "Item enviado!",
        description: "O item foi adicionado ao circuito com sucesso.",
      });
      setIsPushDialogOpen(false);
      setSelectedItem("");
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar item",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const filteredItems = circuitItems.filter((item) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (item.dfid || "").toLowerCase().includes(searchLower) ||
      (item.value_chain || "").toLowerCase().includes(searchLower) ||
      (item.country || "").toLowerCase().includes(searchLower)
    );
  });

  // Items available for push (not already in circuit)
  const availableForPush = allItems.filter(
    (item) => !circuitItems.some((ci) => ci.id === item.id)
  );

  const handleCopyId = () => {
    if (circuit?.id) {
      navigator.clipboard.writeText(circuit.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePushItem = () => {
    if (selectedItem && id) {
      pushMutation.mutate({ circuitId: id, itemId: selectedItem });
    }
  };

  if (isLoadingCircuit) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (circuitError || !circuit) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Circuito não encontrado
        </h1>
        <p className="text-muted-foreground mb-6">
          O circuito que você está procurando não existe ou você não tem permissão para acessá-lo.
        </p>
        <Link to="/app/circuitos">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Circuitos
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <button
          onClick={() => navigate("/app/circuitos")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Circuitos
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <GitBranch className="h-7 w-7 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-foreground">
                  {circuit.name}
                </h1>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                    circuit.status === "Active"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      circuit.status === "Active" ? "bg-primary" : "bg-muted-foreground"
                    )}
                  />
                  {circuit.status === "Active" ? "Ativo" : "Inativo"}
                </span>
              </div>
              <p className="text-muted-foreground">{circuit.description || "Sem descrição"}</p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={handleCopyId}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-mono bg-muted px-2 py-1 rounded"
                >
                  {copied ? (
                    <CheckCircle2 className="h-3 w-3 text-primary" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {circuit.id}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Dialog open={isPushDialogOpen} onOpenChange={setIsPushDialogOpen}>
              <DialogTrigger asChild>
                <Button className="btn-offset bg-primary hover:bg-primary text-primary-foreground">
                  <Plus className="h-4 w-4 mr-2" />
                  Push Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Enviar Item para o Circuito</DialogTitle>
                  <DialogDescription>
                    Selecione um item para enviar ao circuito "{circuit.name}"
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {availableForPush.length > 0 ? (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {availableForPush.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setSelectedItem(item.id)}
                          className={cn(
                            "w-full text-left p-3 rounded-lg border transition-colors",
                            selectedItem === item.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <p className="font-mono text-sm font-medium">
                            {(item.dfid || "").length > 25 ? `${item.dfid.slice(0, 25)}...` : item.dfid}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.value_chain && (
                              <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                {item.value_chain}
                              </span>
                            )}
                            {item.country && (
                              <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                {item.country}
                              </span>
                            )}
                            {item.year && (
                              <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                {item.year}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhum item disponível para enviar</p>
                      <Link to="/app/itens/novo" className="text-primary text-sm hover:underline">
                        Criar novo item
                      </Link>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsPushDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handlePushItem}
                    disabled={!selectedItem || pushMutation.isPending}
                  >
                    {pushMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Enviar Item"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to={`/app/circuitos/${id}/editar`} className="flex items-center">
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsMembersDialogOpen(true)}>
                  <Users className="h-4 w-4 mr-2" />
                  Gerenciar membros
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={`/app/circuitos/${id}/solicitacoes`} className="flex items-center">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Solicitações de entrada
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir circuito
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{circuitItems.length}</p>
              <p className="text-sm text-muted-foreground">Itens</p>
            </div>
          </div>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">1</p>
              <p className="text-sm text-muted-foreground">Membros</p>
            </div>
          </div>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              {circuit.visibility === "public" ? (
                <Globe className="h-5 w-5 text-primary" />
              ) : (
                <Lock className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">
                {circuit.visibility === "public" ? "Público" : "Privado"}
              </p>
              <p className="text-sm text-muted-foreground">Visibilidade</p>
            </div>
          </div>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground capitalize">
                {circuit.circuit_type || "Standard"}
              </p>
              <p className="text-sm text-muted-foreground">Tipo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Items table */}
      <div className="bg-background border border-border rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-foreground">Itens no Circuito</h2>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar itens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoadingItems ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredItems.length > 0 ? (
          <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>DFID</TableHead>
                <TableHead>Identificadores</TableHead>
                <TableHead>Cadeia / País</TableHead>
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
                const canonical = details?.canonical_identifier;
                const stellarAnchors = anchors?.blockchain_anchors || [];
                const ipfsRefs = anchors?.storage_refs || [];
                const latestStellar = stellarAnchors[0];
                const latestIpfs = ipfsRefs[0];

                return (
                <TableRow
                  key={item.id}
                  className="group cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/app/itens/${item.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <QrCode className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-mono text-sm font-medium text-foreground">
                          {(item.dfid || "").length > 20 ? `${item.dfid.slice(0, 20)}...` : item.dfid}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {canonical ? (
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-700">
                          {canonical.identifier_type}
                        </span>
                        <p className="font-mono text-xs text-muted-foreground">
                          {(canonical.value || "").length > 16 ? `${(canonical.value || "").slice(0, 16)}...` : canonical.value || ""}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
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
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {latestStellar && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={latestStellar.stellar_url || `https://stellar.expert/explorer/public/tx/${latestStellar.transaction_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-700 hover:bg-purple-500/20 transition-colors"
                            >
                              <Database className="h-3 w-3" />
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
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 transition-colors"
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
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
                        item.status === "Active"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
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
                      {new Date(item.updated_at).toLocaleDateString("pt-BR")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
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
              {searchQuery ? "Nenhum item encontrado" : "Nenhum item no circuito"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? "Tente uma busca diferente"
                : "Envie itens para começar a rastrear neste circuito"}
            </p>
            <Button onClick={() => setIsPushDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Push Item
            </Button>
          </div>
        )}
      </div>

      {/* Adapters Panel */}
      {id && <CircuitAdaptersPanel circuitId={id} />}

      {/* Dialogs */}
      {circuit && (
        <>
          <ManageMembersDialog
            circuit={circuit}
            open={isMembersDialogOpen}
            onOpenChange={setIsMembersDialogOpen}
          />
          <DeleteCircuitDialog
            circuit={circuit}
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
          />
        </>
      )}
    </div>
  );
}
