import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { updateItemStatus, Item } from "@/lib/defarm-api";

interface DeprecateItemDialogProps {
  item: Item;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeprecateItemDialog({ item, open, onOpenChange }: DeprecateItemDialogProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: () => updateItemStatus(item.id, { status: "archived" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item", item.id] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast.success("Item depreciado com sucesso");
      onOpenChange(false);
      navigate("/app/itens");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao depreciar: ${error.message}`);
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Depreciar Item
          </AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja depreciar o item{" "}
            <span className="font-mono font-medium text-foreground">
              {item?.dfid || item?.id || ""}
            </span>
            ? O item será arquivado mas seus dados serão preservados para auditoria.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Depreciar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
