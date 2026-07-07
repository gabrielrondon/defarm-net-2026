import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { deleteCircuit, Circuit } from "@/lib/defarm-api";
import { useAuth } from "@/contexts/AuthContext";
import { circuitsListPath } from "@/lib/circuitNav";

interface DeleteCircuitDialogProps {
  circuit: Circuit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteCircuitDialog({
  circuit,
  open,
  onOpenChange,
}: DeleteCircuitDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmText, setConfirmText] = useState("");

  const deleteMutation = useMutation({
    mutationFn: () => deleteCircuit(circuit.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circuits"] });
      toast({
        title: t("portal.circuits.delete.toasts.deletedTitle"),
        description: t("portal.circuits.delete.toasts.deletedDesc", { name: circuit.name }),
      });
      onOpenChange(false);
      navigate(circuitsListPath(user?.workspace_type));
    },
    onError: (error) => {
      toast({
        title: t("portal.circuits.delete.toasts.deleteError"),
        description: error instanceof Error ? error.message : t("portal.common.tryAgain"),
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (confirmText === circuit.name) {
      deleteMutation.mutate();
    }
  };

  const isConfirmValid = confirmText === circuit.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {t("portal.circuits.delete.title")}
          </DialogTitle>
          <DialogDescription>
            <Trans i18nKey="portal.circuits.delete.desc" components={{ strong: <strong /> }} />
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-start gap-3">
              <Trash2 className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground mb-1">
                  {t("portal.circuits.delete.aboutTo")}
                </p>
                <p className="font-mono text-destructive">{circuit.name}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              <Trans
                i18nKey="portal.circuits.delete.confirmPrompt"
                values={{ name: circuit.name }}
                components={{ name: <span className="font-mono font-medium text-foreground" /> }}
              />
            </label>
            <Input
              placeholder={t("portal.circuits.delete.namePlaceholder")}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className={confirmText && !isConfirmValid ? "border-destructive" : ""}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setConfirmText("");
              onOpenChange(false);
            }}
          >
            {t("portal.common.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmValid || deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("portal.circuits.delete.deleting")}
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                {t("portal.circuits.delete.confirm")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
