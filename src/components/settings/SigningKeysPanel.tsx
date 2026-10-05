import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { KeyRound } from "lucide-react";
import { registryRequest, ApiError } from "@/lib/api/client";
import { useAuth } from "@/contexts/AuthContext";
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

interface ApiGrant {
  expires_at: string | null;
}

type Action = "retire" | "revoke";

// #753: as chaves de assinatura do workspace. Quem administra o workspace vê de onde cada chave
// veio, aposenta (rotação) ou revoga (vazamento) e libera o sistema integrado a registrar uma nova.
export function SigningKeysPanel() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const ws = user?.workspace_id ?? "";
  // Mesmo critério do engines (require_key_admin): papel no workspace, não admin da plataforma.
  const canManage = user?.role === "owner" || user?.role === "admin";

  const keys = useQuery({
    queryKey: ["workspace-signing-keys", ws],
    queryFn: () => registryRequest<SigningKey[]>("/workspace/signing-keys"),
    enabled: !!ws,
  });
  const grant = useQuery({
    queryKey: ["workspace-signing-key-grant", ws],
    queryFn: () => registryRequest<ApiGrant>("/workspace/signing-keys/api-grant"),
    enabled: !!ws && canManage,
  });

  const failure = (err: unknown) =>
    toast({
      title: t("settings.signingKeys.actionError"),
      description:
        err instanceof ApiError && err.code === "key_management_requires_admin"
          ? t("settings.signingKeys.adminOnly")
          : undefined,
      variant: "destructive",
    });

  const act = useMutation({
    mutationFn: ({ keyId, action }: { keyId: string; action: Action }) =>
      registryRequest<SigningKey>(`/workspace/signing-keys/${encodeURIComponent(keyId)}/${action}`, { method: "POST" }),
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-signing-keys", ws] });
      toast({ title: v.action === "revoke" ? t("settings.signingKeys.revoked") : t("settings.signingKeys.retired") });
    },
    onError: failure,
  });
  const allow = useMutation({
    mutationFn: () => registryRequest<ApiGrant>("/workspace/signing-keys/api-grant", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-signing-key-grant", ws] });
      toast({ title: t("settings.signingKeys.grantCreated") });
    },
    onError: failure,
  });

  const status = (k: SigningKey) =>
    k.revoked_at
      ? t("settings.signingKeys.status.revoked")
      : k.retired_at
        ? t("settings.signingKeys.status.retired")
        : t("settings.signingKeys.status.active");

  const confirmButton = (k: SigningKey, action: Action) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={act.isPending}>
          {t(`settings.signingKeys.${action}`)}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t(`settings.signingKeys.${action}Title`, { key: k.key_id })}</AlertDialogTitle>
          <AlertDialogDescription>{t(`settings.signingKeys.${action}Body`)}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("settings.signingKeys.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={() => act.mutate({ keyId: k.key_id, action })}>
            {t(`settings.signingKeys.${action}`)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <div className="space-y-4 pt-6 border-t border-border">
      <div>
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          {t("settings.signingKeys.title")}
        </h3>
        <p className="text-sm text-muted-foreground">{t("settings.signingKeys.subtitle")}</p>
      </div>

      {keys.isLoading ? null : keys.isError ? (
        <p className="text-sm text-destructive">{t("settings.signingKeys.loadError")}</p>
      ) : (keys.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("settings.signingKeys.empty")}</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {(keys.data ?? []).map((k) => (
            <li key={k.key_id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm truncate">{k.key_id}</span>
                  <Badge variant="outline">{status(k)}</Badge>
                  {k.registered_via === "api_key" && (
                    <Badge variant="secondary">{t("settings.signingKeys.viaApiKey")}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("settings.signingKeys.createdAt", { date: new Date(k.created_at).toLocaleString(i18n.language) })}
                </p>
              </div>
              {canManage && !k.revoked_at && (
                <div className="flex gap-2">
                  {!k.retired_at && confirmButton(k, "retire")}
                  {confirmButton(k, "revoke")}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 space-y-2">
          <p className="text-sm">{t("settings.signingKeys.grantHint")}</p>
          {grant.data?.expires_at ? (
            <p className="text-xs text-muted-foreground">
              {t("settings.signingKeys.grantActive", {
                date: new Date(grant.data.expires_at).toLocaleString(i18n.language),
              })}
            </p>
          ) : null}
          <Button size="sm" variant="outline" disabled={allow.isPending} onClick={() => allow.mutate()}>
            {t("settings.signingKeys.grant")}
          </Button>
        </div>
      )}
    </div>
  );
}
