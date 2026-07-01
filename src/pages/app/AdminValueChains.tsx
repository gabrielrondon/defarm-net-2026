import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createValueChainPolicy,
  deleteValueChainPolicy,
  listValueChainPolicies,
  updateValueChainPolicy,
} from "@/lib/api/value-chains";
import type { ValueChainPolicy } from "@/lib/api/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Layers, Plus, Trash2 } from "lucide-react";

export default function AdminValueChains() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newIsActive, setNewIsActive] = useState(true);
  const [newIsTestOnly, setNewIsTestOnly] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ValueChainPolicy | null>(null);

  const { data: rows = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-value-chains"],
    queryFn: () => listValueChainPolicies(false),
  });

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => a.code.localeCompare(b.code)),
    [rows]
  );

  const createMutation = useMutation({
    mutationFn: () =>
      createValueChainPolicy({
        code: newCode.trim(),
        display_name: newName.trim(),
        is_active: newIsActive,
        is_test_only: newIsTestOnly,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-value-chains"] });
      toast({ title: "Cadeia criada" });
      setNewCode("");
      setNewName("");
      setNewIsActive(true);
      setNewIsTestOnly(false);
      setCreateOpen(false);
    },
    onError: (err: any) => {
      toast({
        title: "Falha ao criar cadeia",
        description: err?.message ?? "Erro inesperado",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ValueChainPolicy> }) =>
      updateValueChainPolicy(id, {
        display_name: patch.display_name,
        is_active: patch.is_active,
        is_test_only: patch.is_test_only,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-value-chains"] });
    },
    onError: (err: any) => {
      toast({
        title: "Falha ao atualizar cadeia",
        description: err?.message ?? "Erro inesperado",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteValueChainPolicy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-value-chains"] });
      toast({ title: "Cadeia removida" });
      setDeletingId(null);
    },
    onError: (err: any) => {
      toast({
        title: "Falha ao remover cadeia",
        description: err?.message ?? "Erro inesperado",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Layers className="h-6 w-6" /> Cadeias de Valor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Fonte de verdade para value_chain aceitas em preview e ingestão de parceiro.
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova cadeia
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar cadeia de valor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Código</Label>
                <Input
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  placeholder="Ex: BEEF"
                />
              </div>
              <div>
                <Label>Nome de exibição</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Bovinos"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={newIsActive} onCheckedChange={setNewIsActive} />
                <Label>Ativa</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={newIsTestOnly} onCheckedChange={setNewIsTestOnly} />
                <Label>Somente teste</Label>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Cancelar</Button>
              </DialogClose>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!newCode.trim() || !newName.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? "Criando..." : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-28 w-full" />
          </CardContent>
        </Card>
      ) : isError ? (
        <Card>
          <CardContent className="pt-6 text-center py-8 space-y-3">
            <p className="text-sm text-destructive">
              Falha ao carregar cadeias de valor.
            </p>
            <p className="text-xs text-muted-foreground">
              {(error as Error)?.message || "Erro inesperado no endpoint /admin/value-chains."}
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : sortedRows.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground py-8">
            Nenhuma cadeia cadastrada.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Teste</TableHead>
                  <TableHead>Tipo padrão</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.code}</TableCell>
                    <TableCell>
                      <Input
                        defaultValue={row.display_name}
                        onBlur={(e) => {
                          const next = e.target.value.trim();
                          if (!next || next === row.display_name) return;
                          updateMutation.mutate({
                            id: row.id,
                            patch: { display_name: next },
                          });
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={row.is_active}
                          onCheckedChange={(checked) =>
                            updateMutation.mutate({
                              id: row.id,
                              patch: { is_active: checked },
                            })
                          }
                        />
                        <Badge variant={row.is_active ? "default" : "secondary"}>
                          {row.is_active ? "Ativa" : "Inativa"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={row.is_test_only}
                          onCheckedChange={(checked) =>
                            updateMutation.mutate({
                              id: row.id,
                              patch: { is_test_only: checked },
                            })
                          }
                        />
                        {row.is_test_only ? <Badge variant="outline">Sim</Badge> : <Badge variant="secondary">Não</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.primary_artifact_type ? (
                        <Badge variant="outline" className="capitalize">{row.primary_artifact_type}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{new Date(row.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setPendingDelete(row);
                        }}
                        disabled={deleteMutation.isPending && deletingId === row.id}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {deleteMutation.isPending && deletingId === row.id ? "Removendo..." : "Remover"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cadeia de valor?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove a política <strong>{pendingDelete?.code}</strong> e pode impactar validação de ingestão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (!pendingDelete) return;
                setDeletingId(pendingDelete.id);
                deleteMutation.mutate(pendingDelete.id);
              }}
            >
              {deleteMutation.isPending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
