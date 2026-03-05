import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, BookOpen, FileText, Code } from "lucide-react";

const DOCS_URL = "https://docs.defarm.net";

const resources = [
  {
    title: "Guia de Integração",
    description: "Passo a passo para conectar sua aplicação à API DeFarm.",
    href: `${DOCS_URL}/integration`,
    icon: BookOpen,
  },
  {
    title: "Referência da API",
    description: "Endpoints, autenticação e exemplos de requisição.",
    href: `${DOCS_URL}/api`,
    icon: Code,
  },
  {
    title: "Formatos de Arquivo",
    description: "Especificação dos formatos CSV e JSON aceitos na ingestão.",
    href: `${DOCS_URL}/formats`,
    icon: FileText,
  },
];

export default function PartnerDocs() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="section-label mb-1">Desenvolvimento</p>
        <h1 className="text-foreground">Documentação</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Recursos para integrar com a plataforma DeFarm.
        </p>
      </div>

      <div className="space-y-3">
        {resources.map((r) => (
          <a
            key={r.title}
            href={r.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-4 rounded-xl bg-muted/40 p-4 hover:bg-muted/60 transition-colors group"
          >
            <r.icon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                {r.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" />
          </a>
        ))}
      </div>

      <div className="pt-2">
        <Button variant="outline" size="sm" asChild>
          <a href={DOCS_URL} target="_blank" rel="noopener noreferrer">
            Abrir documentação completa
            <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
          </a>
        </Button>
      </div>
    </div>
  );
}
