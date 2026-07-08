import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: () => updateItemStatus(item.id, { status: "archived" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item", item.id] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast.success(t("portal.items.deprecateDialog.toastSuccess"));
      onOpenChange(false);
      navigate("/app/itens");
    },
    onError: (error: Error) => {
      toast.error(t("portal.items.deprecateDialog.toastError", { msg: error.message }));
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {t("portal.items.deprecateDialog.title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            <Trans
              i18nKey="portal.items.deprecateDialog.desc"
              values={{ dfid: item?.dfid || item?.id || "" }}
              components={{ dfid: <span className="font-mono font-medium text-foreground" /> }}
            />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("portal.common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("portal.items.deprecateDialog.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
