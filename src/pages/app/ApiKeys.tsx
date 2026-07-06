import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  listPartnerApiKeys,
  createPartnerApiKey,
  revokePartnerApiKey,
  editPartnerApiKey,
  getPartnerApiKeyMetrics,
} from "@/lib/api/admin";
import { getCircuits } from "@/lib/api/circuits";
import { Checkbox } from "@/components/ui/checkbox";
import type {
  PartnerApiKeyResponse,
  PartnerApiKeyScope,
  ApiKeyMetricsResponse,
  EditPartnerApiKeyRequest,
  Circuit,
} from "@/lib/api/types";

export default function ApiKeys() {
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
        title: "Erro ao carregar dados",
        description: "Não foi possível buscar as API keys.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

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
      const apiKey = result?.key?.api_key || (result as any)?.api_key || null;
      setRevealedKey(apiKey);
      setCreateOpen(false);
      setNewKeyName("");
      setNewKeyDescription("");
      setNewKeyExpiry("");
      setNewKeyCircuit("");
      setNewKeyStagingCircuit("");
      setNewKeyScope("circuit");
      toast({
        title: "API Key criada",
        description: result?.message || "Chave criada com sucesso.",
      });
      fetchData();
    } catch (err: any) {
      toast({
        title: "Erro ao criar API Key",
        description: err?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await revokePartnerApiKey(revokeTarget.id);
      toast({ title: "API Key revogada", description: `"${revokeTarget.key_name}" foi desativada.` });
      setRevokeOpen(false);
      setRevokeTarget(null);
      fetchData();
    } catch (err: any) {
      toast({
        title: "Erro ao revogar",
        description: err?.message || "Tente novamente.",
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
        toast({ title: "Escolha um circuito", variant: "destructive" });
        return;
      }
      if (editScope === "circuits" && editCircuits.length === 0) {
        toast({ title: "Escolha ao menos um circuito", variant: "destructive" });
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
      toast({ title: "API Key atualizada", description: `"${editName.trim()}" foi salva.` });
      setEditOpen(false);
      setEditTarget(null);
      fetchData();
    } catch (err: any) {
      toast({
        title: "Erro ao salvar",
        description: err?.message || "Tente novamente.",
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

  const getDefaultStagingCircuit = () => {
    const tagged = circuits.find((c: any) => c?.metadata?.partner_staging === true || c?.metadata?.partner_staging === "true");
    return tagged?.id || circuits[0]?.id || "";
  };

  // Onda 3, Fatia 1: name of the circuit that receives data when no routing rule
  // matches — shown in the "Recepção inteligente" card so the partner sees WHERE the
  // default lands (empty until the first workspace_ingestion key auto-creates it).
  const defaultStagingCircuitId = getDefaultStagingCircuit();
  const defaultStagingCircuitName = defaultStagingCircuitId
    ? getCircuitName(defaultStagingCircuitId)
    : "";

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(isPartnerWorkspace ? "/app/parceiro" : "/app/configuracoes")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Configurações
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Key className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">API Keys</h1>
              <p className="text-muted-foreground">Gerencie suas chaves de acesso para integração</p>
              <p className="text-xs text-muted-foreground mt-1">
                Documentação:{" "}
                <a
                  href="https://docs.defarm.net/docs/getting-started#api-key"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  como usar API key no quickstart
                </a>
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              if (isPartnerWorkspace) {
                setNewKeyScope("workspace_ingestion");
                if (!newKeyStagingCircuit) setNewKeyStagingCircuit(getDefaultStagingCircuit());
              } else {
                setNewKeyScope("circuit");
              }
              setCreateOpen(true);
            }}
            className="btn-offset"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova API Key
          </Button>
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
            <p className="text-muted-foreground font-medium">Nenhuma API Key criada</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crie uma chave para integrar com a API do DeFarm
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Escopo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead>Último uso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
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
                        <Badge variant="secondary" className="text-xs">Recepção inteligente</Badge>
                        {key.staging_circuit_id ? (
                          <p className="text-xs text-muted-foreground">
                            Recebe em: {getCircuitName(key.staging_circuit_id)}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Badge variant="secondary" className="text-xs">Circuito específico</Badge>
                        {key.circuit_id ? (
                          <p className="text-xs text-muted-foreground">{getCircuitName(key.circuit_id)}</p>
                        ) : null}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {key.is_active ? (
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        Ativa
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="opacity-60">
                        Revogada
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
                      {key.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(key)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewMetrics(key)}
                        title="Ver métricas"
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
                          title="Revogar"
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar nova API Key</DialogTitle>
            <DialogDescription>
              A chave será exibida apenas uma vez. Salve-a em um local seguro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="keyName">Nome da chave *</Label>
              <Input
                id="keyName"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="ex: Integração ERP"
              />
            </div>
            <div className="space-y-2">
              <Label>Como esta chave recebe seus dados</Label>
              {!showAdvancedScope ? (
                <div className="rounded-md border bg-muted/20 p-3">
                  <div className="text-sm font-medium">Recepção inteligente</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Você manda os dados sem apontar circuito. A DeFarm roteia cada item
                    automaticamente pelas regras que você configura (por exploração, CAR,
                    CNPJ…). O que não casar nenhuma regra cai no seu <strong>circuito
                    padrão</strong>
                    {defaultStagingCircuitName ? (
                      <> — hoje <strong>{defaultStagingCircuitName}</strong>.</>
                    ) : (
                      <> (criado automaticamente no seu primeiro envio).</>
                    )}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    <button
                      type="button"
                      onClick={() => navigate("/app/meus-circuitos")}
                      className="text-primary underline underline-offset-2"
                    >
                      Ver circuitos
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/app/parceiro/roteamento")}
                      className="text-primary underline underline-offset-2"
                    >
                      Configurar roteamento
                    </button>
                  </div>
                </div>
              ) : (
                <Select value={newKeyScope} onValueChange={(v: PartnerApiKeyScope) => setNewKeyScope(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o escopo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="workspace_ingestion">Recepção inteligente (padrão)</SelectItem>
                    <SelectItem value="circuit">Um circuito específico</SelectItem>
                    <SelectItem value="circuits">Vários circuitos</SelectItem>
                    <SelectItem value="workspace">Todo o workspace (acesso amplo)</SelectItem>
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
                    ? "Ocultar opções avançadas"
                    : "Opções avançadas — escolher circuito manualmente"}
                </button>
              ) : null}
            </div>
            {newKeyScope === "circuit" ? (
              <div className="space-y-2">
                <Label>Circuito *</Label>
                <p className="text-xs text-muted-foreground">
                  Um circuito é onde seus dados caem — um destino rastreável no seu workspace.
                </p>
                <Select value={newKeyCircuit} onValueChange={setNewKeyCircuit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um circuito" />
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
                <Label>Circuitos * (escolha um ou mais)</Label>
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
                  A chave vale apenas para os circuitos marcados. Editável depois.
                </p>
              </div>
            ) : null}
            {newKeyScope === "workspace" ? (
              <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                <strong>Global:</strong> a chave vale para qualquer circuito do seu workspace
                (inclusive os criados no futuro). Use com cuidado — é o acesso mais amplo.
              </div>
            ) : null}
            {showAdvancedScope && newKeyScope === "workspace_ingestion" ? (
              <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                Sem configuração adicional: a DeFarm escolhe automaticamente o circuito de
                recepção dos seus dados.
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="keyDesc">Descrição (opcional)</Label>
              <Input
                id="keyDesc"
                value={newKeyDescription}
                onChange={(e) => setNewKeyDescription(e.target.value)}
                placeholder="Para que será usada"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keyExpiry">Expiração em dias (opcional)</Label>
              <Input
                id="keyExpiry"
                type="number"
                value={newKeyExpiry}
                onChange={(e) => setNewKeyExpiry(e.target.value)}
                placeholder="365"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
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
              Criar chave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog — só metadados mutáveis (scope/circuito imutáveis) */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar API Key</DialogTitle>
            <DialogDescription>
              Edite nome, descrição, limites, expiração e o escopo de acesso (circuito único,
              conjunto de circuitos ou workspace inteiro).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Escopo</Label>
              <Select value={editScope} onValueChange={(v: PartnerApiKeyScope) => setEditScope(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="workspace_ingestion">Recepção inteligente</SelectItem>
                  <SelectItem value="circuit">Circuito específico</SelectItem>
                  <SelectItem value="circuits">Vários circuitos (conjunto)</SelectItem>
                  <SelectItem value="workspace">Todo o workspace (global)</SelectItem>
                </SelectContent>
              </Select>
              {editScope === "circuit" ? (
                <Select value={editCircuit} onValueChange={setEditCircuit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um circuito" />
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
                    Marque os circuitos para (re)definir o conjunto desta chave.
                  </p>
                </>
              ) : null}
              {editScope === "workspace" ? (
                <p className="text-xs text-muted-foreground">
                  Global: a chave passa a valer para qualquer circuito do workspace.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="editName">Nome da chave *</Label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="ex: Integração ERP"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDesc">Descrição</Label>
              <Input
                id="editDesc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Para que será usada"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="editRateMin">Limite / minuto</Label>
                <Input
                  id="editRateMin"
                  type="number"
                  value={editRateMin}
                  onChange={(e) => setEditRateMin(e.target.value)}
                  placeholder="60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editRateDay">Limite / dia</Label>
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
              <Label htmlFor="editExpiry">Nova expiração em dias (opcional)</Label>
              <Input
                id="editExpiry"
                type="number"
                value={editExpiry}
                onChange={(e) => setEditExpiry(e.target.value)}
                placeholder="deixe vazio para manter"
              />
              <p className="text-xs text-muted-foreground">
                {editTarget?.expires_at
                  ? `Atual: expira em ${new Date(editTarget.expires_at).toLocaleDateString("pt-BR")}`
                  : "Atual: sem expiração"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={editing || !editName.trim()}>
              {editing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revealed Key Dialog */}
      <Dialog open={!!revealedKey} onOpenChange={() => setRevealedKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-accent-foreground" />
              Salve sua API Key
            </DialogTitle>
            <DialogDescription>
              Esta chave será exibida apenas uma vez. Copie e guarde em um local seguro.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            <div className="flex items-center gap-2 bg-muted rounded-lg p-3">
              <code className="flex-1 text-sm font-mono break-all text-foreground">
                {revealedKey}
              </code>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setRevealedKey(null)}>Entendi, já copiei</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Dialog */}
      <Dialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Revogar API Key
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja revogar a chave "{revokeTarget?.key_name}"?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={revoking}>
              {revoking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Revogar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Metrics Dialog */}
      <Dialog open={metricsOpen} onOpenChange={setMetricsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Métricas — {metricsKeyName}
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
                  <span className="text-xs font-medium">Total de requests</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {metricsData.requests_total.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="bg-muted/50 rounded-xl p-4 space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Zap className="h-4 w-4" />
                  <span className="text-xs font-medium">Últimas 24h</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {metricsData.requests_last_24h.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="bg-muted/50 rounded-xl p-4 space-y-1">
                <div className="flex items-center gap-2 text-destructive/70">
                  <ShieldAlert className="h-4 w-4" />
                  <span className="text-xs font-medium">Erros (24h)</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {metricsData.errors_last_24h.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="bg-muted/50 rounded-xl p-4 space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs font-medium">Último uso</span>
                </div>
                <p className="text-sm font-medium text-foreground">
                  {metricsData.last_used_at
                    ? new Date(metricsData.last_used_at).toLocaleString("pt-BR")
                    : "Nunca"}
                </p>
              </div>
              {(metricsData.rate_limit_per_minute || metricsData.rate_limit_per_day) && (
                <div className="col-span-2 bg-muted/30 rounded-xl p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Rate Limits</p>
                  <div className="flex gap-4 text-sm">
                    {metricsData.rate_limit_per_minute && (
                      <span className="text-foreground">
                        <strong>{metricsData.rate_limit_per_minute}</strong>/min
                      </span>
                    )}
                    {metricsData.rate_limit_per_day && (
                      <span className="text-foreground">
                        <strong>{metricsData.rate_limit_per_day}</strong>/dia
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
  );
}
