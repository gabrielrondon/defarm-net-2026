import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { CheckCircle2, Copy, ExternalLink, FileText, Link2 } from "lucide-react";

const KIT_TEMPLATE = `value_chain,country,year,sisbov,chip,ear_tag,birth_date,sex,lot_name,zone_name,source_system
BEEF,BR,2026,105500497219983,900264000319233,721998,2025-12-10,female,Bezerros serra,PASTO 15,parceiro_a
BEEF,UY,2026,,982000000000001,UY000004,2022-11-09,female,Vacas cria,C3,parceiro_b`;

const CURL_EXAMPLE = `curl -X POST "https://gateway.defarm.net/v1/partner/ingestions" \\
  -H "x-api-key: <PARTNER_API_KEY>" \\
  -F "file=@dados.csv" \\
  -F "auto_create_circuit=true"`;

const PREVIEW_EXAMPLE = `curl -X POST "https://gateway.defarm.net/v1/partner/ingestions/preview" \\
  -H "x-api-key: <PARTNER_API_KEY>" \\
  -F "file=@dados.csv" \\
  -F "auto_create_circuit=true"`;

const JSON_DIRECT_EXAMPLE = `curl -X POST "https://gateway.defarm.net/v1/partner/ingestions" \\
  -H "x-api-key: <PARTNER_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "auto_create_circuit": true,
    "items": [
      { "car": "MT-1234.56789.0000.00", "value_chain": "BEEF", "breed": "Nelore" }
    ]
  }'`;

const RESPONSE_EXAMPLE = `{
  "summary": {
    "status": "completed",
    "total_rows": 2,
    "unresolved_rows": 0,
    "routed_batches": 1,
    "items_linked": 2,
    "created_circuits": 0,
    "circuits_linked": 1,
    "partner_reference": { "field": "external_id", "value": "cowpro-0001" }
  },
  "raw_payload_id": "uuid",
  "status": "completed",
  "routed_batches": [
    {
      "identifier_type": "cnpj",
      "identifier_value": "12345678000190",
      "rows": 2,
      "status": "completed",
      "item_links": [
        {
          "item_id": "uuid",
          "dfid": "DFID-BEEF-BR-2026-000123-abc123",
          "app_url": "https://defarm.net/app/itens/<item_id>",
          "public_url": "https://defarm.net/i/<dfid>",
          "identifiers": [
            { "identifier_type": "SISBOV", "value": "105500497219983", "is_canonical": true }
          ],
          "input_references": [
            { "field": "external_id", "value": "cowpro-0001" }
          ]
        }
      ]
    }
  ],
  "circuit_links": [
    {
      "circuit_id": "uuid",
      "app_url": "https://defarm.net/app/circuitos/<uuid>",
      "public_url": "https://defarm.net/c/<uuid>"
    }
  ]
}`;

const PARTNER_CLIENT_EXAMPLE = `npm install @defarm/partner-client

import { DefarmPartnerClient } from "@defarm/partner-client";

const client = new DefarmPartnerClient({
  gatewayBaseUrl: "https://gateway.defarm.net",
  apiKey: process.env.DEFARM_PARTNER_KEY,
});

const result = await client.upload({
  file: "/tmp/dados.csv",
  autoCreateCircuit: true,
});

for (const batch of result.routed_batches) {
  for (const item of batch.item_links) {
    console.log(item.dfid, item.public_url, item.is_public);
  }
}`;

const TEMPLATE_API_EXAMPLE = `# 1) Criar template (JWT)
curl -X POST "https://gateway.defarm.net/v1/ingestion/templates" \\
  -H "Authorization: Bearer <JWT>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Parceiro ERP v1",
    "mapping": {
      "columns": {
        "numero_car": "car",
        "peso_vivo_kg": "weight_kg"
      }
    }
  }'

# 2) Listar templates e pegar id
curl -X GET "https://gateway.defarm.net/v1/ingestion/templates" \\
  -H "Authorization: Bearer <JWT>"

# 3) Enviar com template_id
curl -X POST "https://gateway.defarm.net/v1/partner/ingestions" \\
  -H "x-api-key: <PARTNER_API_KEY>" \\
  -F "file=@dados.csv" \\
  -F "template_id=<TEMPLATE_UUID>"`;

const JWT_LOGIN_EXAMPLE = `curl -X POST "https://gateway.defarm.net/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "partner@empresa.com",
    "password": "SUA_SENHA"
  }'

# resposta inclui access_token (JWT) e refresh_token`;

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
  const [copied, setCopied] = useState<"none" | "curl" | "jwt" | "template">("none");

  const copyCurl = async () => {
    await navigator.clipboard.writeText(CURL_EXAMPLE);
    setCopied("curl");
    setTimeout(() => setCopied("none"), 1800);
  };

  const copyJwt = async () => {
    await navigator.clipboard.writeText(JWT_LOGIN_EXAMPLE);
    setCopied("jwt");
    setTimeout(() => setCopied("none"), 1800);
  };

  const copyTemplateApi = async () => {
    await navigator.clipboard.writeText(TEMPLATE_API_EXAMPLE);
    setCopied("template");
    setTimeout(() => setCopied("none"), 1800);
  };

  return (
    <div className="space-y-8">
      {/* Hero intro — flat, no card */}
      <div>
        <h2 className="text-foreground">Kit Parceiro</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-lg">
          Passo 1: envie dados com identificador mínimo (CAR, CCIR, INCRA, NIRF, CIB, MATRÍCULA, GEOREF, LAND_DFID, IE, CNPJ ou CPF), sem template, para <code className="text-xs bg-muted px-1.5 py-0.5 rounded">/v1/partner/ingestions</code>.
          Passo 2: valide no preview e suba em produção com API key real. Passo 3: use template/avançados só se necessário.
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="card-accent-left p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Template CSV</p>
            <p className="text-xs text-muted-foreground mt-0.5">Baixar modelo oficial</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => downloadTemplate(KIT_TEMPLATE, "partner-template.csv")}>
            <FileText className="h-4 w-4 mr-1.5" />
            Baixar
          </Button>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">OpenAPI</p>
            <p className="text-xs text-muted-foreground mt-0.5">Contrato parceiro</p>
          </div>
          <Button size="sm" variant="outline" asChild>
            <a href="https://docs.defarm.net/openapi-partner-public.yaml" target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4 mr-1.5" />
              Abrir
            </a>
          </Button>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Swagger</p>
            <p className="text-xs text-muted-foreground mt-0.5">Teste interativo</p>
          </div>
          <Button size="sm" variant="outline" asChild>
            <a href="https://docs.defarm.net/swagger-partner.html" target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4 mr-1.5" />
              Abrir
            </a>
          </Button>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Postman</p>
            <p className="text-xs text-muted-foreground mt-0.5">Coleção pronta</p>
          </div>
          <Button size="sm" variant="outline" asChild>
            <a href="https://docs.defarm.net/postman-partner-collection.json" target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4 mr-1.5" />
              Abrir
            </a>
          </Button>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground -mt-4">
        Importante: o endpoint <code className="text-xs bg-muted px-1 py-0.5 rounded">/v1/partner/ingestions</code> já faz roteamento inteligente e não exige template.
      </p>

      {/* Code examples — collapsible sections */}
      <div className="space-y-4">
        <p className="section-label">Referência de integração</p>

        <Card className="p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Cliente oficial para parceiro (recomendado)</p>
          <p className="text-xs text-muted-foreground">
            Use <code className="text-xs bg-muted px-1 py-0.5 rounded">@defarm/partner-client</code> para enviar arquivos,
            interpretar resposta e reconciliar links por referência do parceiro.
          </p>
          <pre className="code-block">{PARTNER_CLIENT_EXAMPLE}</pre>
          <p className="text-xs text-muted-foreground">
            Kit para IA/copilot disponível em <code className="text-xs bg-muted px-1 py-0.5 rounded">docs/partner/ai-skill-kit.md</code>.
          </p>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Login JWT (setup)</p>
            <Button size="sm" variant="ghost" onClick={copyJwt} className="h-7 px-2 text-xs">
              {copied === "jwt" ? <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
              {copied === "jwt" ? "Copiado" : "Copiar"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Use JWT para configuração. API key para operação diária.
          </p>
          <pre className="code-block">{JWT_LOGIN_EXAMPLE}</pre>
        </Card>

        <Card className="p-4 space-y-3">
          <p className="text-xs uppercase tracking-wide text-primary font-semibold">Passo 1 (básico)</p>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Upload via cURL</p>
            <Button size="sm" variant="ghost" onClick={copyCurl} className="h-7 px-2 text-xs">
              {copied === "curl" ? <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
              {copied === "curl" ? "Copiado" : "Copiar"}
            </Button>
          </div>
          <pre className="code-block">{CURL_EXAMPLE}</pre>
          <p className="text-xs text-muted-foreground">
            Alternativa: também aceitamos JSON direto no body (sem multipart), útil para integração backend-to-backend.
          </p>
          <pre className="code-block">{JSON_DIRECT_EXAMPLE}</pre>
        </Card>

        <Card className="p-4 space-y-3">
          <p className="text-xs uppercase tracking-wide text-primary font-semibold">Passo 2 (validação)</p>
          <p className="text-sm font-medium text-foreground">Preview (dry-run) antes do envio real</p>
          <p className="text-xs text-muted-foreground">
            Use <code className="text-xs bg-muted px-1 py-0.5 rounded">/v1/partner/ingestions/preview</code> para simular roteamento sem tokenizar.
          </p>
          <pre className="code-block">{PREVIEW_EXAMPLE}</pre>
        </Card>

        <Card className="p-4 space-y-3">
          <p className="text-xs uppercase tracking-wide text-primary font-semibold">Passo 3 (opcional)</p>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Template opcional (mapeamento)</p>
            <Button size="sm" variant="ghost" onClick={copyTemplateApi} className="h-7 px-2 text-xs">
              {copied === "template" ? <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
              {copied === "template" ? "Copiado" : "Copiar"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Se precisar mapear nomes de colunas diferentes, crie template e envie <code className="text-xs bg-muted px-1 py-0.5 rounded">template_id</code> no upload.
          </p>
          <pre className="code-block">{TEMPLATE_API_EXAMPLE}</pre>
        </Card>

        <Card className="p-4 space-y-3">
          <p className="text-xs uppercase tracking-wide text-primary font-semibold">Opcional (AI Skill)</p>
          <p className="text-sm font-medium text-foreground">AI Skill + Client</p>
          <p className="text-xs text-muted-foreground">
            Se quiser acelerar com IA/copilot, use o cliente oficial e o kit de prompt.
          </p>
          <pre className="code-block">{`npm install @defarm/partner-client\nhttps://docs.defarm.net/docs/partner-tooling`}</pre>
        </Card>

        <Card className="p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Resposta útil para navegação</p>
          <p className="text-xs text-muted-foreground">
            Após upload, use <code className="text-xs bg-muted px-1 py-0.5 rounded">routed_batches.item_links</code> para abrir item por item (DFID + identificadores) e
            <code className="text-xs bg-muted px-1 py-0.5 rounded ml-1">circuit_links</code> para portfólio por cliente.
          </p>
          <pre className="code-block">{RESPONSE_EXAMPLE}</pre>
        </Card>
      </div>

      {/* Checklist — flat list, no card */}
      <div>
        <p className="section-label mb-3">Checklist para produção</p>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside marker:text-muted-foreground/40">
          <li>Gerar API Key <code className="text-xs bg-muted px-1 py-0.5 rounded">workspace_ingestion</code> (sem configuração adicional).</li>
          <li>Opcional: rodar preview em <code className="text-xs bg-muted px-1 py-0.5 rounded">/v1/partner/ingestions/preview</code> para validar o lote.</li>
          <li>Enviar em chunks (recomendado 50-150 linhas por request) para <code className="text-xs bg-muted px-1 py-0.5 rounded">/v1/partner/ingestions</code>.</li>
          <li>Resolver pendências em Roteamento.</li>
          <li>Abrir <code className="text-xs bg-muted px-1 py-0.5 rounded">circuit_links</code> retornados para ver o portfólio imediatamente.</li>
        </ol>
        <a href="/app/api-keys" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-3">
          <Link2 className="h-3.5 w-3.5" />
          Ir para API Keys
        </a>
      </div>
    </div>
  );
}
