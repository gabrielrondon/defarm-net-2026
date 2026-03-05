import { PartnerIntake } from "@/components/partner";

export default function PartnerIngestao() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-1">Operação</p>
        <h1 className="text-foreground">Ingestão</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Envie CSV ou JSON. O sistema roteia automaticamente para os circuitos corretos.
        </p>
      </div>
      <PartnerIntake />
    </div>
  );
}
