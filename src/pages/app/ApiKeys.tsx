import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  Loader2,
  BarChart3,
  AlertTriangle,
  Activity,
  Clock,
  Zap,
  ShieldAlert,
  Pencil,
  Crosshair,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  listPartnerApiKeys,
  createPartnerApiKey,
  createIntegrationKey,
  revokePartnerApiKey,
  editPartnerApiKey,
  getPartnerApiKeyMetrics,
  switchPartnerApiKeyStagingCircuit,
} from "@/lib/api/admin";
import { getCircuits } from "@/lib/api/circuits";
import { Checkbox } from "@/components/ui/checkbox";
import { PARTNER_CANVAS } from "@/components/partner/PartnerPage";
import type {
  PartnerApiKeyResponse,
  PartnerApiKeyScope,
  ApiKeyMetricsResponse,
  EditPartnerApiKeyRequest,
  Circuit,
} from "@/lib/api/types";

export default function ApiKeys() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isPartnerWorkspace = user?.workspace_type === "partner";

  const [keys, setKeys] = useState<PartnerApiKeyResponse[]>([]);
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [loading, setLoading] = useState(true);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  // #339: 1-click integration-key mint (partner workspaces) — separate loading flag
  const [integrating, setIntegrating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScope, setNewKeyScope] = useState<PartnerApiKeyScope>(
    isPartnerWorkspace ? "workspace_ingestion" : "circuit"
  );
  // Onboarding DX (Onda 3, Fatia 1): for a PARTNER workspace the common case ("Recepção
  // inteligente") is the default and the only thing shown; the other scopes live behind
  // a disclosure. For a non-partner (default scope 'circuit') the collapsed card would
  // LIE, so start expanded — they get the plain scope Select, no card (Hetzner #118).
  const [showAdvancedScope, setShowAdvancedScope] = useState(!isPartnerWorkspace);
  const [newKeyCircuit, setNewKeyCircuit] = useState("");
  const [newKeyCircuits, setNewKeyCircuits] = useState<string[]>([]);
  const [newKeyStagingCircuit, setNewKeyStagingCircuit] = useState("");
  const [newKeyDescription, setNewKeyDescription] = useState("");
  const [newKeyExpiry, setNewKeyExpiry] = useState("");

  // Created key reveal
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Metrics
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsData, setMetricsData] = useState<ApiKeyMetricsResponse | null>(null);
  const [metricsKeyName, setMetricsKeyName] = useState("");

  // Revoke
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<PartnerApiKeyResponse | null>(null);
  const [revoking, setRevoking] = useState(false);

  // Edit (metadados mutáveis — scope/circuito são imutáveis)
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PartnerApiKeyResponse | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editRateMin, setEditRateMin] = useState("");
  const [editRateDay, setEditRateDay] = useState("");
  const [editExpiry, setEditExpiry] = useState("");
  // Onda G: scope editável.
  const [editScope, setEditScope] = useState<PartnerApiKeyScope>("circuit");
  const [editCircuit, setEditCircuit] = useState("");
  const [editCircuits, setEditCircuits] = useState<string[]>([]);

  // Repontar o circuito-alvo (staging) das chaves workspace_ingestion
  const [repointOpen, setRepointOpen] = useState(false);
  const [repointTarget, setRepointTarget] = useState<PartnerApiKeyResponse | null>(null);
  const [repointCircuit, setRepointCircuit] = useState("");
  const [repointing, setRepointing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [keysData, circuitsData] = await Promise.all([
        listPartnerApiKeys(),
        getCircuits(),
      ]);
      setKeys(keysData);
      setCircuits(circuitsData);
    } catch (err) {
      toast({
        title: t("portal.apikeys.toasts.loadError"),
        description: t("portal.apikeys.toasts.loadErrorDesc"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    if (!newKeyName) return;
    if (newKeyScope === "circuit" && !newKeyCircuit) return;
    if (newKeyScope === "circuits" && newKeyCircuits.length === 0) return;
    setCreating(true);
    try {
      const result = await createPartnerApiKey({
        key_name: newKeyName,
        scope: newKeyScope,
        circuit_id: newKeyScope === "circuit" ? newKeyCircuit : undefined,
        circuit_ids: newKeyScope === "circuits" ? newKeyCircuits : undefined,
        staging_circuit_id:
          newKeyScope === "workspace_ingestion" && newKeyStagingCircuit
            ? newKeyStagingCircuit
            : undefined,
        description: newKeyDescription || undefined,
        expires_in_days: newKeyExpiry ? parseInt(newKeyExpiry) : undefined,
      });
      // Handle different response shapes from backend
      const apiKey =
        result?.key?.api_key || (result as { api_key?: string })?.api_key || null;
      setCreateOpen(false);
      setNewKeyName("");
      setNewKeyDescription("");
      setNewKeyExpiry("");
      setNewKeyCircuit("");
      setNewKeyStagingCircuit("");
      setNewKeyScope("circuit");
      if (apiKey) {
        setRevealedKey(apiKey);
        toast({
          title: t("portal.apikeys.toasts.created"),
          description: result?.message || t("portal.apikeys.toasts.createdDesc"),
        });
      } else {
        // A chave foi criada mas o valor não veio na resposta — ele só aparece
        // uma vez, então avisamos em vez de dar um "sucesso" sem chave pra copiar.
        toast({
          title: t("portal.apikeys.toasts.createdNoValue"),
          description: t("portal.apikeys.toasts.createdNoValueDesc"),
          variant: "destructive",
        });
      }
      fetchData();
    } catch (err: any) {
      toast({
        title: t("portal.apikeys.toasts.createError"),
        description: err?.message || t("portal.common.tryAgain"),
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  // #339: gerar a chave de integração em 1 clique — sem dialog, sem escolher scope
  // nem circuito. Bate no endpoint dedicado (#336/#350) que fixa tudo no servidor.
  const handleCreateIntegrationKey = async () => {
    setIntegrating(true);
    try {
      const result = await createIntegrationKey();
      if (result?.api_key) {
        setRevealedKey(result.api_key);
        toast({
          title: t("portal.apikeys.toasts.created"),
          description: result.message || t("portal.apikeys.toasts.createdDesc"),
        });
      } else {
        toast({
          title: t("portal.apikeys.toasts.createdNoValue"),
          description: t("portal.apikeys.toasts.createdNoValueDesc"),
          variant: "destructive",
        });
      }
      fetchData();
    } catch (err) {
      toast({
        title: t("portal.apikeys.toasts.createError"),
        description: err instanceof Error ? err.message : t("portal.common.tryAgain"),
        variant: "destructive",
      });
    } finally {
      setIntegrating(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await revokePartnerApiKey(revokeTarget.id);
      toast({ title: t("portal.apikeys.toasts.revoked"), description: t("portal.apikeys.toasts.revokedDesc", { name: revokeTarget.key_name }) });
      setRevokeOpen(false);
      setRevokeTarget(null);
      fetchData();
    } catch (err: any) {
      toast({
        title: t("portal.apikeys.toasts.revokeError"),
        description: err?.message || t("portal.common.tryAgain"),
        variant: "destructive",
      });
    } finally {
      setRevoking(false);
    }
  };

  const openEdit = (key: PartnerApiKeyResponse) => {
    setEditTarget(key);
    setEditName(key.key_name);
    setEditDescription(key.description ?? "");
    setEditRateMin(key.rate_limit_per_minute != null ? String(key.rate_limit_per_minute) : "");
    setEditRateDay(key.rate_limit_per_day != null ? String(key.rate_limit_per_day) : "");
    setEditExpiry("");
    setEditScope(key.scope);
    setEditCircuit(key.circuit_id ?? "");
    setEditCircuits(key.circuit_ids ?? []);
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editTarget) return;

    // Onda G: só mexe no scope se o usuário mudou algo scope-relacionado.
    const scopeChanged = editScope !== editTarget.scope;
    const circuitChanged =
      editScope === "circuit" && editCircuit !== (editTarget.circuit_id ?? "");
    const circuitsProvided = editScope === "circuits" && editCircuits.length > 0;
    const touchScope = scopeChanged || circuitChanged || circuitsProvided;
    if (touchScope) {
      if (editScope === "circuit" && !editCircuit) {
        toast({ title: t("portal.apikeys.toasts.chooseCircuit"), variant: "destructive" });
        return;
      }
      if (editScope === "circuits" && editCircuits.length === 0) {
        toast({ title: t("portal.apikeys.toasts.chooseCircuits"), variant: "destructive" });
        return;
      }
    }

    setEditing(true);
    try {
      // Metadados. Expiração só muda se preenchida (dias a partir de agora).
      const payload: EditPartnerApiKeyRequest = {
        key_name: editName.trim(),
        description: editDescription,
      };
      if (editRateMin !== "") payload.rate_limit_per_minute = Number(editRateMin);
      if (editRateDay !== "") payload.rate_limit_per_day = Number(editRateDay);
      if (editExpiry !== "") payload.expires_in_days = Number(editExpiry);
      if (touchScope) {
        payload.scope = editScope;
        if (editScope === "circuit") payload.circuit_id = editCircuit;
        if (editScope === "circuits") payload.circuit_ids = editCircuits;
      }

      await editPartnerApiKey(editTarget.id, payload);
      toast({ title: t("portal.apikeys.toasts.updated"), description: t("portal.apikeys.toasts.updatedDesc", { name: editName.trim() }) });
      setEditOpen(false);
      setEditTarget(null);
      fetchData();
    } catch (err: any) {
      toast({
        title: t("portal.apikeys.toasts.saveError"),
        description: err?.message || t("portal.common.tryAgain"),
        variant: "destructive",
      });
    } finally {
      setEditing(false);
    }
  };

  const handleViewMetrics = async (key: PartnerApiKeyResponse) => {
    setMetricsKeyName(key.key_name);
    setMetricsLoading(true);
    setMetricsOpen(true);
    setMetricsData(null);
    try {
      const data = await getPartnerApiKeyMetrics(key.id);
      setMetricsData(data);
    } catch (err: any) {
      // If metrics endpoint not available yet, show what we have from the key data
      setMetricsData({
        api_key_id: key.id,
        requests_total: 0,
        requests_last_24h: 0,
        errors_last_24h: 0,
        last_used_at: key.last_used_at || null,
        rate_limit_per_minute: key.rate_limit_per_minute || null,
        rate_limit_per_day: key.rate_limit_per_day || null,
      });
    } finally {
      setMetricsLoading(false);
    }
  };

  const handleCopy = () => {
    if (revealedKey) {
      navigator.clipboard.writeText(revealedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getCircuitName = (circuitId: string) => {
    return circuits.find((c) => c.id === circuitId)?.name || circuitId.slice(0, 8);
  };

  const getCircuit = (circuitId: string) => circuits.find((c) => c.id === circuitId);

  // Visibilidade do circuito-alvo de uma chave. Público → ingestão por X-API-Key
  // aparece nas rotas públicas (/public, /verify). Privado → /verify público dá 404.
  const circuitPublicInfo = (circuitId?: string | null) => {
    if (!circuitId) return null;
    const c = getCircuit(circuitId);
    if (!c) return null;
    const isPublic = c.visibility === "public";
    const isStaging =
      (c.metadata as { partner_staging?: unknown } | null | undefined)?.partner_staging === true ||
      (c.metadata as { partner_staging?: unknown } | null | undefined)?.partner_staging === "true";
    return { circuit: c, isPublic, isStaging };
  };

  // Alvos válidos para /verify público imediato: circuito público + partner_staging.
  const publicStagingCircuits = circuits.filter((c) => {
    const isStaging =
      (c.metadata as { partner_staging?: unknown } | null | undefined)?.partner_staging === true ||
      (c.metadata as { partner_staging?: unknown } | null | undefined)?.partner_staging === "true";
    return c.visibility === "public" && isStaging;
  });

  const openRepoint = (key: PartnerApiKeyResponse) => {
    setRepointTarget(key);
    setRepointCircuit(key.staging_circuit_id ?? "");
    setRepointOpen(true);
  };

  const submitRepoint = async () => {
    if (!repointTarget || !repointCircuit) return;
    setRepointing(true);
    try {
      const res = await switchPartnerApiKeyStagingCircuit(repointTarget.id, repointCircuit);
      toast({
        title: t("portal.apikeys.repoint.doneTitle"),
        description: t("portal.apikeys.repoint.doneDesc", { count: res.updated_keys }),
      });
      setRepointOpen(false);
      await fetchData();
    } catch (err) {
      toast({
        title: t("portal.apikeys.repoint.errorTitle"),
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setRepointing(false);
    }
  };

  const getDefaultStagingCircuit = () => {
    const tagged = circuits.find((c: any) => c?.metadata?.partner_staging === true || c?.metadata?.partner_staging === "true");
    // Only pin a genuinely-tagged staging circuit. Dropping the circuits[0] fallback
    // means "no tag" → empty staging_circuit_id → the backend resolve_default_circuit
    // auto-resolves, matching what the card promises ("criado automaticamente"). Pinning
    // an arbitrary circuits[0] here would make the key contradict the card (Hetzner #119).
    return tagged?.id || "";
  };

  // Onda 3, Fatia 1: name of the circuit that receives data when no routing rule
  // matches — shown in the "Recepção inteligente" card so the partner sees WHERE the
  // default lands. Only a GENUINELY tagged staging circuit is named; we don't guess
  // with circuits[0] (that would mislabel an arbitrary circuit as "the default").
  // Empty → the card says it will be created on the first send.
  const taggedStagingCircuit = circuits.find(
    (c: any) => c?.metadata?.partner_staging === true || c?.metadata?.partner_staging === "true"
  );
  const defaultStagingCircuitName = taggedStagingCircuit?.name || "";

  return (
    <div className={PARTNER_CANVAS}>
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(isPartnerWorkspace ? "/app/parceiro" : "/app/configuracoes")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("portal.apikeys.header.back")}
        </button>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="section-label mb-1">{t("portal.apikeys.header.subtitle")}</p>
            <h1 className="text-foreground">API Keys</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {t("portal.apikeys.header.docsPrefix")}{" "}
              <a
                href="https://docs.defarm.net/docs/getting-started#api-key"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-2"
              >
                {t("portal.apikeys.header.docsLink")}
              </a>
            </p>
          </div>
          {isPartnerWorkspace ? (
            // #339: caminho de 1 clique — a chave de integração é o padrão; o dialog
            // avançado (scope/circuito) fica atrás de um botão secundário discreto.
            <div className="flex items-center gap-2">
              <Button
                onClick={handleCreateIntegrationKey}
                disabled={integrating}
                className="btn-offset"
              >
                {integrating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                {t("portal.apikeys.header.integrationKey")}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setNewKeyScope("workspace_ingestion");
                  if (!newKeyStagingCircuit) setNewKeyStagingCircuit(getDefaultStagingCircuit());
                  setCreateOpen(true);
                }}
              >
                {t("portal.apikeys.header.advanced")}
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => {
                setNewKeyScope("circuit");
                setCreateOpen(true);
              }}
              className="btn-offset"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("portal.apikeys.header.newKey")}
            </Button>
          )}
        </div>
      </div>

      {/* Keys table */}
      <div className="bg-background border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Key className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">{t("portal.apikeys.empty")}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("portal.apikeys.emptyDesc")}
            </p>
            {/* Empty state acionável: o CTA principal também aqui, no foco visual */}
            <Button
              className="mt-4"
              onClick={() => {
                if (isPartnerWorkspace) {
                  handleCreateIntegrationKey();
                } else {
                  setNewKeyScope("circuit");
                  setCreateOpen(true);
                }
              }}
              disabled={integrating}
            >
              <Plus className="h-4 w-4 mr-2" />
              {isPartnerWorkspace
                ? t("portal.apikeys.header.integrationKey")
                : t("portal.apikeys.header.newKey")}
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("portal.apikeys.table.name")}</TableHead>
                <TableHead>{t("portal.apikeys.table.scope")}</TableHead>
                <TableHead>{t("portal.apikeys.table.status")}</TableHead>
                <TableHead>{t("portal.apikeys.table.createdAt")}</TableHead>
                <TableHead>{t("portal.apikeys.table.lastUsed")}</TableHead>
                <TableHead className="text-right">{t("portal.apikeys.table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{key.key_name}</p>
                      {key.description && (
                        <p className="text-xs text-muted-foreground">{key.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {key.scope === "workspace_ingestion" ? (
                      <div className="space-y-1">
                        <Badge variant="secondary" className="text-xs">{t("portal.apikeys.scopeBadge.workspace_ingestion")}</Badge>
                        {key.staging_circuit_id ? (
                          <>
                            <p className="text-xs text-muted-foreground">
                              {t("portal.apikeys.receivesIn", { name: getCircuitName(key.staging_circuit_id) })}
                            </p>
                            {(() => {
                              const info = circuitPublicInfo(key.staging_circuit_id);
                              if (!info) return null;
                              // O backend só grava aqui se o circuito é público E partner_staging
                              // (resolve_source_circuit_for_workspace_ingestion_key). Sem as duas,
                              // a ingestão cai no staging padrão em silêncio — nada de badge verde.
                              if (info.isPublic && info.isStaging) {
                                return (
                                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                                    {t("portal.apikeys.target.public")}
                                  </Badge>
                                );
                              }
                              return (
                                <span className="inline-flex items-center gap-1 text-[10px] text-destructive">
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                  {info.isPublic
                                    ? t("portal.apikeys.target.publicNotStaging")
                                    : t("portal.apikeys.target.privateWarn")}
                                </span>
                              );
                            })()}
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            {t("portal.apikeys.target.none")}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Badge variant="secondary" className="text-xs">{t("portal.apikeys.scopeBadge.circuit")}</Badge>
                        {key.circuit_id ? (
                          <p className="text-xs text-muted-foreground">{getCircuitName(key.circuit_id)}</p>
                        ) : null}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {key.is_active ? (
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        {t("portal.apikeys.statusActive")}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="opacity-60">
                        {t("portal.apikeys.statusRevoked")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(key.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {key.last_used_at
                      ? new Date(key.last_used_at).toLocaleDateString("pt-BR")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {key.is_active && key.scope === "workspace_ingestion" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openRepoint(key)}
                          title={t("portal.apikeys.repoint.rowAction")}
                          aria-label={t("portal.apikeys.repoint.rowAction")}
                        >
                          <Crosshair className="h-4 w-4" />
                        </Button>
                      )}
                      {key.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(key)}
                          title={t("portal.apikeys.rowEdit")}
                          aria-label={t("portal.apikeys.rowEdit")}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewMetrics(key)}
                        title={t("portal.apikeys.rowMetrics")}
                        aria-label={t("portal.apikeys.rowMetrics")}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                      {key.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setRevokeTarget(key);
                            setRevokeOpen(true);
                          }}
                          title={t("portal.apikeys.rowRevoke")}
                          aria-label={t("portal.apikeys.rowRevoke")}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent aria-modal="true">
          <DialogHeader>
            <DialogTitle>{t("portal.apikeys.create.title")}</DialogTitle>
            <DialogDescription>
              {t("portal.apikeys.create.desc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="keyName">{t("portal.apikeys.create.nameLabel")}</Label>
              <Input
                id="keyName"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder={t("portal.apikeys.create.namePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("portal.apikeys.create.howLabel")}</Label>
              {!showAdvancedScope ? (
                <div className="rounded-md border bg-muted/20 p-3">
                  <div className="text-sm font-medium">{t("portal.apikeys.create.smartTitle")}</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {defaultStagingCircuitName ? (
                      <Trans i18nKey="portal.apikeys.create.smartBodyWithDefault" values={{ name: defaultStagingCircuitName }} components={{ strong: <strong /> }} />
                    ) : (
                      <Trans i18nKey="portal.apikeys.create.smartBodyAutoCreate" components={{ strong: <strong /> }} />
                    )}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    <button
                      type="button"
                      onClick={() => navigate("/app/meus-circuitos")}
                      className="text-primary underline underline-offset-2"
                    >
                      {t("portal.apikeys.create.viewCircuits")}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/app/parceiro/roteamento")}
                      className="text-primary underline underline-offset-2"
                    >
                      {t("portal.apikeys.create.configureRouting")}
                    </button>
                  </div>
                </div>
              ) : (
                <Select value={newKeyScope} onValueChange={(v: PartnerApiKeyScope) => setNewKeyScope(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("portal.apikeys.create.scopePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="workspace_ingestion">{t("portal.apikeys.create.scopeOptions.workspace_ingestion")}</SelectItem>
                    <SelectItem value="circuit">{t("portal.apikeys.create.scopeOptions.circuit")}</SelectItem>
                    <SelectItem value="circuits">{t("portal.apikeys.create.scopeOptions.circuits")}</SelectItem>
                    <SelectItem value="workspace">{t("portal.apikeys.create.scopeOptions.workspace")}</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {/* The card/disclosure UX only makes sense where the collapsed default is
                  truthful — i.e. a partner workspace (default 'workspace_ingestion').
                  Non-partners just get the plain Select above, no toggle. */}
              {isPartnerWorkspace ? (
                <button
                  type="button"
                  onClick={() =>
                    setShowAdvancedScope((v) => {
                      const next = !v;
                      // Collapsing returns to the default so the card above stays truthful.
                      if (!next) setNewKeyScope("workspace_ingestion");
                      return next;
                    })
                  }
                  className="text-xs text-muted-foreground underline underline-offset-2"
                >
                  {showAdvancedScope
                    ? t("portal.apikeys.create.hideAdvanced")
                    : t("portal.apikeys.create.showAdvanced")}
                </button>
              ) : null}
            </div>
            {newKeyScope === "circuit" ? (
              <div className="space-y-2">
                <Label>{t("portal.apikeys.create.circuitLabel")}</Label>
                <p className="text-xs text-muted-foreground">
                  {t("portal.apikeys.create.circuitHelp")}
                </p>
                <Select value={newKeyCircuit} onValueChange={setNewKeyCircuit}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("portal.apikeys.create.selectCircuit")} />
                  </SelectTrigger>
                  <SelectContent>
                    {circuits.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {newKeyScope === "circuits" ? (
              <div className="space-y-2">
                <Label>{t("portal.apikeys.create.circuitsLabel")}</Label>
                <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto rounded-md border p-2">
                  {circuits.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={newKeyCircuits.includes(c.id)}
                        onCheckedChange={(chk) =>
                          setNewKeyCircuits((prev) =>
                            chk ? [...prev, c.id] : prev.filter((x) => x !== c.id)
                          )
                        }
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("portal.apikeys.create.circuitsHelp")}
                </p>
              </div>
            ) : null}
            {newKeyScope === "workspace" ? (
              <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                <Trans i18nKey="portal.apikeys.create.workspaceWarn" components={{ strong: <strong /> }} />
              </div>
            ) : null}
            {showAdvancedScope && newKeyScope === "workspace_ingestion" ? (
              <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                {t("portal.apikeys.create.smartHint")}
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="keyDesc">{t("portal.apikeys.create.descLabel")}</Label>
              <Input
                id="keyDesc"
                value={newKeyDescription}
                onChange={(e) => setNewKeyDescription(e.target.value)}
                placeholder={t("portal.apikeys.create.descPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keyExpiry">{t("portal.apikeys.create.expiryLabel")}</Label>
              <Input
                id="keyExpiry"
                type="number"
                value={newKeyExpiry}
                onChange={(e) => setNewKeyExpiry(e.target.value)}
                placeholder={t("portal.apikeys.create.expiryPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t("portal.common.cancel")}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                creating ||
                !newKeyName ||
                (newKeyScope === "circuit" && !newKeyCircuit) ||
                (newKeyScope === "circuits" && newKeyCircuits.length === 0)
              }
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("portal.apikeys.create.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Repoint dialog — apontar as chaves workspace_ingestion para outro circuito */}
      <Dialog open={repointOpen} onOpenChange={setRepointOpen}>
        <DialogContent aria-modal="true">
          <DialogHeader>
            <DialogTitle>{t("portal.apikeys.repoint.title")}</DialogTitle>
            <DialogDescription>{t("portal.apikeys.repoint.desc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("portal.apikeys.repoint.selectLabel")}</Label>
              <Select value={repointCircuit} onValueChange={setRepointCircuit}>
                <SelectTrigger>
                  <SelectValue placeholder={t("portal.apikeys.repoint.selectPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {publicStagingCircuits.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {publicStagingCircuits.length === 0 && (
                <p className="text-xs text-destructive">
                  {t("portal.apikeys.repoint.noPublic")}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                {t("portal.apikeys.repoint.deterministicNote")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRepointOpen(false)}>
              {t("portal.common.cancel")}
            </Button>
            <Button onClick={submitRepoint} disabled={repointing || !repointCircuit}>
              {repointing
                ? t("portal.apikeys.repoint.submitting")
                : t("portal.apikeys.repoint.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog — só metadados mutáveis (scope/circuito imutáveis) */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent aria-modal="true">
          <DialogHeader>
            <DialogTitle>{t("portal.apikeys.edit.title")}</DialogTitle>
            <DialogDescription>
              {t("portal.apikeys.edit.desc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("portal.apikeys.edit.scopeLabel")}</Label>
              <Select value={editScope} onValueChange={(v: PartnerApiKeyScope) => setEditScope(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="workspace_ingestion">{t("portal.apikeys.edit.scopeOptions.workspace_ingestion")}</SelectItem>
                  <SelectItem value="circuit">{t("portal.apikeys.edit.scopeOptions.circuit")}</SelectItem>
                  <SelectItem value="circuits">{t("portal.apikeys.edit.scopeOptions.circuits")}</SelectItem>
                  <SelectItem value="workspace">{t("portal.apikeys.edit.scopeOptions.workspace")}</SelectItem>
                </SelectContent>
              </Select>
              {editScope === "circuit" ? (
                <Select value={editCircuit} onValueChange={setEditCircuit}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("portal.apikeys.create.selectCircuit")} />
                  </SelectTrigger>
                  <SelectContent>
                    {circuits.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              {editScope === "circuits" ? (
                <>
                  <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto rounded-md border p-2">
                    {circuits.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={editCircuits.includes(c.id)}
                          onCheckedChange={(chk) =>
                            setEditCircuits((prev) =>
                              chk ? [...prev, c.id] : prev.filter((x) => x !== c.id)
                            )
                          }
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("portal.apikeys.edit.circuitsHelp")}
                  </p>
                </>
              ) : null}
              {editScope === "workspace" ? (
                <p className="text-xs text-muted-foreground">
                  {t("portal.apikeys.edit.workspaceHelp")}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="editName">{t("portal.apikeys.create.nameLabel")}</Label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={t("portal.apikeys.create.namePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDesc">{t("portal.apikeys.edit.descLabel")}</Label>
              <Input
                id="editDesc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder={t("portal.apikeys.create.descPlaceholder")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="editRateMin">{t("portal.apikeys.edit.rateMin")}</Label>
                <Input
                  id="editRateMin"
                  type="number"
                  value={editRateMin}
                  onChange={(e) => setEditRateMin(e.target.value)}
                  placeholder="60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editRateDay">{t("portal.apikeys.edit.rateDay")}</Label>
                <Input
                  id="editRateDay"
                  type="number"
                  value={editRateDay}
                  onChange={(e) => setEditRateDay(e.target.value)}
                  placeholder="10000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editExpiry">{t("portal.apikeys.edit.newExpiryLabel")}</Label>
              <Input
                id="editExpiry"
                type="number"
                value={editExpiry}
                onChange={(e) => setEditExpiry(e.target.value)}
                placeholder={t("portal.apikeys.edit.newExpiryPlaceholder")}
              />
              <p className="text-xs text-muted-foreground">
                {editTarget?.expires_at
                  ? t("portal.apikeys.edit.currentExpires", { date: new Date(editTarget.expires_at).toLocaleDateString("pt-BR") })
                  : t("portal.apikeys.edit.noExpiry")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {t("portal.common.cancel")}
            </Button>
            <Button onClick={handleEdit} disabled={editing || !editName.trim()}>
              {editing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("portal.common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revealed Key Dialog */}
      <Dialog open={!!revealedKey} onOpenChange={() => setRevealedKey(null)}>
        {/* A chave só vem na criação — clicar fora / Esc a descartaria pra sempre.
            Forçamos fechar pelo botão explícito (o X e "Entendi" seguem funcionando). */}
        <DialogContent
          aria-modal="true"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-accent-foreground" />
              {t("portal.apikeys.reveal.title")}
            </DialogTitle>
            <DialogDescription>
              {t("portal.apikeys.reveal.desc")}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            <div className="flex items-center gap-2 bg-muted rounded-lg p-3">
              <code className="flex-1 text-sm font-mono break-all text-foreground">
                {revealedKey}
              </code>
              <Button variant="ghost" size="sm" onClick={handleCopy} aria-label={t("portal.apikeys.reveal.copyAria")}>
                {copied ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setRevealedKey(null)}>{t("portal.apikeys.reveal.gotIt")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Dialog */}
      <Dialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <DialogContent aria-modal="true">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              {t("portal.apikeys.revoke.title")}
            </DialogTitle>
            <DialogDescription>
              {t("portal.apikeys.revoke.desc", { name: revokeTarget?.key_name ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeOpen(false)}>
              {t("portal.common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={revoking}>
              {revoking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("portal.apikeys.revoke.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Metrics Dialog */}
      <Dialog open={metricsOpen} onOpenChange={setMetricsOpen}>
        <DialogContent aria-modal="true">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              {t("portal.apikeys.metrics.title", { name: metricsKeyName })}
            </DialogTitle>
          </DialogHeader>
          {metricsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : metricsData ? (
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="bg-muted/50 rounded-xl p-4 space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  <span className="text-xs font-medium">{t("portal.apikeys.metrics.total")}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {metricsData.requests_total.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="bg-muted/50 rounded-xl p-4 space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Zap className="h-4 w-4" />
                  <span className="text-xs font-medium">{t("portal.apikeys.metrics.last24h")}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {metricsData.requests_last_24h.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="bg-muted/50 rounded-xl p-4 space-y-1">
                <div className="flex items-center gap-2 text-destructive/70">
                  <ShieldAlert className="h-4 w-4" />
                  <span className="text-xs font-medium">{t("portal.apikeys.metrics.errors24h")}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {metricsData.errors_last_24h.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="bg-muted/50 rounded-xl p-4 space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs font-medium">{t("portal.apikeys.metrics.lastUse")}</span>
                </div>
                <p className="text-sm font-medium text-foreground">
                  {metricsData.last_used_at
                    ? new Date(metricsData.last_used_at).toLocaleString("pt-BR")
                    : t("portal.apikeys.metrics.never")}
                </p>
              </div>
              {(metricsData.rate_limit_per_minute || metricsData.rate_limit_per_day) && (
                <div className="col-span-2 bg-muted/30 rounded-xl p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">{t("portal.apikeys.metrics.rateLimits")}</p>
                  <div className="flex gap-4 text-sm">
                    {metricsData.rate_limit_per_minute && (
                      <span className="text-foreground">
                        <strong>{metricsData.rate_limit_per_minute}</strong>{t("portal.apikeys.metrics.perMin")}
                      </span>
                    )}
                    {metricsData.rate_limit_per_day && (
                      <span className="text-foreground">
                        <strong>{metricsData.rate_limit_per_day}</strong>{t("portal.apikeys.metrics.perDay")}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}
