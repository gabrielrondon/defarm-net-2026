import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listCircuitAdapters,
  setupDefaultAdapters,
  updateCircuitAdapter,
  deleteCircuitAdapter,
} from "@/lib/api/circuit-adapters";
import type { CircuitAdapter } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Zap, HardDrive, Sparkles, Trash2, Loader2, Rocket } from "lucide-react";

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
  const queryClient = useQueryClient();
  const [settingUp, setSettingUp] = useState(false);

  const { data: adapters = [], isLoading } = useQuery({
    queryKey: ["circuit-adapters", circuitId],
    queryFn: () => listCircuitAdapters(circuitId),
    enabled: !!circuitId,
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
          {adapters.length === 0 && (
            <Button size="sm" onClick={handleSetupDefaults} disabled={settingUp}>
              {settingUp ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Zap className="h-4 w-4 mr-1" />}
              Setup Padrão
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
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
                        onCheckedChange={(val) =>
                          toggleMutation.mutate({ adapterId: adapter.id, field: "is_enabled", value: val })
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Auto</span>
                      <Switch
                        checked={adapter.auto_publish}
                        onCheckedChange={(val) =>
                          toggleMutation.mutate({ adapterId: adapter.id, field: "auto_publish", value: val })
                        }
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
                          onClick={() => deleteMutation.mutate(adapter.id)}
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
