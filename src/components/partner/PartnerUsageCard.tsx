import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins } from "lucide-react";
import { getMyUsage } from "@/lib/api/partner-entitlements";

/**
 * Read-only usage + balance widget for the partner portal.
 * Renders nothing if the workspace has no entitlement / metering (request fails).
 */
export function PartnerUsageCard({ locale = "pt-BR" }: { locale?: "pt-BR" | "en" }) {
  const usageQuery = useQuery({
    queryKey: ["partner-usage"],
    queryFn: getMyUsage,
    retry: false,
  });

  if (usageQuery.isError || !usageQuery.data) return null;
  const u = usageQuery.data;

  const t = (pt: string, en: string) => (locale === "en" ? en : pt);
  const stats = [
    { label: t("Saldo", "Balance"), value: u.balance_remaining, accent: true },
    { label: t("Hoje", "Today"), value: u.tokenizations_today },
    { label: t("Mês", "Month"), value: u.tokenizations_month },
    { label: t("Total", "Total"), value: u.tokenizations_total },
    { label: t("Na fila", "Queued"), value: u.holds_pending },
  ];

  return (
    <Card className="mb-6 p-4 md:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Coins className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium">
          {t("Tokenizações & saldo", "Tokenizations & balance")}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className={`text-xl font-semibold ${s.accent ? "text-primary" : ""}`}>{s.value}</div>
          </div>
        ))}
      </div>
      {u.holds_pending > 0 && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {t(
              "Itens na fila aguardam liberação do time DeFarm (ou mais saldo).",
              "Queued items await release by the DeFarm team (or more balance)."
            )}
          </p>
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link to="/contato">{t("Solicitar saldo", "Request balance")}</Link>
          </Button>
        </div>
      )}
    </Card>
  );
}
