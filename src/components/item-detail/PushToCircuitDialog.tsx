import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GitBranch, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getCircuits, pushItemToCircuit, Item } from "@/lib/defarm-api";

interface PushToCircuitDialogProps {
  item: Item;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PushToCircuitDialog({
  item,
  open,
  onOpenChange,
}: PushToCircuitDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCircuit, setSelectedCircuit] = useState<string>("");

  // Fetch available circuits
  const { data: circuits = [], isLoading } = useQuery({
    queryKey: ["circuits"],
    queryFn: () => getCircuits(),
    enabled: open,
  });

  // Push mutation
  const pushMutation = useMutation({
    mutationFn: ({ circuitId, itemId }: { circuitId: string; itemId: string }) =>
      pushItemToCircuit(circuitId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itemEvents", item.dfid] });
      queryClient.invalidateQueries({ queryKey: ["item", item.dfid] });
      toast({
        title: "Item enviado!",
        description: "O item foi adicionado ao circuito com sucesso.",
      });
      onOpenChange(false);
      setSelectedCircuit("");
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar item",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const handlePush = () => {
    if (selectedCircuit && item.id) {
      pushMutation.mutate({ circuitId: selectedCircuit, itemId: item.id });
    }
  };

  // Filter active circuits only
  const activeCircuits = circuits.filter((c) => c.status === "Active");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Push para Circuito
          </DialogTitle>
          <DialogDescription>
            Selecione o circuito para onde deseja enviar o item{" "}
            <span className="font-mono text-xs">{item.dfid}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : activeCircuits.length > 0 ? (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {activeCircuits.map((circuit) => (
                <button
                  key={circuit.id}
                  onClick={() => setSelectedCircuit(circuit.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-lg border transition-all",
                    selectedCircuit === circuit.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{circuit.name}</p>
                      {circuit.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {circuit.description}
                        </p>
                      )}
                    </div>
                    {selectedCircuit === circuit.id && (
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 ml-2" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum circuito ativo disponível</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handlePush}
            disabled={!selectedCircuit || pushMutation.isPending}
          >
            {pushMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <GitBranch className="h-4 w-4 mr-2" />
                Enviar para Circuito
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
