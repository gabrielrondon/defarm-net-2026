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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  listPartnerApiKeys,
  createPartnerApiKey,
  revokePartnerApiKey,
  getPartnerApiKeyMetrics,
} from "@/lib/api/admin";
import { getCircuits } from "@/lib/api/circuits";
import type {
  PartnerApiKeyResponse,
  ApiKeyMetricsResponse,
  Circuit,
} from "@/lib/api/types";

export default function ApiKeys() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [keys, setKeys] = useState<PartnerApiKeyResponse[]>([]);
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [loading, setLoading] = useState(true);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyCircuit, setNewKeyCircuit] = useState("");
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
    if (!newKeyName || !newKeyCircuit) return;
    setCreating(true);
    try {
      const result = await createPartnerApiKey({
        key_name: newKeyName,
        circuit_id: newKeyCircuit,
        description: newKeyDescription || undefined,
        expires_in_days: newKeyExpiry ? parseInt(newKeyExpiry) : undefined,
      });
      setRevealedKey(result.key.api_key || null);
      setCreateOpen(false);
      setNewKeyName("");
      setNewKeyDescription("");
      setNewKeyExpiry("");
      toast({
        title: "API Key criada",
        description: result.message,
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

  const handleViewMetrics = async (key: PartnerApiKeyResponse) => {
    setMetricsKeyName(key.key_name);
    setMetricsLoading(true);
    setMetricsOpen(true);
    setMetricsData(null);
    try {
      const data = await getPartnerApiKeyMetrics(key.id);
      setMetricsData(data);
    } catch (err: any) {
      toast({
        title: "Erro ao carregar métricas",
        description: err?.message || "Tente novamente.",
        variant: "destructive",
      });
      setMetricsOpen(false);
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

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate("/app/configuracoes")}
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
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="btn-offset">
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
                <TableHead>Circuito</TableHead>
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
                    <Badge variant="outline" className="font-mono text-xs">
                      {getCircuitName(key.circuit_id)}
                    </Badge>
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
              <Label>Circuito *</Label>
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
              disabled={creating || !newKeyName || !newKeyCircuit}
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Criar chave
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
