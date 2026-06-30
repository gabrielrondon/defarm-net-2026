import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getPartnerDefaultCircuit, listRawPayloads } from "@/lib/api/partner-routing";
import { Inbox, Upload, CheckCircle2, ArrowRight } from "lucide-react";

/**
 * "Seu recebimento" — faixa no topo da Visão Geral que responde, na cara, as 3 perguntas do
 * parceiro ao entrar: (1) está funcionando? (2) onde meus dados caem? (3) como mando mais?
 * Antes essas respostas estavam enterradas em abas (rec #1 da auditoria do dashboard).
 */
export function ReceptionStrip() {
  const defaultQuery = useQuery({
    queryKey: ["partner-default-circuit"],
    queryFn: getPartnerDefaultCircuit,
  });
  const recentQuery = useQuery({
    queryKey: ["partner-recent-payloads"],
    queryFn: () => listRawPayloads(10),
  });

  const defaultName = defaultQuery.data?.name;
  const recentCount = recentQuery.data?.length ?? 0;

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-1.5 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary flex items-center gap-1.5">
          <Inbox className="h-3.5 w-3.5" /> Seu recebimento
        </p>
        <p className="text-sm text-foreground">
          Seus dados caem em{" "}
          <strong>{defaultName ?? (defaultQuery.isLoading ? "…" : "—")}</strong> por padrão.{" "}
          <Link to="/app/meus-circuitos" className="text-primary hover:underline">
            trocar / ver circuitos
          </Link>
        </p>
        <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
          {recentCount > 0 ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              {recentCount} envio(s) recente(s) recebido(s) — tudo fluindo.
            </>
          ) : (
            "Nenhum envio ainda — comece mandando seus dados."
          )}
        </p>
      </div>
      <Button asChild className="shrink-0">
        <Link to="/app/parceiro/ingestao">
          <Upload className="h-4 w-4 mr-1.5" /> Enviar dados <ArrowRight className="h-4 w-4 ml-1.5" />
        </Link>
      </Button>
    </div>
  );
}
