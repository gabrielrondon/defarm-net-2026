import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Copy, FileText, Link2 } from "lucide-react";

const KIT_TEMPLATE = `value_chain,country,year,sisbov,chip,ear_tag,birth_date,sex,lot_name,zone_name,source_system
BEEF,BR,2026,105500497219983,900264000319233,721998,2025-12-10,female,Bezerros serra,PASTO 15,gerbov
BEEF,UY,2026,,982000000000001,UY000004,2022-11-09,female,Vacas cria,C3,cowpro`;

const CURL_EXAMPLE = `curl -X POST "https://gateway.defarm.net/api/items/bulk" \\
  -H "Authorization: Bearer <API_KEY>" \\
  -F "file=@dados.csv" \\
  -F "circuit_id=<UUID_DO_CIRCUITO>"`;

function downloadTemplate(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function PartnerKit() {
  const [copied, setCopied] = useState<"none" | "curl">("none");

  const copyCurl = async () => {
    await navigator.clipboard.writeText(CURL_EXAMPLE);
    setCopied("curl");
    setTimeout(() => setCopied("none"), 1800);
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Kit Parceiro (go-live rápido)</h2>
        <p className="text-sm text-muted-foreground">
          O caminho mais simples é usar o mesmo fluxo do portal: <code>/api/items/bulk</code> com CSV e
          <code> circuit_id</code>.
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-primary/10 text-primary border-primary/20">1 endpoint</Badge>
          <Badge variant="outline">CSV/JSON</Badge>
          <Badge variant="outline">Tokenização automática</Badge>
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-foreground">Template oficial (CSV)</h3>
          <Button size="sm" variant="outline" onClick={() => downloadTemplate(KIT_TEMPLATE, "partner-template.csv")}>
            <FileText className="h-4 w-4 mr-2" />
            Baixar template
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Regra: cada linha é um item rastreável. Envie ao menos um identificador canônico
          (<code>sisbov</code> ou <code>chip</code>/<code>ear_tag</code> conforme contrato).
        </p>
        <pre className="bg-muted rounded-lg p-3 overflow-x-auto text-xs text-muted-foreground">{KIT_TEMPLATE}</pre>
      </Card>

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-foreground">Exemplo de integração (cURL)</h3>
          <Button size="sm" variant="outline" onClick={copyCurl}>
            {copied === "curl" ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            Copiar
          </Button>
        </div>
        <pre className="bg-muted rounded-lg p-3 overflow-x-auto text-xs text-muted-foreground">{CURL_EXAMPLE}</pre>
      </Card>

      <Card className="p-5 space-y-2">
        <h3 className="font-semibold text-foreground">Checklist mínimo para produção</h3>
        <p className="text-sm text-muted-foreground">1. Gerar API Key por circuito.</p>
        <p className="text-sm text-muted-foreground">2. Enviar lote CSV para <code>/api/items/bulk</code>.</p>
        <p className="text-sm text-muted-foreground">3. Validar receipt (linhas, criados, eventos).</p>
        <p className="text-sm text-muted-foreground">4. Opcional: configurar webhook para retorno operacional.</p>
        <a href="/app/api-keys" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
          <Link2 className="h-4 w-4" />
          Ir para API Keys
        </a>
      </Card>
    </div>
  );
}

