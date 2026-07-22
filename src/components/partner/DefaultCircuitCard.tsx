import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trans, useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  getPartnerDefaultCircuit,
  updatePartnerDefaultCircuit,
} from "@/lib/api/partner-routing";
import { Inbox } from "lucide-react";

/**
 * Circuito padrão — "onde meus dados caem quando não especifico um circuito".
 * Antes só era resolvido por trás (mágica escondida); aqui o parceiro VÊ e ESCOLHE.
 * A origem técnica do default (DefaultCircuitSource, snake_case do backend) é
 * humanizada via portal.routing.defaultCircuit.source.* (defaultValue = cru).
 */
export function DefaultCircuitCard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const defaultQuery = useQuery({
    queryKey: ["partner-default-circuit"],
    queryFn: getPartnerDefaultCircuit,
  });
  const circuitsQuery = useQuery({
    queryKey: ["circuits-for-default"],
    queryFn: () => getCircuits(),
  });

  const mutation = useMutation({
    mutationFn: (circuitId: string) => updatePartnerDefaultCircuit(circuitId),
    onSuccess: (data) => {
      toast({
        title: t("portal.routing.defaultCircuit.toasts.updatedTitle"),
        description: t("portal.routing.defaultCircuit.toasts.updatedDesc", { name: data.name }),
      });
      qc.invalidateQueries({ queryKey: ["partner-default-circuit"] });
    },
    onError: () =>
      toast({
        title: t("portal.routing.defaultCircuit.toasts.updateError"),
        variant: "destructive",
      }),
  });

  const current = defaultQuery.data;
  const circuits = circuitsQuery.data ?? [];
  const needsMaterialization = Boolean(current?.circuit_id && !current?.is_staging);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Inbox className="h-4 w-4 text-primary" />
          {t("portal.routing.defaultCircuit.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          <Trans i18nKey="portal.routing.defaultCircuit.desc" components={{ strong: <strong /> }} />
        </p>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("portal.routing.defaultCircuit.targetLabel")}
          </label>
          <Select
            value={current?.circuit_id ?? ""}
            onValueChange={(v) => mutation.mutate(v)}
            disabled={mutation.isPending || defaultQuery.isLoading}
          >
            <SelectTrigger className="max-w-md">
              <SelectValue
                placeholder={defaultQuery.isLoading ? t("portal.common.loading") : t("portal.routing.defaultCircuit.choosePlaceholder")}
              />
            </SelectTrigger>
            <SelectContent>
              {circuits.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {current && (
          <p className="text-[11px] text-muted-foreground">
            {t("portal.routing.defaultCircuit.currentLabel")} <span className="font-medium text-foreground">{current.name}</span>
            {current.source ? ` · ${t(`portal.routing.defaultCircuit.source.${current.source}`, { defaultValue: current.source })}` : ""}
          </p>
        )}
        {current && needsMaterialization && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p>{t("portal.routing.defaultCircuit.materializeHint")}</p>
            <Button
              type="button"
              size="sm"
              className="mt-3"
              onClick={() => mutation.mutate(current.circuit_id)}
              disabled={mutation.isPending}
            >
              {t("portal.routing.defaultCircuit.materializeAction")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
