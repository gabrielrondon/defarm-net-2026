import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Camera,
  Filter,
  Clock,
  Loader2,
  RefreshCw,
  Archive,
  Trash2,
  Plus,
  CheckCircle,
  Database,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  getSnapshots,
  createSnapshot,
  deleteSnapshot,
  archiveSnapshot,
  getCircuits,
} from "@/lib/defarm-api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { MerkleTreeViewer } from "@/components/snapshots/MerkleTreeViewer";

export default function SnapshotsList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formResourceType, setFormResourceType] = useState("circuit");
  const [formSnapshotType, setFormSnapshotType] = useState("manual");
  const [formCircuitId, setFormCircuitId] = useState("");
  const [merkleSnapshotId, setMerkleSnapshotId] = useState<string | null>(null);
  const [merkleSnapshotName, setMerkleSnapshotName] = useState("");

  const { data: snapshots = [], isLoading, error, refetch } = useQuery({
    queryKey: ["snapshots"],
    queryFn: () => getSnapshots({ limit: 100 }),
    retry: 1,
    retryDelay: 1000,
  });

  const { data: circuits = [] } = useQuery({
    queryKey: ["circuits"],
    queryFn: () => getCircuits(),
  });

  // Auto-select first circuit when loaded
  useEffect(() => {
    if (circuits.length > 0 && !formCircuitId) {
      setFormCircuitId(circuits[0].id);
    }
  }, [circuits]);

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof createSnapshot>[0]) => createSnapshot(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["snapshots"] });
      setCreateOpen(false);
      setFormName("");
      setFormDescription("");
      setFormCircuitId("");
      toast({ title: "Snapshot criado", description: "O snapshot foi salvo com sucesso." });
    },
    onError: (err) => {
      toast({
        title: "Erro ao criar snapshot",
        description: err instanceof Error ? err.message : "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveSnapshot(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["snapshots"] });
      toast({ title: "Snapshot arquivado" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSnapshot(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["snapshots"] });
      toast({ title: "Snapshot excluído" });
    },
  });

  const handleCreate = () => {
    if (!formName.trim() || !user || !formCircuitId) return;
    const circuitId = formCircuitId;
    createMutation.mutate({
      snapshot_name: formName.trim(),
      snapshot_type: formSnapshotType,
      resource_type: formResourceType,
      snapshot_data: {},
      created_by: user.id,
      description: formDescription.trim() || undefined,
      circuit_id: circuitId,
      resource_id: circuitId,
    });
  };

  const filteredSnapshots = snapshots.filter((s) => {
    const matchesSearch =
      s.snapshot_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.resource_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || s.snapshot_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const snapshotTypeLabels: Record<string, string> = {
    manual: "Manual",
    automatic: "Automático",
    scheduled: "Agendado",
    pre_restore: "Pré-restauração",
  };

  const resourceTypeLabels: Record<string, string> = {
    circuit: "Circuito",
    item: "Item",
    event: "Evento",
    system: "Sistema",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando snapshots...</p>
        </div>
      </div>
    );
  }

  const isPermissionError = error && (error as any)?.status === 403;

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {isPermissionError ? "Acesso restrito" : "Erro ao carregar snapshots"}
        </h1>
        <p className="text-muted-foreground mb-6">
          {isPermissionError
            ? "Sua conta não possui permissão para gerenciar Snapshots. Solicite acesso ao administrador do workspace."
            : error instanceof Error ? error.message : "Tente novamente mais tarde"}
        </p>
        {!isPermissionError && (
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Snapshots</h1>
          <p className="text-muted-foreground mt-1">
            Capturas de estado para comparação e restauração
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Snapshot
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Snapshot</DialogTitle>
              <DialogDescription>
                Capture o estado atual dos seus dados para referência futura.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="snap-name">Nome</Label>
                <Input
                  id="snap-name"
                  placeholder="Ex: Backup pré-migração"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="snap-desc">Descrição (opcional)</Label>
                <Textarea
                  id="snap-desc"
                  placeholder="Descreva o propósito deste snapshot..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Circuito</Label>
                <Select value={formCircuitId} onValueChange={setFormCircuitId}>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de recurso</Label>
                  <Select value={formResourceType} onValueChange={setFormResourceType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="circuit">Circuito</SelectItem>
                      <SelectItem value="item">Item</SelectItem>
                      <SelectItem value="system">Sistema</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de snapshot</Label>
                  <Select value={formSnapshotType} onValueChange={setFormSnapshotType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="automatic">Automático</SelectItem>
                      <SelectItem value="scheduled">Agendado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!formName.trim() || !formCircuitId || createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Camera className="h-4 w-4 mr-2" />
                )}
                Criar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar snapshots..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Tipo: {typeFilter === "all" ? "Todos" : snapshotTypeLabels[typeFilter] || typeFilter}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setTypeFilter("all")}>Todos</DropdownMenuItem>
            {Object.keys(snapshotTypeLabels).map((type) => (
              <DropdownMenuItem key={type} onClick={() => setTypeFilter(type)}>
                {snapshotTypeLabels[type]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-background border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{snapshots.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">
            {snapshots.filter((s) => !s.is_archived).length}
          </p>
          <p className="text-xs text-muted-foreground">Ativos</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">
            {snapshots.filter((s) => s.is_archived).length}
          </p>
          <p className="text-xs text-muted-foreground">Arquivados</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">
            {new Set(snapshots.map((s) => s.resource_type)).size}
          </p>
          <p className="text-xs text-muted-foreground">Tipos de recurso</p>
        </div>
      </div>

      {/* Snapshot list */}
      {filteredSnapshots.length > 0 ? (
        <div className="grid gap-3">
          {filteredSnapshots.map((snapshot) => (
            <div
              key={snapshot.id}
              className={cn(
                "bg-background border border-border rounded-xl p-5 hover:border-primary/30 transition-colors",
                snapshot.is_archived && "opacity-60"
              )}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={cn(
                  "w-11 h-11 rounded-lg flex items-center justify-center shrink-0",
                  snapshot.is_archived ? "bg-muted" : "bg-primary/10"
                )}>
                  {snapshot.is_archived ? (
                    <Archive className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Camera className="h-5 w-5 text-primary" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-foreground">
                      {snapshot.snapshot_name}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {snapshotTypeLabels[snapshot.snapshot_type] || snapshot.snapshot_type}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Database className="h-3 w-3 mr-1" />
                      {resourceTypeLabels[snapshot.resource_type] || snapshot.resource_type}
                    </Badge>
                    {snapshot.is_archived && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Arquivado
                      </Badge>
                    )}
                  </div>

                  {snapshot.description && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {snapshot.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(snapshot.created_at)}
                    </span>
                    {snapshot.checksum && (
                      <span className="font-mono" title={snapshot.checksum}>
                        <CheckCircle className="h-3 w-3 inline mr-1" />
                        {snapshot.checksum.slice(0, 12)}…
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-primary"
                    title="Ver Verificação Criptográfica"
                    onClick={() => {
                      setMerkleSnapshotId(snapshot.id);
                      setMerkleSnapshotName(snapshot.snapshot_name);
                    }}
                  >
                    <Shield className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Verificação</span>
                  </Button>
                  {!snapshot.is_archived && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Arquivar"
                      onClick={() => archiveMutation.mutate(snapshot.id)}
                      disabled={archiveMutation.isPending}
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    title="Excluir"
                    onClick={() => deleteMutation.mutate(snapshot.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Nenhum snapshot encontrado
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? "Tente uma busca diferente" : "Crie seu primeiro snapshot para capturar o estado atual dos dados"}
          </p>
          {!searchQuery && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Snapshot
            </Button>
          )}
        </div>
      )}
      {/* Merkle Tree Viewer Drawer */}
      <MerkleTreeViewer
        isOpen={!!merkleSnapshotId}
        onClose={() => setMerkleSnapshotId(null)}
        snapshotId={merkleSnapshotId ?? ""}
        snapshotName={merkleSnapshotName}
      />
    </div>
  );
}
