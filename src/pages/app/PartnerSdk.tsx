import { PartnerSdkTools } from "@/components/partner";

export default function PartnerSdkPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">SDK</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Exemplos TypeScript para integrar a DeFarm direto no software do parceiro.
        </p>
      </div>
      <PartnerSdkTools />
    </div>
  );
}
