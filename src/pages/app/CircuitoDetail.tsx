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
  MessageCircle,
  Mail,
  CheckCircle2,
  XCircle,
  Shield,
  Trash2,
  UserPlus,
  Database,
  ClipboardCheck,
  RefreshCcw,
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
import { anchorStateOf } from "@/components/proof";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { 
  getCircuit, 
  getCircuitItems, 
  getJoinRequests,
  addItemToCircuit,
  getItems,
  getItem,
  getItemAnchors,
  Item, 
} from "@/lib/defarm-api";
import {
  getCircuitPropertyCompliance,
  refreshPropertyCompliance,
  type PropertyCompliance,
} from "@/lib/api";
import { ManageMembersDialog, DeleteCircuitDialog } from "@/components/circuit";
import { circuitStatusLabel, circuitTypeLabel, isCircuitPublic, normalizeCircuitStatus } from "@/lib/circuit-ui";
export default function CircuitoDetail() {
  const { user } = useAuth();
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
  const [copiedPublicUrl, setCopiedPublicUrl] = useState(false);
  const [refreshingProperty, setRefreshingProperty] = useState<string | null>(null);

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

  const { data: pendingJoinRequests = [] } = useQuery({
    queryKey: ["joinRequestsPendingCount", id],
    queryFn: () => getJoinRequests(id!, "pending"),
    enabled: !!id,
  });

  const { data: circuitCompliance } = useQuery({
    queryKey: ["circuitPropertyCompliance", id],
    queryFn: () => getCircuitPropertyCompliance(id!, { active_only: true }),
    enabled: !!id,
  });

  // Push item mutation
  const pushMutation = useMutation({
    mutationFn: ({ circuitId, itemId }: { circuitId: string; itemId: string }) =>
      addItemToCircuit(circuitId, itemId, {}),
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
  const safePendingJoinRequests = Array.isArray(pendingJoinRequests) ? pendingJoinRequests : [];
  const safeCircuitItems = Array.isArray(circuitItems) ? circuitItems : [];
  const safeAllItems = Array.isArray(allItems) ? allItems : [];
  const safeFilteredItems = safeCircuitItems.filter((item) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (item?.dfid || "").toLowerCase().includes(searchLower) ||
      (item?.value_chain || "").toLowerCase().includes(searchLower) ||
      (item?.country || "").toLowerCase().includes(searchLower)
    );
  });
  const safeAvailableForPush = safeAllItems.filter(
    (item) => !safeCircuitItems.some((ci) => ci?.id === item?.id)
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

  const isPublic = isCircuitPublic(circuit.visibility);
  const publicPathId = (circuit.public_slug || "").trim() || circuit.id;
  const publicUrl = `${window.location.origin}/c/${publicPathId}`;
  const publicUrlPlaceholder = "Disponível quando a visibilidade for Público";
  const visibilityLabel = isPublic ? "Público" : "Privado";
  const typeLabel = circuitTypeLabel(circuit.circuit_type);
  const memberCount = Array.isArray((circuit as any).members)
    ? (circuit as any).members.length
    : typeof (circuit as any).member_count === "number"
    ? (circuit as any).member_count
    : 1;
  const shareMessage = `Veja o circuito "${circuit.name}" na DeFarm: ${publicUrl}`;
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
  const emailShareUrl = `mailto:?subject=${encodeURIComponent(`Circuito ${circuit.name} - DeFarm`)}&body=${encodeURIComponent(shareMessage)}`;

  const handleCopyPublicUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedPublicUrl(true);
    setTimeout(() => setCopiedPublicUrl(false), 2000);
  };

  const handleNativeShare = async () => {
    if (!isPublic) return;
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: `Circuito ${circuit.name} - DeFarm`,
        text: `Veja o circuito "${circuit.name}" na DeFarm`,
        url: publicUrl,
      });
    } catch {
      // User cancelled share dialog - no-op
    }
  };

  const complianceBadge = (status?: string) => {
    const s = (status || "unknown").toLowerCase();
    if (s === "ok") return "bg-emerald-500/10 text-emerald-700";
    if (s === "warning") return "bg-amber-500/10 text-amber-700";
    if (s === "blocked") return "bg-rose-500/10 text-rose-700";
    return "bg-muted text-muted-foreground";
  };

  const refreshCompliance = async (property: PropertyCompliance) => {
    try {
      setRefreshingProperty(property.property_dfid);
      await refreshPropertyCompliance(property.property_dfid, true);
      await queryClient.invalidateQueries({ queryKey: ["circuitPropertyCompliance", id] });
      toast({ title: "Compliance atualizado", description: property.property_dfid });
    } catch (error) {
      toast({
        title: "Falha ao atualizar compliance",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setRefreshingProperty(null);
    }
  };

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
                {(() => {
                  const normalizedStatus = normalizeCircuitStatus(circuit.status);
                  return (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                    normalizedStatus === "active"
                      ? "bg-primary/10 text-primary"
                      : normalizedStatus === "inactive"
                      ? "bg-muted text-muted-foreground"
                      : "bg-amber-500/10 text-amber-700"
                  )}
                >
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      normalizedStatus === "active"
                        ? "bg-primary"
                        : normalizedStatus === "inactive"
                        ? "bg-muted-foreground"
                        : "bg-amber-600"
                    )}
                  />
                  {circuitStatusLabel(circuit.status)}
                </span>
                  );
                })()}
              </div>
              <p className="text-muted-foreground">{circuit.description || "Sem descrição"}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Status operacional: Ativo aparece em listas e fluxos de operação; Inativo mantém histórico, mas sai dos fluxos principais.
              </p>
              {user?.workspace_type === "government" && (
                <div className="mt-3">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/app/governo/docs#shared-circuit">
                      <ClipboardCheck className="h-4 w-4 mr-2" />
                      Guia gov: circuito compartilhado
                    </Link>
                  </Button>
                </div>
              )}
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
                    {safeAvailableForPush.length > 0 ? (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {safeAvailableForPush.map((item) => (
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
                    {safePendingJoinRequests.length > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5">
                        {safePendingJoinRequests.length}
                      </span>
                    )}
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
              <p className="text-2xl font-bold text-foreground">{safeCircuitItems.length}</p>
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
              <p className="text-2xl font-bold text-foreground">{memberCount}</p>
              <p className="text-sm text-muted-foreground">Membros</p>
            </div>
          </div>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              {isPublic ? (
                <Globe className="h-5 w-5 text-primary" />
              ) : (
                <Lock className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">
                {visibilityLabel}
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
                {typeLabel}
              </p>
              <p className="text-sm text-muted-foreground">Categoria</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-background border border-border rounded-xl p-4 space-y-3">
        <div>
          <h2 className="font-semibold text-foreground">Compartilhamento público</h2>
          <p className="text-sm text-muted-foreground">
            {isPublic
              ? "Use este link para compartilhar a página pública do circuito."
              : "Este circuito está privado. Torne público em Editar para gerar uma página compartilhável."}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Estado atual: <span className="font-medium">{visibilityLabel}</span>
            {isPublic && circuit.public_slug ? (
              <>
                {" · "}slug: <span className="font-mono">{circuit.public_slug}</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <Input
            readOnly
            value={isPublic ? publicUrl : publicUrlPlaceholder}
            className="font-mono text-xs"
          />
          <Button variant="outline" onClick={handleCopyPublicUrl} disabled={!isPublic}>
            {copiedPublicUrl ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            Copiar URL
          </Button>
          {isPublic ? (
            <a href={whatsappShareUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline">
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
            </a>
          ) : (
            <Button variant="outline" disabled>
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
          )}
          {isPublic ? (
            <a href={emailShareUrl}>
              <Button variant="outline">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            </a>
          ) : (
            <Button variant="outline" disabled>
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
          )}
          {isPublic && (
            <Button variant="outline" onClick={handleNativeShare} disabled={!navigator.share}>
              <QrCode className="h-4 w-4 mr-2" />
              Compartilhar
            </Button>
          )}
          {isPublic && (
            <Link to={`/c/${publicPathId}`} target="_blank">
              <Button variant="outline">
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir página pública
              </Button>
            </Link>
          )}
          {!isPublic && (
            <Link to={`/app/circuitos/${id}/editar`}>
              <Button variant="outline">
                <Pencil className="h-4 w-4 mr-2" />
                Tornar público
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="bg-background border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              Compliance por propriedade (LAND)
            </h2>
            <p className="text-sm text-muted-foreground">
              Verificações simples por LAND/CAR vinculadas aos itens deste circuito.
            </p>
          </div>
        </div>
        {!circuitCompliance || circuitCompliance.properties.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem propriedades LAND vinculadas no circuito.</p>
        ) : (
          <div className="space-y-2">
            {circuitCompliance.properties.map((property) => (
              <div
                key={property.property_dfid}
                className="border border-border rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
              >
                <div>
                  <p className="font-mono text-sm">{property.property_dfid}</p>
                  <p className="text-xs text-muted-foreground">
                    CAR: {property.car || "não informado"} · Última checagem:{" "}
                    {property.checked_at ? new Date(property.checked_at).toLocaleString("pt-BR") : "n/d"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs px-2 py-1 rounded-full font-medium", complianceBadge(property.status))}>
                    {(property.status || "unknown").toUpperCase()}
                    {typeof property.score === "number" ? ` · ${property.score}` : ""}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => refreshCompliance(property)}
                    disabled={refreshingProperty === property.property_dfid}
                  >
                    {refreshingProperty === property.property_dfid ? (
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                    ) : (
                      <RefreshCcw className="h-3.5 w-3.5 mr-2" />
                    )}
                    Atualizar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
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
        ) : safeFilteredItems.length > 0 ? (
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
              {safeFilteredItems.map((item) => {
                const details = itemDetailsMap[item.id];
                const anchors = itemAnchorsMap[item.id];
                const canonical = details?.canonical_identifier || (details?.identifiers && details.identifiers.length > 0 ? details.identifiers[0] : null);
                const allIdentifiers = details?.identifiers || [];
                const stellarAnchors = anchors?.blockchain_anchors || [];
                const ipfsRefs = anchors?.storage_refs || [];
                // #151 Fase C: só anchor CONFIRMADO on-chain conta como prova (esconde o
                // explorer p/ pending/failed; o fallback "não ancorado" cobre quando não há confirmado).
                const latestStellar = stellarAnchors.find((a: any) => anchorStateOf(a?.status) === "confirmed");
                const latestIpfs = ipfsRefs[0];

                const normalizedItemStatus = (item.status || "").trim().toLowerCase();
                const isItemActive = normalizedItemStatus === "active";

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
                    {allIdentifiers.length > 0 ? (
                      <div className="space-y-1">
                        {allIdentifiers.slice(0, 2).map((ident, idx) => (
                          <div key={idx} className="space-y-0.5">
                            <span className={cn(
                              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                              ident.is_canonical ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-700"
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
                        isItemActive
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isItemActive ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {isItemActive ? "Ativo" : item.status}
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
