import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getCircuits } from "@/lib/api/circuits";
import {
  createCircuitFeed,
  listCircuitFeeds,
  revokeCircuitFeed,
} from "@/lib/api/circuit-feeds";
import { ArrowRight, ArrowLeft, Plus, X, Workflow } from "lucide-react";

// Tipos de artefato p/ o escopo (vazio = todos). Labels em PT, sem jargão.
const ARTIFACT_TYPES: { value: string; label: string }[] = [
  { value: "animal", label: "Animal" },
  { value: "commodity", label: "Commodity (grão/café)" },
  { value: "lot", label: "Lote" },
  { value: "property", label: "Propriedade" },
  { value: "producer", label: "Produtor" },
  { value: "shipment", label: "Carga/exportação" },
  { value: "document", label: "Documento" },
  { value: "group", label: "Grupo" },
];

export function CircuitFeeds({ circuitId }: { circuitId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [scope, setScope] = useState<string[]>([]);

  const feedsQuery = useQuery({
    queryKey: ["circuit-feeds", circuitId],
    queryFn: () => listCircuitFeeds(circuitId),
  });
  const circuitsQuery = useQuery({
    queryKey: ["circuits-for-feed"],
    queryFn: () => getCircuits(),
  });

  const nameOf = useMemo(() => {
    const map = new Map((circuitsQuery.data ?? []).map((c) => [c.id, c.name]));
    return (id: string) => map.get(id) ?? "Outro circuito";
  }, [circuitsQuery.data]);

  const feeds = (feedsQuery.data ?? []).filter((f) => f.status === "active");
  const outgoing = feeds.filter((f) => f.source_circuit_id === circuitId);
  const incoming = feeds.filter((f) => f.target_circuit_id === circuitId);
  // Alvos possíveis = circuitos do usuário, menos o próprio e os que já têm feed ativo.
  const targetOptions = (circuitsQuery.data ?? []).filter(
    (c) => c.id !== circuitId && !outgoing.some((f) => f.target_circuit_id === c.id),
  );

  const createMut = useMutation({
    mutationFn: () => createCircuitFeed(circuitId, target, scope.length ? scope : null),
    onSuccess: (res) => {
      toast({
        title: "Feed criado",
        description: `Este circuito agora alimenta "${nameOf(res.feed.target_circuit_id)}". ${res.backfilled} item(ns) existente(s) já propagado(s).`,
      });
      qc.invalidateQueries({ queryKey: ["circuit-feeds", circuitId] });
      setOpen(false);
      setTarget("");
      setScope([]);
    },
    onError: () =>
      toast({ title: "Não foi possível criar o feed", variant: "destructive" }),
  });

  const revokeMut = useMutation({
    mutationFn: (feedId: string) => revokeCircuitFeed(circuitId, feedId),
    onSuccess: () => {
      toast({ title: "Feed revogado" });
      qc.invalidateQueries({ queryKey: ["circuit-feeds", circuitId] });
    },
    onError: () =>
      toast({ title: "Não foi possível revogar o feed", variant: "destructive" }),
  });

  const scopeLabel = (s: string[] | null) =>
    !s || s.length === 0
      ? "todos os tipos"
      : s.map((t) => ARTIFACT_TYPES.find((a) => a.value === t)?.label ?? t).join(", ");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Workflow className="h-4 w-4 text-primary" />
          Feeds entre circuitos
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" /> Alimentar outro circuito
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alimentar outro circuito</DialogTitle>
              <DialogDescription>
                Os itens deste circuito passam a aparecer também no circuito escolhido —
                automaticamente e sem duplicar. Você pode revogar quando quiser.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Circuito de destino
                </label>
                <Select value={target} onValueChange={setTarget}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha o circuito que vai receber" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Quais tipos propagar?{" "}
                  <span className="font-normal normal-case">(vazio = todos)</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {ARTIFACT_TYPES.map((t) => (
                    <label key={t.value} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={scope.includes(t.value)}
                        onCheckedChange={(c) =>
                          setScope((prev) =>
                            c ? [...prev, t.value] : prev.filter((x) => x !== t.value),
                          )
                        }
                      />
                      {t.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => createMut.mutate()}
                disabled={!target || createMut.isPending}
              >
                Criar feed
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Um feed faz os itens deste circuito aparecerem em outro automaticamente (mesmo
          DFID, sem cópia). Útil pra alimentar um circuito-sistema sem refazer integração.
        </p>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Este circuito alimenta
          </p>
          {outgoing.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum feed ativo.</p>
          ) : (
            <ul className="space-y-1.5">
              {outgoing.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 p-2.5 text-sm"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="truncate font-medium">
                      {nameOf(f.target_circuit_id)}
                    </span>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {scopeLabel(f.scope_artifact_types)}
                    </Badge>
                  </span>
                  <button
                    type="button"
                    onClick={() => revokeMut.mutate(f.id)}
                    disabled={revokeMut.isPending}
                    className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
                  >
                    <X className="h-3.5 w-3.5" /> Revogar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {incoming.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Alimentado por
            </p>
            <ul className="space-y-1.5">
              {incoming.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-2.5 text-sm"
                >
                  <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">{nameOf(f.source_circuit_id)}</span>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {scopeLabel(f.scope_artifact_types)}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
