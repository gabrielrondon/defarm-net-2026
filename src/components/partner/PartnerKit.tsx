import { useState } from "react";
import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { CheckCircle2, Copy, ExternalLink, FileText, Link2 } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

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
      { "sisbov": "105500497219983", "car": "MT-1234.56789.0000.00", "value_chain": "BEEF", "breed": "Nelore" }
    ]
  }'`;

const RESPONSE_EXAMPLE = `{
  "summary": {
    "status": "completed",
    "total_rows": 2,
    "processed_rows": 2,
    "unresolved_rows": 0,
    "routes": 1,
    "items": 2,
    "created_circuits": 0,
    "partner_reference": { "field": "external_id", "value": "cowpro-0001" }
  },
  "items": [
    {
      "dfid": "DFID-BEEF-BR-2026-000123-abc123",
      "url": "https://defarm.net/i/DFID-BEEF-BR-2026-000123-abc123",
      "partner_reference": "cowpro-0001",
      "asset_reference": { "identifier_type": "sisbov", "value": "105500497219983" }
    }
  ],
  "errors": [],
  "routes": [
    {
      "route_type": "cnpj",
      "route_value": "12345678000190",
      "circuit_id": "uuid",
      "rows": 2,
      "status": "completed",
      "items": 2
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

for (const item of result.items) {
  console.log(item.dfid, item.url, item.partner_reference);
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

export function PartnerKit({ hideHeader = false }: { hideHeader?: boolean } = {}) {
  const { t } = useTranslation();
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
      {/* Hero intro — some quando a página (PartnerPage) já fornece h1 + intro */}
      {!hideHeader && (
        <div>
          <h2 className="text-foreground">{t("portal.kit.title")}</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-lg">
            <Trans i18nKey="portal.kit.intro" components={{ code: <code className="text-xs bg-muted px-1 py-0.5 rounded" /> }} />
          </p>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="card-accent-left p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">{t("portal.kit.cards.templateCsv")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("portal.kit.cards.templateCsvDesc")}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => downloadTemplate(KIT_TEMPLATE, "partner-template.csv")}>
            <FileText className="h-4 w-4 mr-1.5" />
            {t("portal.kit.cards.download")}
          </Button>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">OpenAPI</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("portal.kit.cards.openapiDesc")}</p>
          </div>
          <Button size="sm" variant="outline" asChild>
            <a href="https://docs.defarm.net/openapi-partner-public.yaml" target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4 mr-1.5" />
              {t("portal.kit.cards.open")}
            </a>
          </Button>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Swagger</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("portal.kit.cards.swaggerDesc")}</p>
          </div>
          <Button size="sm" variant="outline" asChild>
            <a href="https://docs.defarm.net/swagger-partner.html" target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4 mr-1.5" />
              {t("portal.kit.cards.open")}
            </a>
          </Button>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Postman</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("portal.kit.cards.postmanDesc")}</p>
          </div>
          <Button size="sm" variant="outline" asChild>
            <a href="https://docs.defarm.net/postman-partner-collection.json" target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4 mr-1.5" />
              {t("portal.kit.cards.open")}
            </a>
          </Button>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground -mt-4">
        <Trans i18nKey="portal.kit.noTemplate" components={{ code: <code className="text-xs bg-muted px-1 py-0.5 rounded" /> }} />
      </p>

      {/* Code examples — accordion enxuto (era 7 cards sempre abertos = parede de texto) */}
      <div className="space-y-3">
        <p className="section-label">{t("portal.kit.refTitle")}</p>
        <p className="text-xs text-muted-foreground -mt-1">
          {t("portal.kit.refNote")}
        </p>
        <Accordion type="single" collapsible defaultValue="step1" className="space-y-2">
          <AccordionItem value="client" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-medium hover:no-underline">{t("portal.kit.accordion.clientTitle")}</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                <Trans i18nKey="portal.kit.accordion.clientDesc" components={{ code: <code className="text-xs bg-muted px-1 py-0.5 rounded" /> }} />
              </p>
              <pre className="code-block">{PARTNER_CLIENT_EXAMPLE}</pre>
              <p className="text-xs text-muted-foreground">
                <Trans i18nKey="portal.kit.accordion.clientAiKit" components={{ code: <code className="text-xs bg-muted px-1 py-0.5 rounded" /> }} />
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="jwt" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-medium hover:no-underline">{t("portal.kit.accordion.jwtTitle")}</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">{t("portal.kit.accordion.jwtDesc")}</p>
                <Button size="sm" variant="ghost" onClick={copyJwt} className="h-7 px-2 text-xs shrink-0">
                  {copied === "jwt" ? <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {copied === "jwt" ? t("portal.common.copied") : t("portal.common.copy")}
                </Button>
              </div>
              <pre className="code-block">{JWT_LOGIN_EXAMPLE}</pre>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="step1" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-medium hover:no-underline">
              <span className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide text-primary font-semibold">{t("portal.kit.step1")}</span>
                {t("portal.kit.accordion.step1Title")}
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" variant="ghost" onClick={copyCurl} className="h-7 px-2 text-xs">
                  {copied === "curl" ? <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {copied === "curl" ? t("portal.common.copied") : t("portal.common.copy")}
                </Button>
              </div>
              <pre className="code-block">{CURL_EXAMPLE}</pre>
              <p className="text-xs text-muted-foreground">
                {t("portal.kit.accordion.step1Alt")}
              </p>
              <pre className="code-block">{JSON_DIRECT_EXAMPLE}</pre>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="step2" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-medium hover:no-underline">
              <span className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide text-primary font-semibold">{t("portal.kit.step2")}</span>
                {t("portal.kit.accordion.step2Title")}
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                <Trans i18nKey="portal.kit.accordion.step2Desc" components={{ code: <code className="text-xs bg-muted px-1 py-0.5 rounded" /> }} />
              </p>
              <pre className="code-block">{PREVIEW_EXAMPLE}</pre>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="step3" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-medium hover:no-underline">
              <span className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide text-primary font-semibold">{t("portal.kit.step3")}</span>
                {t("portal.kit.accordion.step3Title")}
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  <Trans i18nKey="portal.kit.accordion.step3Desc" components={{ code: <code className="text-xs bg-muted px-1 py-0.5 rounded" /> }} />
                </p>
                <Button size="sm" variant="ghost" onClick={copyTemplateApi} className="h-7 px-2 text-xs shrink-0">
                  {copied === "template" ? <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {copied === "template" ? t("portal.common.copied") : t("portal.common.copy")}
                </Button>
              </div>
              <pre className="code-block">{TEMPLATE_API_EXAMPLE}</pre>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="ai" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-medium hover:no-underline">{t("portal.kit.accordion.aiTitle")}</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <p className="text-xs text-muted-foreground">{t("portal.kit.accordion.aiDesc")}</p>
              <pre className="code-block">{`npm install @defarm/partner-client\nhttps://docs.defarm.net/docs/partner-tooling`}</pre>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="response" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-medium hover:no-underline">{t("portal.kit.accordion.responseTitle")}</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                <Trans i18nKey="portal.kit.accordion.responseDesc" components={{ code: <code className="text-xs bg-muted px-1 py-0.5 rounded" /> }} />
              </p>
              <pre className="code-block">{RESPONSE_EXAMPLE}</pre>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Checklist — flat list, no card */}
      <div>
        <p className="section-label mb-3">{t("portal.kit.checklist.title")}</p>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside marker:text-muted-foreground/40">
          <li><Trans i18nKey="portal.kit.checklist.i1" components={{ code: <code className="text-xs bg-muted px-1 py-0.5 rounded" /> }} /></li>
          <li><Trans i18nKey="portal.kit.checklist.i2" components={{ code: <code className="text-xs bg-muted px-1 py-0.5 rounded" /> }} /></li>
          <li><Trans i18nKey="portal.kit.checklist.i3" components={{ code: <code className="text-xs bg-muted px-1 py-0.5 rounded" /> }} /></li>
          <li>{t("portal.kit.checklist.i4")}</li>
          <li><Trans i18nKey="portal.kit.checklist.i5" components={{ code: <code className="text-xs bg-muted px-1 py-0.5 rounded" /> }} /></li>
        </ol>
        <Link to="/app/api-keys" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-3">
          <Link2 className="h-3.5 w-3.5" />
          {t("portal.kit.goToApiKeys")}
        </Link>
      </div>
    </div>
  );
}
