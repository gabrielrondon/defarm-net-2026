import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins } from "lucide-react";
import { getMyUsage } from "@/lib/api/partner-entitlements";

/**
 * Read-only usage + balance widget for the partner portal.
 * Renders nothing if the workspace has no entitlement / metering (request fails).
 *
 * Manchete = CRÉDITOS (balance_remaining), com a equivalência em tokenizações como detalhe.
 * "animais" foi trocado por "créditos" (o termo neutro): pra um integrador, "saldo em animais"
 * infere inventário de produtor, que é sensível e confuso. Workspace não metrado
 * (entitlement_provisioned=false) → o gate tokeniza sem limite → exibimos "ilimitado".
 */
export function PartnerUsageCard() {
  const { t } = useTranslation();
  const usageQuery = useQuery({
    queryKey: ["partner-usage"],
    queryFn: getMyUsage,
    retry: false,
  });

  if (usageQuery.isError || !usageQuery.data) return null;
  const u = usageQuery.data;
  const unlimited = !u.entitlement_provisioned;
  const amber = "text-amber-700 dark:text-amber-400";

  return (
    <Card className="mb-6 p-4 md:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Coins className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium">{t("portal.usage.title")}</p>
      </div>

      {/* Manchete: os 3 números que o parceiro precisa, num lugar só. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Saldo em animais */}
        <div className="rounded-lg border border-border p-3">
          <div className="text-xs text-muted-foreground">{t("portal.usage.balanceLabel")}</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            {unlimited ? (
              <span className="text-2xl font-semibold text-primary">
                {t("portal.usage.unlimited")}
              </span>
            ) : (
              <>
                <span className="text-2xl font-semibold text-primary">{u.balance_remaining}</span>
                <span className="text-sm text-muted-foreground">{t("portal.usage.animals")}</span>
              </>
            )}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {unlimited
              ? t("portal.usage.unlimitedDetail")
              : t("portal.usage.balanceDetail", {
                  n: u.balance_in_animals,
                  cost: u.credit_cost_creation,
                })}
          </div>
        </div>

        {/* Em espera (holds de crédito) */}
        <div className="rounded-lg border border-border p-3">
          <div className="text-xs text-muted-foreground">{t("portal.usage.heldLabel")}</div>
          <div className={`mt-1 text-2xl font-semibold ${u.holds_pending > 0 ? amber : ""}`}>
            {u.holds_pending}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">{t("portal.usage.heldDetail")}</div>
        </div>

        {/* Precisam de atenção (issues de ingestão) */}
        <div className="rounded-lg border border-border p-3">
          <div className="text-xs text-muted-foreground">{t("portal.usage.attentionLabel")}</div>
          <div className={`mt-1 text-2xl font-semibold ${u.pending_issues > 0 ? amber : ""}`}>
            {u.pending_issues}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {t("portal.usage.attentionDetail")}
          </div>
        </div>
      </div>

      {/* Secundário: contagem de tokenizações (detalhe, não manchete). */}
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <span>
          {t("portal.usage.today")}:{" "}
          <strong className="text-foreground">{u.tokenizations_today}</strong>
        </span>
        <span>
          {t("portal.usage.month")}:{" "}
          <strong className="text-foreground">{u.tokenizations_month}</strong>
        </span>
        <span>
          {t("portal.usage.total")}:{" "}
          <strong className="text-foreground">{u.tokenizations_total}</strong>
        </span>
      </div>

      {/* Ação: só faz sentido pedir saldo se o workspace é metrado e tem item preso. */}
      {!unlimited && u.holds_pending > 0 && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">{t("portal.usage.queuedNote")}</p>
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link to="/contato">{t("portal.usage.requestBalance")}</Link>
          </Button>
        </div>
      )}
      {u.pending_issues > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">{t("portal.usage.attentionHint")}</p>
      )}
    </Card>
  );
}
