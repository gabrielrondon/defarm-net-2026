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
  createFeedInvitation,
  createFeedRequest,
  acceptFeed,
  rejectFeed,
  listCircuitFeeds,
  revokeCircuitFeed,
  feedSharesLayers,
  type CircuitFeed,
} from "@/lib/api/circuit-feeds";
import { ArrowRight, ArrowLeft, Plus, X, Check, Clock, Workflow } from "lucide-react";

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

// Os 3 modos de conexão. grant = ativa na hora (eu sou dono do dado). invite/request
// precisam do consentimento do outro lado.
type Mode = "grant" | "invite" | "request";
const MODES: { value: Mode; label: string; help: string; pick: string }[] = [
  {
    value: "grant",
    label: "Alimentar outro circuito",
    help: "Meus itens passam a aparecer lá automaticamente (ativa na hora).",
    pick: "Circuito que vai receber",
  },
  {
    value: "invite",
    label: "Convidar um circuito a me alimentar",
    help: "Os itens dele passam a aparecer aqui — ele precisa aceitar o convite.",
    pick: "Circuito que você quer convidar",
  },
  {
    value: "request",
    label: "Pedir para alimentar outro circuito",
    help: "Meus itens vão para lá — o dono do circuito precisa aprovar o pedido.",
    pick: "Circuito que você quer alimentar",
  },
];

export function CircuitFeeds({ circuitId }: { circuitId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("grant");
  const [picked, setPicked] = useState("");
  const [scope, setScope] = useState<string[]>([]);
  // Fase 5 (esqueleto×carne): opt-in explícito p/ compartilhar as camadas de
  // atributos (carne), não só o esqueleto. Default OFF, espelhando o backend.
  const [shareLayers, setShareLayers] = useState(false);

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
    return (id: string) => map.get(id) ?? `Circuito ${id.slice(0, 8)}...`;
  }, [circuitsQuery.data]);

  const all = feedsQuery.data ?? [];
  const active = all.filter((f) => f.status === "active");
  const pending = all.filter((f) => f.status === "pending");
  const outgoing = active.filter((f) => f.source_circuit_id === circuitId);
  const incoming = active.filter((f) => f.target_circuit_id === circuitId);

  // Precisa da minha ação (sou o lado que consente):
  //  invite onde sou source (me convidaram) / request onde sou target (querem me alimentar).
  const toAct = pending.filter(
    (f) =>
      (f.direction === "invite" && f.source_circuit_id === circuitId) ||
      (f.direction === "request" && f.target_circuit_id === circuitId),
  );
  // Aguardando o outro (eu iniciei):
  //  invite onde sou target (convidei) / request onde sou source (pedi).
  const waiting = pending.filter(
    (f) =>
      (f.direction === "invite" && f.target_circuit_id === circuitId) ||
      (f.direction === "request" && f.source_circuit_id === circuitId),
  );

  // O "outro circuito" de um feed (o que não sou eu).
  const otherOf = (f: CircuitFeed) =>
    f.source_circuit_id === circuitId ? f.target_circuit_id : f.source_circuit_id;

  const otherCircuits = (circuitsQuery.data ?? []).filter((c) => c.id !== circuitId);
  const activeMode = MODES.find((m) => m.value === mode)!;

  const resetForm = () => {
    setMode("grant");
    setPicked("");
    setScope([]);
    setShareLayers(false);
    setOpen(false);
  };

  const createMut = useMutation({
    mutationFn: () => {
      const sc = scope.length ? scope : null;
      if (mode === "grant") return createCircuitFeed(circuitId, picked, sc, shareLayers);
      if (mode === "invite") return createFeedInvitation(circuitId, picked, sc, shareLayers);
      return createFeedRequest(circuitId, picked, sc, shareLayers);
    },
    onSuccess: () => {
      toast({
        title:
          mode === "grant"
            ? "Feed criado"
            : mode === "invite"
              ? "Convite enviado"
              : "Pedido enviado",
        description:
          mode === "grant"
            ? `Este circuito agora alimenta "${nameOf(picked)}".`
            : mode === "invite"
              ? `Convite enviado para "${nameOf(picked)}". Aguardando o aceite.`
              : `Pedido enviado para "${nameOf(picked)}". Aguardando aprovação.`,
      });
      qc.invalidateQueries({ queryKey: ["circuit-feeds", circuitId] });
      resetForm();
    },
    onError: () => toast({ title: "Não foi possível criar a conexão", variant: "destructive" }),
  });

  const revokeMut = useMutation({
    mutationFn: (feedId: string) => revokeCircuitFeed(circuitId, feedId),
    onSuccess: () => {
      toast({ title: "Feed revogado" });
      qc.invalidateQueries({ queryKey: ["circuit-feeds", circuitId] });
    },
    onError: () => toast({ title: "Não foi possível revogar o feed", variant: "destructive" }),
  });

  const acceptMut = useMutation({
    mutationFn: (feedId: string) => acceptFeed(feedId),
    onSuccess: (res) => {
      toast({
        title: "Conexão ativada",
        description: `${res.backfilled} item(ns) existente(s) já propagado(s).`,
      });
      qc.invalidateQueries({ queryKey: ["circuit-feeds", circuitId] });
    },
    onError: () => toast({ title: "Não foi possível aceitar", variant: "destructive" }),
  });

  const rejectMut = useMutation({
    mutationFn: (feedId: string) => rejectFeed(feedId),
    onSuccess: () => {
      toast({ title: "Recusado" });
      qc.invalidateQueries({ queryKey: ["circuit-feeds", circuitId] });
    },
    onError: () => toast({ title: "Não foi possível recusar", variant: "destructive" }),
  });

  const scopeLabel = (s: string[] | null) =>
    !s || s.length === 0
      ? "todos os tipos"
      : s.map((t) => ARTIFACT_TYPES.find((a) => a.value === t)?.label ?? t).join(", ");

  // Fase 5: mostra no badge do feed se ele também compartilha as camadas (carne),
  // não só o esqueleto — junto do escopo de tipos.
  const feedLabel = (f: CircuitFeed) =>
    scopeLabel(f.scope_artifact_types) + (feedSharesLayers(f) ? " · camadas" : "");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Workflow className="h-4 w-4 text-primary" />
          Feeds entre circuitos
        </CardTitle>
        <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : resetForm())}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" /> Conectar circuito
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Conectar circuito</DialogTitle>
              <DialogDescription>
                Conecte circuitos para que itens fluam de um para o outro (mesmo DFID, sem
                duplicar). Útil pra alimentar um circuito-sistema sem refazer integração.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  O que você quer fazer?
                </label>
                <Select value={mode} onValueChange={(v: Mode) => setMode(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{activeMode.help}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {activeMode.pick}
                </label>
                <Select value={picked} onValueChange={setPicked}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha o circuito" />
                  </SelectTrigger>
                  <SelectContent>
                    {otherCircuits.map((c) => (
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
              <label className="flex items-start gap-2 rounded-md border border-border/60 p-2.5 text-sm">
                <Checkbox
                  className="mt-0.5"
                  checked={shareLayers}
                  onCheckedChange={(c) => setShareLayers(c === true)}
                />
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium">Compartilhar camadas de atributos (carne)</span>
                  <span className="text-xs text-muted-foreground">
                    Por padrão só o esqueleto (o item) viaja. Marque para também
                    compartilhar a metadata que este circuito contribuiu — sempre filtrada
                    (nunca dados pessoais), e isso não a torna pública. Revogável a qualquer
                    momento.
                  </span>
                </span>
              </label>
            </div>
            <DialogFooter>
              <Button onClick={() => createMut.mutate()} disabled={!picked || createMut.isPending}>
                {mode === "grant" ? "Criar feed" : mode === "invite" ? "Enviar convite" : "Enviar pedido"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Um feed faz os itens de um circuito aparecerem em outro automaticamente (mesmo
          DFID, sem cópia). Entre organizações diferentes, há consentimento dos dois lados.
        </p>

        {/* Precisa de você — convites/pedidos a responder */}
        {toAct.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-2">
              Precisa de você
            </p>
            <ul className="space-y-1.5">
              {toAct.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2.5 text-sm"
                >
                  <span className="min-w-0">
                    <span className="font-medium">{nameOf(otherOf(f))}</span>{" "}
                    <span className="text-muted-foreground">
                      {f.direction === "invite"
                        ? "convidou você a alimentá-lo"
                        : "quer alimentar este circuito"}
                    </span>
                    <Badge variant="secondary" className="ml-1.5 text-[10px]">
                      {feedLabel(f)}
                    </Badge>
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 px-2"
                      disabled={acceptMut.isPending || rejectMut.isPending}
                      onClick={() => acceptMut.mutate(f.id)}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      {f.direction === "invite" ? "Aceitar" : "Aprovar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-muted-foreground hover:text-destructive"
                      disabled={acceptMut.isPending || rejectMut.isPending}
                      onClick={() => rejectMut.mutate(f.id)}
                    >
                      <X className="h-3.5 w-3.5 mr-1" /> Recusar
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Aguardando resposta — eu iniciei */}
        {waiting.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Aguardando resposta
            </p>
            <ul className="space-y-1.5">
              {waiting.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center gap-2 rounded-lg border border-dashed border-border p-2.5 text-sm text-muted-foreground"
                >
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {f.direction === "invite"
                      ? `Convidou ${nameOf(otherOf(f))} — aguardando aceite`
                      : `Pediu para alimentar ${nameOf(otherOf(f))} — aguardando aprovação`}
                  </span>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {feedLabel(f)}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

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
                    <span className="truncate font-medium">{nameOf(f.target_circuit_id)}</span>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {feedLabel(f)}
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
                    {feedLabel(f)}
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
