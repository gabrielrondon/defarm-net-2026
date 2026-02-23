import { PartnerCliTools } from "@/components/partner";

export default function PartnerCliPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">CLI</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Comandos prontos para integrar o parceiro rapidamente via terminal.
        </p>
      </div>
      <PartnerCliTools />
    </div>
  );
}
