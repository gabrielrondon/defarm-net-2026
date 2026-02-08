import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  TreePine,
  Filter,
  Clock,
  Loader2,
  RefreshCw,
  Trash2,
  ShieldCheck,
  Hash,
  Layers,
  Leaf,
  CheckCircle,
  XCircle,
  History,
  ChevronDown,
  ChevronUp,
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
import { cn } from "@/lib/utils";
import {
  getMerkleTrees,
  deleteMerkleTree,
  verifyTree,
  getVerificationHistory,
} from "@/lib/defarm-api";
import type { MerkleTree, MerkleVerification } from "@/lib/api/types";
import { toast } from "@/hooks/use-toast";

export default function MerkleTreesList() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [expandedTree, setExpandedTree] = useState<string | null>(null);
  const [verificationHistory, setVerificationHistory] = useState<
    Record<string, MerkleVerification[]>
  >({});

  const { data: trees = [], isLoading, error, refetch } = useQuery({
    queryKey: ["merkle-trees"],
    queryFn: () => getMerkleTrees({ limit: 100 }),
  });

  const verifyMutation = useMutation({
    mutationFn: (treeId: string) => verifyTree(treeId),
    onSuccess: (result, treeId) => {
      toast({
        title: result.is_valid ? "Árvore verificada ✓" : "Verificação falhou!",
        description: result.is_valid
          ? `Root hash: ${result.computed_root.slice(0, 16)}…`
          : `Esperado: ${result.expected_root.slice(0, 12)}… / Computado: ${result.computed_root.slice(0, 12)}…`,
        variant: result.is_valid ? "default" : "destructive",
      });
    },
    onError: (err) => {
      toast({
        title: "Erro na verificação",
        description: err instanceof Error ? err.message : "Falha ao verificar árvore",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMerkleTree(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merkle-trees"] });
      toast({ title: "Árvore excluída" });
    },
  });

  const handleToggleHistory = async (treeId: string) => {
    if (expandedTree === treeId) {
      setExpandedTree(null);
      return;
    }
    setExpandedTree(treeId);
    if (!verificationHistory[treeId]) {
      try {
        const response = await getVerificationHistory(treeId, 10);
        setVerificationHistory((prev) => ({
          ...prev,
          [treeId]: response.verifications,
        }));
      } catch {
        // Silently fail - empty history
        setVerificationHistory((prev) => ({ ...prev, [treeId]: [] }));
      }
    }
  };

  const filteredTrees = trees.filter((tree) => {
    const matchesSearch =
      tree.tree_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tree.resource_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tree.root_hash.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || tree.tree_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const treeTypes = [...new Set(trees.map((t) => t.tree_type))];

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

  const truncateHash = (hash: string) => {
    if (hash.length <= 16) return hash;
    return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando árvores Merkle...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <TreePine className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Erro ao carregar árvores
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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Árvores Merkle</h1>
        <p className="text-muted-foreground mt-1">
          Verificação criptográfica de integridade de dados
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por tipo, recurso, hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {treeTypes.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Tipo: {typeFilter === "all" ? "Todos" : typeFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setTypeFilter("all")}>Todos</DropdownMenuItem>
              {treeTypes.map((type) => (
                <DropdownMenuItem key={type} onClick={() => setTypeFilter(type)}>
                  {type}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-background border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{trees.length}</p>
          <p className="text-xs text-muted-foreground">Árvores</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">
            {trees.reduce((acc, t) => acc + t.leaf_count, 0).toLocaleString("pt-BR")}
          </p>
          <p className="text-xs text-muted-foreground">Total de folhas</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">
            {trees.length > 0
              ? Math.max(...trees.map((t) => t.height))
              : 0}
          </p>
          <p className="text-xs text-muted-foreground">Altura máxima</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">
            {new Set(trees.map((t) => t.hash_algorithm)).size || 0}
          </p>
          <p className="text-xs text-muted-foreground">Algoritmos</p>
        </div>
      </div>

      {/* Tree list */}
      {filteredTrees.length > 0 ? (
        <div className="space-y-3">
          {filteredTrees.map((tree) => (
            <div key={tree.id} className="bg-background border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-11 h-11 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <TreePine className="h-5 w-5 text-primary" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <Badge variant="secondary" className="text-xs">
                        {tree.tree_type}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {tree.resource_type}
                      </Badge>
                      <Badge variant="outline" className="text-xs font-mono">
                        {tree.hash_algorithm}
                      </Badge>
                    </div>

                    {/* Tree metrics */}
                    <div className="flex items-center gap-5 text-sm text-muted-foreground mb-2">
                      <span className="flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5" />
                        Altura: <span className="text-foreground font-medium">{tree.height}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Leaf className="h-3.5 w-3.5" />
                        Folhas: <span className="text-foreground font-medium">{tree.leaf_count.toLocaleString("pt-BR")}</span>
                      </span>
                    </div>

                    {/* Root hash */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Hash className="h-3 w-3" />
                      <span className="font-mono" title={tree.root_hash}>
                        Root: {truncateHash(tree.root_hash)}
                      </span>
                      <span className="mx-2">•</span>
                      <Clock className="h-3 w-3" />
                      {formatTime(tree.created_at)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Verificar integridade"
                      onClick={() => verifyMutation.mutate(tree.id)}
                      disabled={verifyMutation.isPending}
                    >
                      <ShieldCheck className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Histórico de verificações"
                      onClick={() => handleToggleHistory(tree.id)}
                    >
                      {expandedTree === tree.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <History className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      title="Excluir"
                      onClick={() => deleteMutation.mutate(tree.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Verification history (expandable) */}
              {expandedTree === tree.id && (
                <div className="border-t border-border bg-muted/30 p-4">
                  <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Histórico de verificações
                  </h4>
                  {verificationHistory[tree.id]?.length ? (
                    <div className="space-y-2">
                      {verificationHistory[tree.id].map((v) => (
                        <div
                          key={v.id}
                          className="flex items-center gap-3 text-xs bg-background rounded-lg p-3 border border-border"
                        >
                          {v.is_valid ? (
                            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="text-foreground font-medium">
                              {v.verification_type}
                            </span>
                            {v.verification_time_ms && (
                              <span className="text-muted-foreground ml-2">
                                ({v.verification_time_ms}ms)
                              </span>
                            )}
                          </div>
                          <span className="text-muted-foreground whitespace-nowrap">
                            {formatTime(v.created_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Nenhuma verificação registrada
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <TreePine className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Nenhuma árvore Merkle encontrada
          </h3>
          <p className="text-muted-foreground">
            {searchQuery
              ? "Tente uma busca diferente"
              : "As árvores Merkle são criadas automaticamente para verificação de integridade"}
          </p>
        </div>
      )}
    </div>
  );
}
