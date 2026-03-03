import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Building2, ShieldCheck, BookOpenText, Route, Activity, ExternalLink } from "lucide-react";

const sections = [
  {
    id: "identity",
    title: "Identidade e confiança",
    description:
      "Workspaces governamentais usam workspace_type=government e podem ter trust profile definido pelo admin.",
    bullets: [
      "Criar workspace da agência com tipo government.",
      "Definir trust/source profile quando aplicável.",
      "Manter source_id oficial e estável (ex.: iagro-ms).",
    ],
  },
  {
    id: "read",
    title: "Leitura operacional",
    description: "Com API key workspace_ingestion, a agência consulta dados tokenizados e evolução operacional.",
    bullets: [
      "GET /v1/items/api-key",
      "GET /v1/items/{id}/api-key",
      "GET /v1/events/api-key",
      "GET /v1/circuits/api-key",
      "GET /v1/receipts/api-key",
    ],
  },
  {
    id: "contribute",
    title: "Contribuição oficial",
    description:
      "Para enriquecer dados (peso, inspeções, movimentação), usar JWT com membership explícito no circuito.",
    bullets: [
      "POST /v1/events com source_type=government.",
      "Contribuir apenas em circuitos autorizados.",
      "Manter trilha de origem por evento para auditoria.",
    ],
  },
  {
    id: "shared-circuit",
    title: "Circuito compartilhado",
    description:
      "Produtor/parceiro publica dados base. Agência lê, valida e contribui no mesmo circuito, preservando proveniência.",
    bullets: [
      "Ingressão base por parceiro (preview + intake).",
      "Enriquecimento oficial por agência.",
      "Timeline unificada multi-ator.",
    ],
  },
];

export default function GovernmentDocs() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Docs Governo</h1>
          <p className="text-muted-foreground mt-1">
            Guia operacional para agências oficiais dentro do portal DeFarm.
          </p>
        </div>
        <Badge variant="secondary" className="gap-2">
          <Building2 className="h-3.5 w-3.5" />
          Portal Gov
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpenText className="h-5 w-5" />
            Como usar esta documentação
          </CardTitle>
          <CardDescription>
            Conteúdo operacional embutido para agências. Contrato técnico público continua em docs.defarm.net.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Este espaço é focado em execução governamental no dia a dia (ler, contribuir, auditar).
            Arquitetura interna e detalhes sensíveis de operação não são publicados aqui.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href="https://docs.defarm.net/docs/getting-started" target="_blank" rel="noreferrer">
                Contrato público parceiro
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href="https://docs.defarm.net/docs/api" target="_blank" rel="noreferrer">
                Referência API pública
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => (
          <Card key={section.id} id={section.id}>
            <CardHeader>
              <CardTitle className="text-base">{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Route className="h-5 w-5" />
            Atalhos de operação
          </CardTitle>
          <CardDescription>Navegação rápida para executar o fluxo fim a fim no portal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/app/circuitos">Circuitos</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/app/itens">Itens</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/app/eventos">Eventos</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/app/compliance">Compliance</Link>
            </Button>
          </div>
          <Separator />
          <p className="text-sm text-muted-foreground">
            Padrão recomendado: ingestão em lote por parceiro, leitura operacional contínua pela agência e
            contribuição oficial com eventos governados.
          </p>
          <div className="flex items-center gap-2 text-sm text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Source tracking e governança por evento permanecem obrigatórios.
          </div>
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Activity className="h-4 w-4 text-primary" />
            Use timeline e receipts para auditoria e rastreabilidade.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

