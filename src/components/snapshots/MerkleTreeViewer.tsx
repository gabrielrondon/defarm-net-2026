import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Shield,
  Copy,
  Check,
  Loader2,
  ChevronDown,
  Clock,
  TreePine,
  Hash,
  Layers,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { getMerkleTrees, verifyTree, getVerificationHistory } from "@/lib/api/merkle";
import type { MerkleTree, MerkleVerification } from "@/lib/api/types";
import { toast } from "@/hooks/use-toast";

interface MerkleTreeViewerProps {
  isOpen: boolean;
  onClose: () => void;
  snapshotId: string;
  snapshotName: string;
}

export function MerkleTreeViewer({
  isOpen,
  onClose,
  snapshotId,
  snapshotName,
}: MerkleTreeViewerProps) {
  const [copiedHash, setCopiedHash] = useState(false);
  const [techOpen, setTechOpen] = useState(false);

  const { data: trees = [], isLoading } = useQuery({
    queryKey: ["merkle-trees", "snapshot", snapshotId],
    queryFn: () => getMerkleTrees({ snapshot_id: snapshotId } as any),
    enabled: isOpen,
    retry: 1,
  });

  const tree = trees[0] as MerkleTree | undefined;

  const { data: verificationHistory } = useQuery({
    queryKey: ["merkle-verifications", tree?.id],
    queryFn: () => getVerificationHistory(tree!.id, 5),
    enabled: isOpen && !!tree?.id,
    retry: 1,
  });

  const verifyMutation = useMutation({
    mutationFn: () => verifyTree(tree!.id),
    onSuccess: (result) => {
      toast({
        title: result.is_valid ? "✅ Integridade confirmada" : "⚠️ Integridade comprometida",
        description: result.is_valid
          ? "Todos os dados estão íntegros e não foram alterados."
          : "Foram detectadas alterações nos dados.",
        variant: result.is_valid ? "default" : "destructive",
      });
    },
    onError: (err) => {
      toast({
        title: "Erro na verificação",
        description: err instanceof Error ? err.message : "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const handleCopyHash = async () => {
    if (!tree?.root_hash) return;
    await navigator.clipboard.writeText(tree.root_hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const verifications = verificationHistory?.verifications ?? [];
  const lastVerification = verifications[0];

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Verificação Criptográfica
          </DrawerTitle>
          <DrawerDescription>
            Merkle Tree do snapshot "{snapshotName}"
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4 overflow-y-auto space-y-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !tree ? (
            <div className="text-center py-8">
              <TreePine className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhuma árvore Merkle associada a este snapshot.
              </p>
            </div>
          ) : (
            <>
              {/* Status */}
              <div className="flex items-center gap-3">
                {lastVerification ? (
                  <Badge
                    variant={lastVerification.is_valid ? "default" : "destructive"}
                    className="gap-1"
                  >
                    {lastVerification.is_valid ? "✅ Íntegro" : "⚠️ Alterado"}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    Não verificado
                  </Badge>
                )}
                {lastVerification && (
                  <span className="text-xs text-muted-foreground">
                    Última verificação: {formatTime(lastVerification.created_at)}
                  </span>
                )}
              </div>

              {/* Root Hash */}
              <div className="bg-muted/50 border border-border rounded-xl p-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" />
                  Root Hash (Impressão Digital)
                </p>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-foreground break-all flex-1">
                    {tree.root_hash}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={handleCopyHash}
                  >
                    {copiedHash ? (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Tree Visualization */}
              <div className="bg-muted/30 border border-border rounded-xl p-4">
                <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  Estrutura da Árvore
                </p>
                <div className="font-mono text-xs text-center space-y-2">
                  <div>
                    <span className="font-semibold text-foreground">[Root]</span>
                    <br />
                    <span className="text-muted-foreground">
                      {tree.root_hash.substring(0, 10)}…
                    </span>
                  </div>
                  <div className="text-muted-foreground/50">/ \</div>
                  {tree.height > 2 && (
                    <div className="text-muted-foreground">
                      ↓ {tree.height - 2} nívei{tree.height - 2 > 1 ? "s" : ""} intermediário{tree.height - 2 > 1 ? "s" : ""} ↓
                    </div>
                  )}
                  <div className="font-semibold text-foreground">
                    [Folhas: {tree.leaf_count.toLocaleString("pt-BR")} ite{tree.leaf_count === 1 ? "m" : "ns"}]
                  </div>
                </div>
              </div>

              {/* Explainer */}
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-4">
                <p className="text-xs font-medium text-primary flex items-center gap-1.5 mb-1.5">
                  <Info className="h-3.5 w-3.5" />
                  O que isso significa?
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Esta "impressão digital" prova que os{" "}
                  {tree.leaf_count.toLocaleString("pt-BR")} ite
                  {tree.leaf_count === 1 ? "m" : "ns"} neste snapshot não foram
                  alterados. Se qualquer dado mudar, o hash muda completamente.
                </p>
              </div>

              {/* Tech Details (collapsible) */}
              <Collapsible open={techOpen} onOpenChange={setTechOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        techOpen && "rotate-180"
                      )}
                    />
                    🔧 Informações Técnicas
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Algoritmo</span>
                      <span className="font-mono text-foreground">{tree.hash_algorithm}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Altura da árvore</span>
                      <span className="font-mono text-foreground">{tree.height} níveis</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Folhas (itens)</span>
                      <span className="font-mono text-foreground">
                        {tree.leaf_count.toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tipo</span>
                      <span className="font-mono text-foreground">{tree.tree_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Criado em</span>
                      <span className="text-foreground">{formatTime(tree.created_at)}</span>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Verification History */}
              {verifications.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Histórico de verificações
                  </p>
                  <div className="space-y-1.5">
                    {verifications.map((v: MerkleVerification) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between text-xs bg-muted/30 border border-border rounded-lg px-3 py-2"
                      >
                        <span className="text-muted-foreground">
                          {formatTime(v.created_at)}
                        </span>
                        <Badge
                          variant={v.is_valid ? "default" : "destructive"}
                          className="text-[10px] h-5"
                        >
                          {v.is_valid ? "Válido" : "Inválido"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DrawerFooter className="flex-row gap-2">
          <DrawerClose asChild>
            <Button variant="outline" className="flex-1">
              Fechar
            </Button>
          </DrawerClose>
          {tree && (
            <Button
              className="flex-1 gap-2"
              onClick={() => verifyMutation.mutate()}
              disabled={verifyMutation.isPending}
            >
              {verifyMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
              Verificar Integridade
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
