import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { getPartnerDefaultCircuit, listRawPayloads } from "@/lib/api/partner-routing";
import { Inbox, Upload, CheckCircle2, ArrowRight } from "lucide-react";

/**
 * "Seu recebimento" — faixa no topo da Visão Geral que responde, na cara, as 3 perguntas do
 * parceiro ao entrar: (1) está funcionando? (2) onde meus dados caem? (3) como mando mais?
 * Antes essas respostas estavam enterradas em abas (rec #1 da auditoria do dashboard).
 */
export function ReceptionStrip() {
  const { t } = useTranslation();
  const defaultQuery = useQuery({
    queryKey: ["partner-default-circuit"],
    queryFn: getPartnerDefaultCircuit,
  });
  const recentQuery = useQuery({
    queryKey: ["partner-recent-payloads"],
    queryFn: () => listRawPayloads(10),
  });

  const defaultName = defaultQuery.data?.name;
  // listRawPayloads retorna { rows, count } — não um array. (bug pego pelo Hetzner)
  const recentCount = recentQuery.data?.rows?.length ?? 0;

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-1.5 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary flex items-center gap-1.5">
          <Inbox className="h-3.5 w-3.5" /> {t("portal.reception.title")}
        </p>
        <p className="text-sm text-foreground">
          <Trans
            i18nKey="portal.reception.landsIn"
            values={{ name: defaultName ?? (defaultQuery.isLoading ? "…" : "—") }}
            components={{ strong: <strong /> }}
          />{" "}
          <Link to="/app/meus-circuitos" className="text-primary hover:underline">
            {t("portal.reception.changeCircuits")}
          </Link>
        </p>
        <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
          {recentCount > 0 ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              {t("portal.reception.recentReceived", { count: recentCount })}
            </>
          ) : (
            t("portal.reception.noneYet")
          )}
        </p>
      </div>
      <Button asChild className="shrink-0">
        <Link to="/app/parceiro/ingestao">
          <Upload className="h-4 w-4 mr-1.5" /> {t("portal.reception.sendData")} <ArrowRight className="h-4 w-4 ml-1.5" />
        </Link>
      </Button>
    </div>
  );
}
