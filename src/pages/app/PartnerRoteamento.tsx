import { PartnerRouting } from "@/components/partner";
import { PartnerRoutingIssues } from "@/components/partner/PartnerRoutingIssues";

export default function PartnerRoteamento() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-1">Operação</p>
        <h1 className="text-foreground">Roteamento</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Defina para qual circuito cada identificador deve ir — e resolva o que chegou sem regra.
        </p>
      </div>
      <PartnerRouting />
      <PartnerRoutingIssues />
    </div>
  );
}
