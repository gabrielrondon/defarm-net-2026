import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { KeyRound } from "lucide-react";
import { registryRequest } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

interface SigningKey {
  key_id: string;
  algorithm: string;
  is_active: boolean;
  created_at: string;
  retired_at: string | null;
  revoked_at: string | null;
  /** `api_key` = registrada pelo sistema integrado, sem login (engines #753). */
  registered_via?: "user" | "api_key";
}

// #753: as chaves de assinatura do workspace. Uma chave que o sistema integrado registrou pela
// API key aparece marcada; quem não reconhecer revoga aqui.
export function SigningKeysPanel() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["workspace-signing-keys"],
    queryFn: () => registryRequest<SigningKey[]>("/workspace/signing-keys"),
  });
  const revoke = useMutation({
    mutationFn: (keyId: string) =>
      registryRequest<SigningKey>(`/workspace/signing-keys/${encodeURIComponent(keyId)}/revoke`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-signing-keys"] });
      toast({ title: t("settings.signingKeys.revoked") });
    },
    onError: (err) =>
      toast({
        title: t("settings.signingKeys.revokeError"),
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      }),
  });

  const status = (k: SigningKey) =>
    k.revoked_at
      ? t("settings.signingKeys.status.revoked")
      : k.retired_at
        ? t("settings.signingKeys.status.retired")
        : t("settings.signingKeys.status.active");

  return (
    <div className="space-y-4 pt-6 border-t border-border">
      <div>
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          {t("settings.signingKeys.title")}
        </h3>
        <p className="text-sm text-muted-foreground">{t("settings.signingKeys.subtitle")}</p>
      </div>
      {isLoading ? null : keys.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("settings.signingKeys.empty")}</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {keys.map((k) => (
            <li key={k.key_id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm truncate">{k.key_id}</span>
                  <Badge variant="outline">{status(k)}</Badge>
                  {k.registered_via === "api_key" && (
                    <Badge variant="secondary">{t("settings.signingKeys.viaApiKey")}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("settings.signingKeys.createdAt", {
                    date: new Date(k.created_at).toLocaleString(i18n.language),
                  })}
                </p>
              </div>
              {!k.revoked_at && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={revoke.isPending}>
                      {t("settings.signingKeys.revoke")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("settings.signingKeys.confirmTitle", { key: k.key_id })}</AlertDialogTitle>
                      <AlertDialogDescription>{t("settings.signingKeys.confirmBody")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("settings.signingKeys.cancel")}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => revoke.mutate(k.key_id)}>
                        {t("settings.signingKeys.revoke")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
