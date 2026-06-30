import { PartnerCliTools } from "@/components/partner";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FlaskConical } from "lucide-react";

export default function PartnerCliPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">CLI</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Comandos prontos para integrar o parceiro rapidamente via terminal.
        </p>
      </div>
      <Card className="p-4 border-amber-300/50 bg-amber-50/60 dark:bg-amber-950/20">
        <div className="flex items-start gap-3">
          <FlaskConical className="h-4 w-4 mt-0.5 text-amber-700 dark:text-amber-300" />
          <div className="space-y-1">
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 border border-amber-300/60">Beta</Badge>
            <p className="text-sm text-foreground">
              Esta seção está em fase beta. Você já pode usar e validar os fluxos no seu workspace.
            </p>
          </div>
        </div>
      </Card>
      <PartnerCliTools />
    </div>
  );
}
