import { IngestionWizard } from "@/components/partner/IngestionWizard";

export default function PartnerIngestao() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="section-label mb-1">Operação</p>
        <h1 className="text-foreground">Ingestão</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Envie seus dados e acompanhe cada etapa do processamento.
        </p>
      </div>
      <IngestionWizard />
    </div>
  );
}
