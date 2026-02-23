import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Copy, FileText, Link2 } from "lucide-react";

const KIT_TEMPLATE = `value_chain,country,year,sisbov,chip,ear_tag,birth_date,sex,lot_name,zone_name,source_system
BEEF,BR,2026,105500497219983,900264000319233,721998,2025-12-10,female,Bezerros serra,PASTO 15,gerbov
BEEF,UY,2026,,982000000000001,UY000004,2022-11-09,female,Vacas cria,C3,cowpro`;

const CURL_EXAMPLE = `curl -X POST "https://gateway.defarm.net/api/partner/ingestion/intake" \\
  -H "x-api-key: <PARTNER_API_KEY>" \\
  -F "file=@dados.csv" \\
  -F "auto_create_circuit=true"`;

const TEMPLATE_API_EXAMPLE = `# 1) Criar template do parceiro (uma vez)
curl -X POST "https://gateway.defarm.net/api/ingestion/templates" \\
  -H "Authorization: Bearer <JWT_DO_USUARIO_PARCEIRO>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "GerBov v1",
    "source_hint": "gerbov",
    "canonical_type": "sisbov",
    "canonical_column": "sisbov",
    "mapping": {
      "columns": {
        "sisbov": "sisbov",
        "chip": "chip",
        "peso": "weight_kg",
        "data_nasc": "birth_date"
      }
    },
    "is_default": true
  }'

# 2) Listar templates salvos
curl -X GET "https://gateway.defarm.net/api/ingestion/templates" \\
  -H "Authorization: Bearer <JWT_DO_USUARIO_PARCEIRO>"`;

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
  const [copied, setCopied] = useState<"none" | "curl" | "template">("none");

  const copyCurl = async () => {
    await navigator.clipboard.writeText(CURL_EXAMPLE);
    setCopied("curl");
    setTimeout(() => setCopied("none"), 1800);
  };

  const copyTemplateApi = async () => {
    await navigator.clipboard.writeText(TEMPLATE_API_EXAMPLE);
    setCopied("template");
    setTimeout(() => setCopied("none"), 1800);
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Kit Parceiro (go-live rápido)</h2>
        <p className="text-sm text-muted-foreground">
          O fluxo recomendado é enviar CSV/JSON para <code>/api/partner/ingestion/intake</code>.
          A DeFarm persiste payload bruto, resolve roteamento por identificador e distribui por circuito automaticamente.
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-primary/10 text-primary border-primary/20">1 endpoint de intake</Badge>
          <Badge variant="outline">payload bruto persistido</Badge>
          <Badge variant="outline">roteamento automático</Badge>
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
          <h3 className="font-semibold text-foreground">Template por parceiro</h3>
          <Button size="sm" variant="outline" onClick={copyTemplateApi}>
            {copied === "template" ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            Copiar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          O template define o mapeamento de colunas do seu sistema para o padrão DeFarm. Sem template
          (ou default), o lote é rejeitado com <code>400</code>. Depois de criado, o intake já usa o template automaticamente.
        </p>
        <pre className="bg-muted rounded-lg p-3 overflow-x-auto text-xs text-muted-foreground">{TEMPLATE_API_EXAMPLE}</pre>
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
        <p className="text-sm text-muted-foreground">1. Criar template do parceiro (ou marcar template default).</p>
        <p className="text-sm text-muted-foreground">2. Gerar API Key <code>workspace_ingestion</code> com circuito de staging.</p>
        <p className="text-sm text-muted-foreground">3. Enviar lote CSV/JSON para <code>/api/partner/ingestion/intake</code>.</p>
        <p className="text-sm text-muted-foreground">4. Resolver pendências em <code>Roteamento</code> e acompanhar <code>Histórico de Payload Bruto</code>.</p>
        <p className="text-sm text-muted-foreground">5. Opcional: usar <code>/api/items/bulk</code> para integração avançada circuito a circuito.</p>
        <a href="/app/api-keys" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
          <Link2 className="h-4 w-4" />
          Ir para API Keys
        </a>
      </Card>
    </div>
  );
}
