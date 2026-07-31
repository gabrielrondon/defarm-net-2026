import { IngestionWizard } from "@/components/partner/IngestionWizard";
import { PartnerPage } from "@/components/partner/PartnerPage";

export default function PartnerIngestao() {
  return (
    <PartnerPage
      width="focused"
      section="Operação"
      title="Enviar dados"
      subtitle="Envie seus dados e acompanhe cada etapa do processamento."
    >
      <IngestionWizard />
    </PartnerPage>
  );
}
