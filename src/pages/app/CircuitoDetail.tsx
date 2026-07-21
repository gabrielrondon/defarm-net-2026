import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  ScrollText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import { circuitsListPath } from "@/lib/circuitNav";
import {
  getCircuit,
  setCircuitVerified,
  getCircuitItems,
  getJoinRequests,
  addItemToCircuit,
  getItems,
  getItem,
  getItemAnchors,
  updateCircuit,
  getCircuitTermStatus,
  publishCircuitTerm,
  acceptCircuitTerm,
  Item, 
} from "@/lib/defarm-api";
import {
  getCircuitPropertyCompliance,
  refreshPropertyCompliance,
  type PropertyCompliance,
} from "@/lib/api";
import { getCircuitMembers } from "@/lib/api/circuits";
import { ManageMembersDialog, DeleteCircuitDialog } from "@/components/circuit";
import { CircuitFeeds } from "@/components/circuit/CircuitFeeds";
import { VerifiedBadge, isVerified } from "@/components/circuit/VerifiedBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isCircuitPublic, normalizeCircuitStatus } from "@/lib/circuit-ui";

const CIR_DEFAULT_TERM_BODY = `Ao participar do Circuito Independente de Rastreabilidade, o participante autoriza o uso operacional dos dados enviados ou compartilhados no circuito para fins de rastreabilidade, verificação, auditoria e emissão de evidências associadas aos itens agropecuários vinculados.

O compartilhamento entre participantes respeita as políticas de acesso do circuito, os consentimentos registrados e a minimização de dados. Dados pessoais, identificadores sensíveis e informações protegidas não são expostos publicamente, salvo autorização específica ou obrigação legal aplicável.

O participante declara ter legitimidade para enviar os dados sob sua responsabilidade e reconhece que registros técnicos, recibos, assinaturas e evidências públicas podem permanecer verificáveis para preservar a integridade da rastreabilidade.`;

export default function CircuitoDetail() {
  const { t } = useTranslation();
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
  const [termTitle, setTermTitle] = useState("Termo de Participação e Compartilhamento de Dados do CIR");
  const [termPolicyVersion, setTermPolicyVersion] = useState("cir-v1");
  const [termBody, setTermBody] = useState(CIR_DEFAULT_TERM_BODY);
  const [termMaterial, setTermMaterial] = useState(true);
  const [isEditingTerm, setIsEditingTerm] = useState(false);

  // Fetch circuit details
  const { data: circuit, isLoading: isLoadingCircuit, error: circuitError } = useQuery({
    queryKey: ["circuit", id],
    queryFn: () => getCircuit(id!),
    enabled: !!id,
  });

  const membersQuery = useQuery({
    queryKey: ["circuitMembers", id],
    queryFn: () => getCircuitMembers(id!),
    enabled: !!id,
  });

  const termQuery = useQuery({
    queryKey: ["circuitTermStatus", id],
    queryFn: () => getCircuitTermStatus(id!),
    enabled: !!id,
    retry: false,
  });

  useEffect(() => {
    const term = termQuery.data?.term;
    if (!term || isEditingTerm) return;
    setTermTitle(term.title);
    setTermPolicyVersion(term.policy_version ?? "");
    setTermBody(term.body);
    setTermMaterial(term.material);
  }, [isEditingTerm, termQuery.data?.term]);

  // Admin: conceder/remover o selo "Verificado pela DeFarm".
  const verifyMutation = useMutation({
    mutationFn: (verified: boolean) => setCircuitVerified(id!, verified),
    onSuccess: (_data, verified) => {
      toast({
        title: verified ? t("portal.circuits.detail.toasts.sealGranted") : t("portal.circuits.detail.toasts.sealRemoved"),
        description: verified
          ? t("portal.circuits.detail.toasts.sealGrantedDesc")
          : t("portal.circuits.detail.toasts.sealRemovedDesc"),
      });
      queryClient.invalidateQueries({ queryKey: ["circuit", id] });
      queryClient.invalidateQueries({ queryKey: ["circuits"] });
    },
    onError: () => toast({ title: t("portal.circuits.detail.toasts.sealError"), variant: "destructive" }),
  });

  const termsRequiredMutation = useMutation({
    mutationFn: (requiresTerms: boolean) =>
      updateCircuit(id!, { requires_terms_acceptance: requiresTerms }),
    onSuccess: (_data, requiresTerms) => {
      toast({
        title: requiresTerms ? "Termo obrigatório ativado" : "Termo obrigatório desativado",
        description: requiresTerms
          ? "Novas leituras e ações sensíveis passam a exigir aceite registrado."
          : "O circuito voltou a permitir leitura sem aceite de termo.",
      });
      queryClient.invalidateQueries({ queryKey: ["circuit", id] });
      queryClient.invalidateQueries({ queryKey: ["circuits"] });
    },
    onError: (error) =>
      toast({
        title: "Não foi possível alterar a exigência de termo",
        description: error instanceof Error ? error.message : t("portal.common.tryAgain"),
        variant: "destructive",
      }),
  });

  const publishTermMutation = useMutation({
    mutationFn: () =>
      publishCircuitTerm(id!, {
        title: termTitle.trim(),
        body: termBody.trim(),
        policy_version: termPolicyVersion.trim() || null,
        material: termMaterial,
      }),
    onSuccess: (term) => {
      toast({
        title: "Termo publicado",
        description: `Versão ${term.version} registrada para este circuito.`,
      });
      setIsEditingTerm(false);
      queryClient.invalidateQueries({ queryKey: ["circuitTermStatus", id] });
    },
    onError: (error) =>
      toast({
        title: "Não foi possível publicar o termo",
        description: error instanceof Error ? error.message : t("portal.common.tryAgain"),
        variant: "destructive",
      }),
  });

  const acceptTermMutation = useMutation({
    mutationFn: (termId: string) => acceptCircuitTerm(id!, termId),
    onSuccess: (acceptance) => {
      toast({
        title: "Aceite registrado",
        description: `Termo v${acceptance.term_version} aceito em ${new Date(acceptance.accepted_at).toLocaleString("pt-BR")}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["circuitTermStatus", id] });
      queryClient.invalidateQueries({ queryKey: ["circuit", id] });
    },
    onError: (error) =>
      toast({
        title: "Não foi possível registrar o aceite",
        description: error instanceof Error ? error.message : t("portal.common.tryAgain"),
        variant: "destructive",
      }),
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
        title: t("portal.circuits.detail.toasts.itemPushed"),
        description: t("portal.circuits.detail.toasts.itemPushedDesc"),
      });
      setIsPushDialogOpen(false);
      setSelectedItem("");
    },
    onError: (error) => {
      toast({
        title: t("portal.circuits.detail.toasts.itemPushError"),
        description: error instanceof Error ? error.message : t("portal.common.tryAgain"),
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
  const currentTerm = termQuery.data?.term ?? null;
  const hasPublishedCurrentDraft =
    Boolean(currentTerm) &&
    termTitle.trim() === currentTerm?.title &&
    termBody.trim() === currentTerm?.body &&
    (termPolicyVersion.trim() || null) === (currentTerm?.policy_version ?? null) &&
    termMaterial === Boolean(currentTerm?.material);
  const shouldShowTermEditor = isEditingTerm || !currentTerm;
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
          {t("portal.circuits.edit.notFound")}
        </h1>
        <p className="text-muted-foreground mb-6">
          {t("portal.circuits.detail.notFoundDesc")}
        </p>
        <Link to="/app/circuitos">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("portal.circuits.edit.backToCircuits")}
          </Button>
        </Link>
      </div>
    );
  }

  const isPublic = isCircuitPublic(circuit.visibility);
  const publicPathId = (circuit.public_slug || "").trim() || circuit.id;
  const publicUrl = `${window.location.origin}/c/${publicPathId}`;
  const publicUrlPlaceholder = t("portal.circuits.detail.sharing.urlPlaceholder");
  const visibilityLabel = isPublic
    ? t("portal.enums.circuitVisibility.public")
    : t("portal.enums.circuitVisibility.private");
  const typeLabel = t(`portal.enums.circuitType.${circuit.circuit_type?.toLowerCase()}`, { defaultValue: circuit.circuit_type });
  const memberCount = Array.isArray((circuit as any).members)
    ? (circuit as any).members.length
    : typeof membersQuery.data?.count === "number"
    ? membersQuery.data.count
    : typeof (circuit as any).member_count === "number"
    ? (circuit as any).member_count
    : 1;
  const shareMessage = t("portal.circuits.detail.shareMessage", { name: circuit.name, url: publicUrl });
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
  const emailShareUrl = `mailto:?subject=${encodeURIComponent(t("portal.circuits.detail.shareSubject", { name: circuit.name }))}&body=${encodeURIComponent(shareMessage)}`;

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
        title: t("portal.circuits.detail.shareSubject", { name: circuit.name }),
        text: t("portal.circuits.detail.shareText", { name: circuit.name }),
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
      toast({ title: t("portal.circuits.detail.toasts.complianceRefreshed"), description: property.property_dfid });
    } catch (error) {
      toast({
        title: t("portal.circuits.detail.toasts.complianceRefreshError"),
        description: error instanceof Error ? error.message : t("portal.common.tryAgain"),
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
          onClick={() => navigate(circuitsListPath(user?.workspace_type))}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("portal.circuits.edit.backToCircuits")}
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
                {isVerified(circuit) ? <VerifiedBadge /> : null}
                {user?.is_admin ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={verifyMutation.isPending}
                    onClick={() => verifyMutation.mutate(!isVerified(circuit))}
                  >
                    {isVerified(circuit) ? t("portal.circuits.detail.removeSeal") : t("portal.circuits.detail.grantSeal")}
                  </Button>
                ) : null}
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
                  {t(`portal.enums.circuitStatus.${circuit.status?.toLowerCase()}`, { defaultValue: circuit.status })}
                </span>
                  );
                })()}
              </div>
              <p className="text-muted-foreground">{circuit.description || t("portal.circuits.detail.noDescription")}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("portal.circuits.detail.statusHelp")}
              </p>
              {user?.workspace_type === "government" && (
                <div className="mt-3">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/app/governo/docs#shared-circuit">
                      <ClipboardCheck className="h-4 w-4 mr-2" />
                      {t("portal.circuits.detail.govGuide")}
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
                  {t("portal.circuits.detail.pushItem")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("portal.circuits.detail.pushDialogTitle")}</DialogTitle>
                  <DialogDescription>
                    {t("portal.circuits.detail.pushDialogDesc", { name: circuit.name })}
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
                      <p className="text-sm">{t("portal.circuits.detail.noItemsToPush")}</p>
                      <Link to="/app/itens/novo" className="text-primary text-sm hover:underline">
                        {t("portal.circuits.detail.createNewItem")}
                      </Link>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsPushDialogOpen(false)}>
                    {t("portal.common.cancel")}
                  </Button>
                  <Button
                    onClick={handlePushItem}
                    disabled={!selectedItem || pushMutation.isPending}
                  >
                    {pushMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t("portal.circuits.detail.sendItem")
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
                    {t("portal.circuits.detail.edit")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsMembersDialogOpen(true)}>
                  <Users className="h-4 w-4 mr-2" />
                  {t("portal.circuits.detail.manageMembers")}
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={`/app/circuitos/${id}/solicitacoes`} className="flex items-center">
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t("portal.circuits.detail.joinRequests")}
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
                  {t("portal.circuits.detail.deleteCircuit")}
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
              <p className="text-sm text-muted-foreground">{t("portal.circuits.detail.stats.items")}</p>
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
              <p className="text-sm text-muted-foreground">{t("portal.circuits.detail.stats.members")}</p>
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
              <p className="text-sm text-muted-foreground">{t("portal.circuits.detail.stats.visibility")}</p>
            </div>
          </div>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">
                {typeLabel}
              </p>
              <p className="text-sm text-muted-foreground">{t("portal.circuits.detail.stats.category")}</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="itens" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="itens">{t("portal.circuits.detail.tabs.items")}</TabsTrigger>
          <TabsTrigger value="feeds">{t("portal.circuits.detail.tabs.feeds")}</TabsTrigger>
          <TabsTrigger value="termo">Termo</TabsTrigger>
          <TabsTrigger value="compartilhamento">{t("portal.circuits.detail.tabs.sharing")}</TabsTrigger>
          <TabsTrigger value="propriedades">{t("portal.circuits.detail.tabs.properties")}</TabsTrigger>
        </TabsList>

      <TabsContent value="termo">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
        <div className="bg-background border border-border rounded-xl p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <ScrollText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Termo de consentimento do circuito</h2>
              <p className="text-sm text-muted-foreground">
                Defina o texto que participantes precisam ler e aceitar antes de acessar dados ou executar ações sensíveis neste circuito.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Exigir aceite para leitura e operação</p>
              <p className="text-xs text-muted-foreground">
                Quando ativo, membros sem aceite ficam bloqueados até registrar consentimento no termo vigente.
              </p>
            </div>
            <Switch
              checked={Boolean(circuit.requires_terms_acceptance)}
              disabled={termsRequiredMutation.isPending}
              onCheckedChange={(checked) => termsRequiredMutation.mutate(checked)}
              aria-label="Exigir aceite de termo"
            />
          </div>

          {!shouldShowTermEditor && currentTerm ? (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-primary flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Termo publicado
                </p>
                <p className="text-xs text-muted-foreground">
                  Versão {currentTerm.version}
                  {currentTerm.policy_version ? ` · ${currentTerm.policy_version}` : ""}
                  {" · "}
                  {currentTerm.material ? "mudança material" : "mudança editorial"}
                </p>
              </div>
              <Button variant="outline" onClick={() => setIsEditingTerm(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Nova versão
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="term-title">Título</Label>
                <Input id="term-title" value={termTitle} onChange={(e) => setTermTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="term-policy">Versão de política</Label>
                <Input
                  id="term-policy"
                  value={termPolicyVersion}
                  onChange={(e) => setTermPolicyVersion(e.target.value)}
                  placeholder="cir-v1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="term-body">Texto do termo</Label>
                <Textarea
                  id="term-body"
                  className="min-h-[260px] leading-relaxed"
                  value={termBody}
                  onChange={(e) => setTermBody(e.target.value)}
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={termMaterial}
                    onCheckedChange={setTermMaterial}
                    aria-label="Marcar como mudança material"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">Mudança material</p>
                    <p className="text-xs text-muted-foreground">Força reaceite dos membros quando uma nova versão muda a política.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {currentTerm && (
                    <Button variant="outline" onClick={() => setIsEditingTerm(false)} disabled={publishTermMutation.isPending}>
                      Cancelar
                    </Button>
                  )}
                  <Button
                    onClick={() => publishTermMutation.mutate()}
                    disabled={publishTermMutation.isPending || hasPublishedCurrentDraft || !termTitle.trim() || !termBody.trim()}
                  >
                    {publishTermMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : hasPublishedCurrentDraft ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <ScrollText className="h-4 w-4 mr-2" />}
                    {hasPublishedCurrentDraft ? "Publicado" : currentTerm ? "Publicar nova versão" : "Publicar termo"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="bg-background border border-border rounded-xl p-4 space-y-4">
          <div>
            <h2 className="font-semibold text-foreground">Termo vigente</h2>
            <p className="text-sm text-muted-foreground">
              Esta é a versão usada pelo backend para validar aceite e reconsentimento.
            </p>
          </div>
          {termQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando termo...
            </div>
          ) : currentTerm ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-border p-3 space-y-1">
                <p className="text-sm font-medium text-foreground">{currentTerm.title}</p>
                <p className="text-xs text-muted-foreground">
                  Versão {currentTerm.version}
                  {currentTerm.policy_version ? ` · ${currentTerm.policy_version}` : ""}
                  {" · "}
                  {currentTerm.material ? "material" : "editorial"}
                </p>
                <p className="text-xs font-mono text-muted-foreground break-all">hash {currentTerm.body_hash}</p>
              </div>
              <div className="max-h-[320px] overflow-auto rounded-lg bg-muted/40 p-3 text-sm whitespace-pre-wrap leading-relaxed">
                {currentTerm.body}
              </div>
              {termQuery.data?.accepted ? (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
                  <p className="font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Aceite registrado
                  </p>
                  {termQuery.data.acceptance?.accepted_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Registrado em {new Date(termQuery.data.acceptance.accepted_at).toLocaleString("pt-BR")}
                    </p>
                  )}
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => acceptTermMutation.mutate(currentTerm.id)}
                  disabled={acceptTermMutation.isPending}
                  className="w-full"
                >
                  {acceptTermMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Registrar meu aceite
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              Nenhum termo vigente foi encontrado. Publique uma versão antes de convidar participantes.
            </div>
          )}
        </div>
      </div>
      </TabsContent>

      <TabsContent value="compartilhamento">
      <div className="bg-background border border-border rounded-xl p-4 space-y-3">
        <div>
          <h2 className="font-semibold text-foreground">{t("portal.circuits.detail.sharing.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {isPublic
              ? t("portal.circuits.detail.sharing.descPublic")
              : t("portal.circuits.detail.sharing.descPrivate")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("portal.circuits.detail.sharing.currentState")} <span className="font-medium">{visibilityLabel}</span>
            {isPublic && circuit.public_slug ? (
              <>
                {" · "}{t("portal.circuits.detail.sharing.slug")} <span className="font-mono">{circuit.public_slug}</span>
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
            {t("portal.circuits.detail.sharing.copyUrl")}
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
              {t("portal.circuits.detail.sharing.share")}
            </Button>
          )}
          {isPublic && (
            <Link to={`/c/${publicPathId}`} target="_blank">
              <Button variant="outline">
                <ExternalLink className="h-4 w-4 mr-2" />
                {t("portal.circuits.detail.sharing.openPublic")}
              </Button>
            </Link>
          )}
          {!isPublic && (
            <Link to={`/app/circuitos/${id}/editar`}>
              <Button variant="outline">
                <Pencil className="h-4 w-4 mr-2" />
                {t("portal.circuits.detail.sharing.makePublic")}
              </Button>
            </Link>
          )}
        </div>
      </div>

      </TabsContent>

      <TabsContent value="propriedades">
      <div className="bg-background border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              {t("portal.circuits.detail.properties.title")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("portal.circuits.detail.properties.desc")}
            </p>
          </div>
        </div>
        {!circuitCompliance || circuitCompliance.properties.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("portal.circuits.detail.properties.none")}</p>
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
                    {t("portal.circuits.detail.properties.carLine", {
                      car: property.car || t("portal.circuits.detail.properties.carNotInformed"),
                      date: property.checked_at ? new Date(property.checked_at).toLocaleString("pt-BR") : t("portal.circuits.detail.properties.checkNA"),
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs px-2 py-1 rounded-full font-medium", complianceBadge(property.status))}>
                    {t(`portal.enums.complianceStatus.${(property.status || "unknown").toLowerCase()}`, { defaultValue: property.status })}
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
                    {t("portal.circuits.detail.properties.refresh")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      </TabsContent>

      <TabsContent value="feeds">
      {/* Feeds entre circuitos (artifact-model Track B / A1) */}
      <CircuitFeeds circuitId={id!} />
      </TabsContent>

      <TabsContent value="itens">
      {/* Items table */}
      <div className="bg-background border border-border rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-foreground">{t("portal.circuits.detail.items.title")}</h2>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("portal.circuits.detail.items.searchPlaceholder")}
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
                <TableHead>{t("portal.circuits.detail.items.thDfid")}</TableHead>
                <TableHead>{t("portal.circuits.detail.items.thIdentifiers")}</TableHead>
                <TableHead>{t("portal.circuits.detail.items.thChainCountry")}</TableHead>
                <TableHead>{t("portal.circuits.detail.items.thAnchors")}</TableHead>
                <TableHead>{t("portal.circuits.detail.items.thStatus")}</TableHead>
                <TableHead>{t("portal.circuits.detail.items.thUpdate")}</TableHead>
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
                          <span className="text-[10px] text-muted-foreground">{t("portal.circuits.detail.items.moreIdentifiers", { count: allIdentifiers.length - 2 })}</span>
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
                      {t(`portal.enums.itemStatus.${normalizedItemStatus}`, { defaultValue: item.status })}
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
              {searchQuery ? t("portal.circuits.detail.items.emptySearch") : t("portal.circuits.detail.items.emptyNone")}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? t("portal.circuits.detail.items.emptySearchDesc")
                : t("portal.circuits.detail.items.emptyNoneDesc")}
            </p>
            <Button onClick={() => setIsPushDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("portal.circuits.detail.pushItem")}
            </Button>
          </div>
        )}
      </div>
      </TabsContent>
      </Tabs>

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
