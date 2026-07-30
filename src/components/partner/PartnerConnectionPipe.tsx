import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2, Plug, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getPartnerDefaultCircuit } from "@/lib/api/partner-routing";
import { getCircuits } from "@/lib/api/circuits";
import { getPublicCircuits } from "@/lib/api/join-requests";
import {
  createFeedRequest,
  listCircuitFeeds,
  revokeCircuitFeed,
  type CircuitFeed,
} from "@/lib/api/circuit-feeds";
import type { PublicCircuitInfo } from "@/lib/api/types";

/**
 * O "cano de conexão" do portal (redesign parceiro, fase 1): responde de cara
 * "meus dados já valem em algum circuito de destino?". Três estados — sem
 * conexão / pedido pendente / conectado — derivados dos circuit feeds que já
 * existem (Track B). O destino NÃO é fixo: o parceiro escolhe entre os
 * circuitos públicos descobríveis (featured primeiro), e pode conectar mais
 * de um. Só APIs existentes; nenhuma mudança de contrato.
 */

// Sub-estado do trecho source→target do cano, na perspectiva do parceiro
// (source = meu circuito padrão). Feeds onde NÃO sou o source (invites de
// terceiros etc.) ficam fora daqui — continuam no detalhe do circuito.
type PipeState = "none" | "pending" | "connected";

export function PartnerConnectionPipe() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<PublicCircuitInfo | null>(null);
  const [shareLayers, setShareLayers] = useState(false);

  const sourceQuery = useQuery({
    queryKey: ["partner-default-circuit"],
    queryFn: getPartnerDefaultCircuit,
    staleTime: 60_000,
  });
  const sourceId = sourceQuery.data?.circuit_id;

  const feedsQuery = useQuery({
    queryKey: ["partner-connection-feeds", sourceId],
    queryFn: () => listCircuitFeeds(sourceId!),
    enabled: !!sourceId,
  });

  const ownCircuitsQuery = useQuery({
    queryKey: ["circuits-own-for-pipe"],
    queryFn: () => getCircuits(),
    staleTime: 60_000,
  });

  // Também serve de fonte de nomes pros targets dos feeds (além do picker).
  const publicQuery = useQuery({
    queryKey: ["public-circuits-for-pipe"],
    queryFn: () => getPublicCircuits({ limit: 50 }),
    staleTime: 300_000,
  });

  const nameOf = useMemo(() => {
    const map = new Map<string, string>();
    (ownCircuitsQuery.data ?? []).forEach((c) => map.set(c.id, c.name));
    (publicQuery.data?.circuits ?? []).forEach((c) => map.set(c.id, c.name));
    return (id: string) => map.get(id) ?? `${id.slice(0, 8)}…`;
  }, [ownCircuitsQuery.data, publicQuery.data]);

  // Só o que EU iniciei a partir do meu circuito padrão.
  const outgoing = (feedsQuery.data ?? []).filter((f) => f.source_circuit_id === sourceId);
  const active = outgoing.filter((f) => f.status === "active");
  const pending = outgoing.filter((f) => f.status === "pending");

  const state: PipeState = active.length > 0 ? "connected" : pending.length > 0 ? "pending" : "none";
  // O feed exibido na linha principal do cano; os demais viram lista compacta.
  const primary: CircuitFeed | undefined = active[0] ?? pending[0];
  const others = outgoing.filter((f) => f.id !== primary?.id && f.status !== "revoked");

  const requestMutation = useMutation({
    mutationFn: ({ targetId, layers }: { targetId: string; layers: boolean }) =>
      createFeedRequest(sourceId!, targetId, null, layers),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-connection-feeds", sourceId] });
      toast({ title: t("portal.pipe.toast.requestedTitle"), description: t("portal.pipe.toast.requestedDesc") });
      setPickerOpen(false);
      setTarget(null);
      setShareLayers(false);
    },
    onError: (err) =>
      toast({
        title: t("portal.pipe.toast.errorTitle"),
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      }),
  });

  const cancelMutation = useMutation({
    mutationFn: (feedId: string) => revokeCircuitFeed(sourceId!, feedId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-connection-feeds", sourceId] });
      toast({ title: t("portal.pipe.toast.canceledTitle") });
    },
    onError: (err) =>
      toast({
        title: t("portal.pipe.toast.errorTitle"),
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      }),
  });

  // Sem circuito padrão resolvido ainda (parceiro recém-criado): não ocupamos a
  // home com um cano vazio — os botões essenciais guiam o primeiro passo.
  if (sourceQuery.isLoading || (sourceQuery.isError && !sourceId)) return null;
  if (!sourceId) return null;

  const source = sourceQuery.data!;
  const connectedTargetIds = new Set(outgoing.filter((f) => f.status !== "revoked").map((f) => f.target_circuit_id));
  const ownIds = new Set((ownCircuitsQuery.data ?? []).map((c) => c.id));

  const candidates = (publicQuery.data?.circuits ?? [])
    .filter((c) => !ownIds.has(c.id) && !connectedTargetIds.has(c.id))
    .filter((c) => (search.trim() ? c.name.toLowerCase().includes(search.trim().toLowerCase()) : true))
    .sort((a, b) => Number(b.featured) - Number(a.featured) || b.item_count - a.item_count);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, { day: "2-digit", month: "short" });

  const stateBadge =
    state === "connected" ? (
      <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-0">
        {t("portal.pipe.connectedBadge")}
      </Badge>
    ) : state === "pending" ? (
      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-0 dark:bg-amber-950 dark:text-amber-300">
        {t("portal.pipe.pendingBadge", { date: primary ? fmtDate(primary.created_at) : "" })}
      </Badge>
    ) : (
      <Badge variant="secondary">{t("portal.pipe.noneBadge")}</Badge>
    );

  // Trecho source→target: cor/traço acompanham o estado.
  const segmentClass =
    state === "connected"
      ? "border-primary"
      : state === "pending"
        ? "border-dashed border-amber-500"
        : "border-dashed border-border";

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 mb-8">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {t("portal.pipe.title")}
        </p>
        {feedsQuery.isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : stateBadge}
      </div>

      {/* O cano: Seus envios ─ Circuito padrão ─ Destino */}
      <div className="flex items-center overflow-x-auto pb-1">
        <div className="shrink-0 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <p className="text-sm font-medium text-foreground whitespace-nowrap">{t("portal.pipe.sends")}</p>
          <p className="text-xs text-muted-foreground whitespace-nowrap">{t("portal.pipe.sendsHint")}</p>
        </div>

        <div className="pipe-flow flex-1 min-w-8 border-t-2 border-primary" aria-hidden />

        <div className="shrink-0 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <p className="text-sm font-medium text-foreground whitespace-nowrap">{source.name}</p>
          <p className="text-xs text-muted-foreground whitespace-nowrap">
            {source.is_staging ? t("portal.pipe.stagingHint") : t("portal.pipe.circuitHint")}
          </p>
        </div>

        <div
          className={`relative flex-1 min-w-8 border-t-2 ${segmentClass} ${state === "connected" ? "pipe-flow" : ""}`}
          aria-hidden
        >
          {/* Trecho rompido: o ✕ diz visualmente "aqui ainda não passa nada" */}
          {state === "none" && (
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full bg-card border border-border text-muted-foreground text-[10px] leading-none grid place-items-center">
              ✕
            </span>
          )}
        </div>

        {primary ? (
          <div
            className={`shrink-0 rounded-lg border px-3 py-2 ${
              state === "connected" ? "border-primary/40 bg-primary/5" : "border-border bg-muted/30"
            }`}
          >
            <p className="text-sm font-medium text-foreground whitespace-nowrap">
              {nameOf(primary.target_circuit_id)}
            </p>
            <p className="text-xs text-muted-foreground whitespace-nowrap">
              {primary.status === "active"
                ? t("portal.pipe.targetActiveHint")
                : t("portal.pipe.targetPendingHint")}
            </p>
          </div>
        ) : (
          <Button size="sm" className="shrink-0" onClick={() => setPickerOpen(true)}>
            <Plug className="h-3.5 w-3.5 mr-1.5" />
            {t("portal.pipe.connectCta")}
          </Button>
        )}
      </div>

      {/* Nota de rodapé + ações por estado */}
      <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground">
          {state === "connected"
            ? t("portal.pipe.connectedNote")
            : state === "pending"
              ? t("portal.pipe.pendingNote")
              : t("portal.pipe.noneNote")}
        </p>
        <div className="flex items-center gap-2">
          {state === "pending" && primary && (
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate(primary.id)}
            >
              {t("portal.pipe.cancelRequest")}
            </Button>
          )}
          {primary && (
            <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
              {t("portal.pipe.addAnother")}
            </Button>
          )}
        </div>
      </div>

      {/* Conexões além da principal, em lista compacta */}
      {others.length > 0 && (
        <div className="mt-3 border-t border-border pt-2 space-y-1">
          {others.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">
                <span className="text-foreground font-medium">{nameOf(f.target_circuit_id)}</span>
                {" · "}
                {f.status === "active"
                  ? t("portal.pipe.targetActiveHint")
                  : t("portal.pipe.targetPendingHint")}
              </span>
              {f.status === "pending" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-muted-foreground"
                  disabled={cancelMutation.isPending}
                  onClick={() => cancelMutation.mutate(f.id)}
                >
                  {t("portal.pipe.cancelRequest")}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Passo 1: escolher o circuito de destino */}
      <Dialog
        open={pickerOpen && !target}
        onOpenChange={(o) => {
          setPickerOpen(o);
          if (!o) setSearch("");
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("portal.pipe.picker.title")}</DialogTitle>
            <DialogDescription>{t("portal.pipe.picker.subtitle")}</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("portal.pipe.picker.search")}
              className="pl-9"
            />
          </div>
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {publicQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t("portal.pipe.picker.empty")}
              </p>
            ) : (
              candidates.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setTarget(c)}
                  className="w-full text-left rounded-lg border border-border p-3 hover:border-primary/60 hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {c.featured && (
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-0 text-[10px]">
                          {t("portal.pipe.picker.recommended")}
                        </Badge>
                      )}
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </span>
                  </div>
                  {(c.public_description || c.description) && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {c.public_description || c.description}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {t("portal.pipe.picker.counts", { items: c.item_count, members: c.member_count })}
                  </p>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Passo 2: consentimento — o que compartilhar (esqueleto × carne, #Fase 5) */}
      <Dialog
        open={!!target}
        onOpenChange={(o) => {
          if (!o) {
            setTarget(null);
            setShareLayers(false);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("portal.pipe.consent.title", { name: target?.name ?? "" })}</DialogTitle>
            <DialogDescription>
              {t("portal.pipe.consent.subtitle", { source: source.name, target: target?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("portal.pipe.consent.question")}
          </p>
          <div className="space-y-2">
            {(
              [
                { layers: false, key: "skeleton" },
                { layers: true, key: "full" },
              ] as const
            ).map((opt) => {
              const selected = shareLayers === opt.layers;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setShareLayers(opt.layers)}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-muted-foreground/40"
                  }`}
                >
                  <p className="text-sm font-medium text-foreground">
                    {t(`portal.pipe.consent.${opt.key}Label`)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t(`portal.pipe.consent.${opt.key}Desc`)}
                  </p>
                  {opt.key === "skeleton" && (
                    <Badge className="mt-1.5 bg-primary/10 text-primary hover:bg-primary/10 border-0 text-[10px]">
                      {t("portal.pipe.consent.recommended")}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">{t("portal.pipe.consent.privacy")}</p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTarget(null);
                setShareLayers(false);
              }}
            >
              {t("portal.pipe.consent.cancel")}
            </Button>
            <Button
              disabled={requestMutation.isPending}
              onClick={() => target && requestMutation.mutate({ targetId: target.id, layers: shareLayers })}
            >
              {requestMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {t("portal.pipe.consent.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
