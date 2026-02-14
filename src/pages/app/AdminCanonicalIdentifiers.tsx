import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createCanonicalIdentifier,
  listCanonicalIdentifiers,
  updateCanonicalIdentifier,
} from "@/lib/api/canonical-identifiers";
import type { CanonicalIdentifierResponse } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Fingerprint, Plus, Search, Loader2 } from "lucide-react";

const VALUE_CHAINS = ["BEEF", "SOY", "CORN", "COFFEE", "COTTON", "POULTRY", "PORK"];

export default function AdminCanonicalIdentifiers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedChain, setSelectedChain] = useState("BEEF");
  const [newType, setNewType] = useState("");
  const [newChain, setNewChain] = useState("BEEF");
  const [creating, setCreating] = useState(false);

  const { data: identifiers = [], isLoading } = useQuery({
    queryKey: ["canonical-identifiers", selectedChain],
    queryFn: () => listCanonicalIdentifiers(selectedChain),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updateCanonicalIdentifier(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["canonical-identifiers", selectedChain] });
      toast({ title: "Identificador atualizado" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const handleCreate = async () => {
    if (!newType.trim()) return;
    setCreating(true);
    try {
      await createCanonicalIdentifier({ value_chain: newChain, identifier_type: newType.trim() });
      queryClient.invalidateQueries({ queryKey: ["canonical-identifiers"] });
      toast({ title: "Identificador criado" });
      setNewType("");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Fingerprint className="h-6 w-6" /> Identificadores Canônicos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerenciar tipos de identificadores por cadeia de valor.
          </p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Novo Identificador</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Identificador Canônico</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Cadeia de Valor</Label>
                <select
                  value={newChain}
                  onChange={(e) => setNewChain(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {VALUE_CHAINS.map((vc) => (
                    <option key={vc} value={vc}>{vc}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Tipo do Identificador</Label>
                <Input
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  placeholder="Ex: SISBOV, GTA, NF-e"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="ghost">Cancelar</Button></DialogClose>
              <Button onClick={handleCreate} disabled={creating || !newType.trim()}>
                {creating ? "Criando..." : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Chain selector */}
      <div className="flex flex-wrap gap-2">
        {VALUE_CHAINS.map((vc) => (
          <Button
            key={vc}
            variant={selectedChain === vc ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedChain(vc)}
          >
            {vc}
          </Button>
        ))}
      </div>

      {/* Identifiers list */}
      {isLoading ? (
        <Card><CardContent className="pt-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
      ) : identifiers.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground py-8">
            Nenhum identificador canônico para {selectedChain}.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {identifiers.map((ident) => (
            <Card key={ident.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{ident.identifier_type}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {ident.value_chain} · {new Date(ident.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={ident.is_active ? "default" : "secondary"} className="text-xs">
                      {ident.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                    <Switch
                      checked={ident.is_active}
                      onCheckedChange={(val) => toggleMutation.mutate({ id: ident.id, is_active: val })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
