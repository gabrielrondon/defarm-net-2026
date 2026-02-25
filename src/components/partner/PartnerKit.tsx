import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { CheckCircle2, Copy, FileText, Link2, Loader2, Rocket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createIngestionTemplate, listIngestionTemplates } from "@/lib/api/ingestion-templates";
import { GATEWAY_BASE } from "@/lib/api/client";

const KIT_TEMPLATE = `value_chain,country,year,sisbov,chip,ear_tag,birth_date,sex,lot_name,zone_name,source_system
BEEF,BR,2026,105500497219983,900264000319233,721998,2025-12-10,female,Bezerros serra,PASTO 15,parceiro_a
BEEF,UY,2026,,982000000000001,UY000004,2022-11-09,female,Vacas cria,C3,parceiro_b`;

const CURL_EXAMPLE = `curl -X POST "https://gateway.defarm.net/api/partner/upload" \\
  -H "x-api-key: <PARTNER_API_KEY>" \\
  -F "file=@dados.csv" \\
  -F "auto_create_circuit=true"`;

const PREVIEW_EXAMPLE = `curl -X POST "https://gateway.defarm.net/api/partner/upload/preview" \\
  -H "x-api-key: <PARTNER_API_KEY>" \\
  -F "file=@dados.csv" \\
  -F "auto_create_circuit=true"`;

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

const TEMPLATE_API_EXAMPLE = `# 1) Criar template do parceiro (uma vez)
curl -X POST "https://gateway.defarm.net/api/ingestion/templates" \\
  -H "Authorization: Bearer <JWT_DO_USUARIO_PARCEIRO>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Parceiro v1",
    "source_hint": "partner",
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
  const { toast } = useToast();
  const [copied, setCopied] = useState<"none" | "curl" | "template" | "jwt">("none");
  const [creatingDefault, setCreatingDefault] = useState(false);
  const [defaultTemplateExists, setDefaultTemplateExists] = useState(false);

  const loadTemplateStatus = async () => {
    try {
      const templates = await listIngestionTemplates();
      setDefaultTemplateExists(templates.some((t) => t.is_default));
    } catch {
      // no-op
    }
  };

  useEffect(() => {
    loadTemplateStatus();
  }, []);

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

  const copyJwt = async () => {
    await navigator.clipboard.writeText(JWT_LOGIN_EXAMPLE);
    setCopied("jwt");
    setTimeout(() => setCopied("none"), 1800);
  };

  const createDefaultTemplateNow = async () => {
    setCreatingDefault(true);
    try {
      await createIngestionTemplate({
        name: "Template padrao parceiro",
        source_hint: "partner_default",
        canonical_type: "sisbov",
        canonical_column: "sisbov",
        mapping: {
          columns: {
            sisbov: "sisbov",
            chip: "chip",
            ear_tag: "ear_tag",
            birth_date: "birth_date",
            sex: "sex",
            lot_name: "lot_name",
            zone_name: "zone_name",
            source_system: "source_system",
          },
        },
        is_default: true,
      });
      toast({
        title: "Template padrao criado",
        description: "Seu workspace ja pode processar uploads com mapeamento padrao.",
      });
      setDefaultTemplateExists(true);
    } catch (error) {
      toast({
        title: "Falha ao criar template padrao",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setCreatingDefault(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero intro — flat, no card */}
      <div>
        <h2 className="text-foreground">Kit Parceiro</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-lg">
          Envie CSV/JSON para <code className="text-xs bg-muted px-1.5 py-0.5 rounded">/api/partner/upload</code>.
          Payload bruto persistido, roteamento automático por identificador.
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

        <Card className="card-accent-left p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Template padrão</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {defaultTemplateExists ? "Ativo" : "Criar mapeamento default"}
            </p>
          </div>
          <Button
            size="sm"
            onClick={createDefaultTemplateNow}
            disabled={creatingDefault || defaultTemplateExists}
            variant={defaultTemplateExists ? "outline" : "default"}
          >
            {creatingDefault ? <Loader2 className="h-4 w-4 animate-spin" /> : defaultTemplateExists ? <CheckCircle2 className="h-4 w-4 mr-1.5" /> : <Rocket className="h-4 w-4 mr-1.5" />}
            {defaultTemplateExists ? "Criado" : "Criar"}
          </Button>
        </Card>
      </div>

      {/* Code examples — collapsible sections */}
      <div className="space-y-4">
        <p className="section-label">Referência de integração</p>

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
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Upload via cURL</p>
            <Button size="sm" variant="ghost" onClick={copyCurl} className="h-7 px-2 text-xs">
              {copied === "curl" ? <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
              {copied === "curl" ? "Copiado" : "Copiar"}
            </Button>
          </div>
          <pre className="code-block">{CURL_EXAMPLE}</pre>
        </Card>

        <Card className="p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Preview (dry-run) antes do envio real</p>
          <p className="text-xs text-muted-foreground">
            Use <code className="text-xs bg-muted px-1 py-0.5 rounded">/api/partner/upload/preview</code> para simular roteamento sem tokenizar.
          </p>
          <pre className="code-block">{PREVIEW_EXAMPLE}</pre>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Template por parceiro</p>
            <Button size="sm" variant="ghost" onClick={copyTemplateApi} className="h-7 px-2 text-xs">
              {copied === "template" ? <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
              {copied === "template" ? "Copiado" : "Copiar"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Opcional para integrações avançadas. O endpoint <code className="text-xs bg-muted px-1 py-0.5 rounded">/api/partner/upload</code>
            já faz detecção automática de colunas sem exigir template.
          </p>
          <pre className="code-block">{TEMPLATE_API_EXAMPLE}</pre>
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
          <li>Gerar API Key <code className="text-xs bg-muted px-1 py-0.5 rounded">workspace_ingestion</code> com circuito de staging.</li>
          <li>Opcional: rodar preview em <code className="text-xs bg-muted px-1 py-0.5 rounded">/api/partner/upload/preview</code> para validar o lote.</li>
          <li>Enviar em chunks (recomendado 50-150 linhas por request) para <code className="text-xs bg-muted px-1 py-0.5 rounded">/api/partner/upload</code>.</li>
          <li>Resolver pendências em Roteamento.</li>
          <li>Abrir <code className="text-xs bg-muted px-1 py-0.5 rounded">circuit_links</code> retornados para ver o portfólio imediatamente.</li>
          <li>Opcional: usar templates + <code className="text-xs bg-muted px-1 py-0.5 rounded">/api/items/bulk</code> para casos avançados.</li>
        </ol>
        <a href="/app/api-keys" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-3">
          <Link2 className="h-3.5 w-3.5" />
          Ir para API Keys
        </a>
      </div>
    </div>
  );
}
