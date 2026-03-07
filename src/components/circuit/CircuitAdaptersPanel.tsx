import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listCircuitAdapters,
  setupDefaultAdapters,
  updateCircuitAdapter,
  deleteCircuitAdapter,
  getPendingTokenizationCount,
  tokenizePendingItems,
} from "@/lib/api/circuit-adapters";
import type { CircuitAdapter } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Zap, HardDrive, Sparkles, Trash2, Loader2, Rocket, ShieldAlert } from "lucide-react";

const ADAPTER_ICONS: Record<string, typeof Zap> = {
  stellar: Zap,
  ipfs: HardDrive,
  nft: Sparkles,
};

const ADAPTER_COLORS: Record<string, string> = {
  stellar: "text-blue-500",
  ipfs: "text-emerald-500",
  nft: "text-purple-500",
};

export default function CircuitAdaptersPanel({ circuitId }: { circuitId: string }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [settingUp, setSettingUp] = useState(false);
  const [tokenizing, setTokenizing] = useState(false);
  const canManageTokenization = user?.workspace_type === "partner";

  const { data: adapters = [], isLoading } = useQuery({
    queryKey: ["circuit-adapters", circuitId],
    queryFn: () => listCircuitAdapters(circuitId),
    enabled: !!circuitId,
  });
  const { data: pendingInfo } = useQuery({
    queryKey: ["circuit-adapters-pending", circuitId],
    queryFn: () => getPendingTokenizationCount(circuitId),
    enabled: !!circuitId,
    refetchInterval: 30_000,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ adapterId, field, value }: { adapterId: string; field: string; value: boolean }) =>
      updateCircuitAdapter(circuitId, adapterId, { [field]: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circuit-adapters", circuitId] });
      toast({ title: "Adapter atualizado" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (adapterId: string) => deleteCircuitAdapter(circuitId, adapterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circuit-adapters", circuitId] });
      toast({ title: "Adapter removido" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const handleSetupDefaults = async () => {
    if (!canManageTokenization) {
      toast({
        title: "Disponível apenas para parceiros de dados",
        description:
          "No plano Free, tokenização automática via adapters está disponível apenas para workspace parceiro.",
      });
      return;
    }
    setSettingUp(true);
    try {
      await setupDefaultAdapters(circuitId);
      queryClient.invalidateQueries({ queryKey: ["circuit-adapters", circuitId] });
      toast({ title: "Adapters configurados!", description: "Stellar + IPFS habilitados com auto-publish." });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSettingUp(false);
    }
  };

  const handleToggleAdapter = (adapterId: string, field: string, value: boolean) => {
    if (!canManageTokenization) {
      toast({
        title: "Disponível apenas para parceiros de dados",
        description:
          "No plano Free, tokenização automática via adapters está disponível apenas para workspace parceiro.",
      });
      return;
    }
    toggleMutation.mutate({ adapterId, field, value });
  };

  const handleTokenizePending = async () => {
    if (!canManageTokenization) {
      toast({
        title: "Disponível apenas para parceiros de dados",
        description:
          "No plano Free, tokenização sob demanda está disponível apenas para workspace parceiro.",
      });
      return;
    }
    setTokenizing(true);
    try {
      const result = await tokenizePendingItems(circuitId);
      queryClient.invalidateQueries({ queryKey: ["circuit-adapters-pending", circuitId] });
      toast({
        title: "Tokenização em fila",
        description: `${result.enqueued_jobs} item(ns) pendente(s) enviados para processamento.`,
      });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setTokenizing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Adapters</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-24 w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" />
            Adapters (Publicação)
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              Pendentes: {pendingInfo?.pending_items ?? 0}
            </Badge>
            {adapters.length === 0 ? (
              <Button size="sm" onClick={handleSetupDefaults} disabled={settingUp}>
                {settingUp ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Zap className="h-4 w-4 mr-1" />}
                Setup Padrão
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!canManageTokenization ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Tokenização automática e “Tokenizar pendentes” estão disponíveis apenas para Parceiros de Dados.
            </span>
          </div>
        ) : null}

        {adapters.length > 0 && (pendingInfo?.pending_items ?? 0) > 0 ? (
          <Button
            size="sm"
            variant="outline"
            onClick={handleTokenizePending}
            disabled={tokenizing}
            className="w-full"
          >
            {tokenizing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Rocket className="h-4 w-4 mr-2" />}
            Tokenizar pendentes ({pendingInfo?.pending_items ?? 0})
          </Button>
        ) : null}

        {adapters.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum adapter configurado. Clique em "Setup Padrão" para habilitar Stellar + IPFS.
          </p>
        ) : (
          adapters.map((adapter) => {
            const Icon = ADAPTER_ICONS[adapter.adapter_type] || Zap;
            const color = ADAPTER_COLORS[adapter.adapter_type] || "text-primary";
            return (
              <div
                key={adapter.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${color}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground capitalize">
                      {adapter.adapter_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {adapter.adapter_type.toUpperCase()}
                      </Badge>
                      {adapter.trigger_events?.map((ev) => (
                        <span key={ev} className="text-[10px] text-muted-foreground">{ev}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Ativo</span>
                      <Switch
                        checked={adapter.is_enabled}
                        onCheckedChange={(val) => handleToggleAdapter(adapter.id, "is_enabled", val)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Auto</span>
                      <Switch
                        checked={adapter.auto_publish}
                        onCheckedChange={(val) => handleToggleAdapter(adapter.id, "auto_publish", val)}
                      />
                    </div>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover adapter?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Itens não serão mais publicados via {adapter.adapter_name}. Dados já publicados não são afetados.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            if (!canManageTokenization) {
                              toast({
                                title: "Disponível apenas para parceiros de dados",
                                description:
                                  "No plano Free, gerenciamento de adapters de tokenização está disponível apenas para workspace parceiro.",
                              });
                              return;
                            }
                            deleteMutation.mutate(adapter.id);
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
