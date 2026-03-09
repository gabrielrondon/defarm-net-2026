import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Code2, Copy, TerminalSquare } from "lucide-react";

const CLI_SNIPPET = `# sem instalar globalmente
npx @defarm/cli --help

# autenticar com API key operacional
npx @defarm/cli auth api-key --key "<PARTNER_API_KEY>"

# verificar contexto
npx @defarm/cli auth whoami`;

const SDK_SNIPPET = `import { DefarmSdk } from "@defarm/sdk";

const sdk = new DefarmSdk({ gateway: "https://gateway.defarm.net" });
sdk.setApiKey(process.env.DEFARM_API_KEY!);

const circuits = await sdk.circuits.list();
console.log(circuits.length);`;

type SdkItem = {
  id: string;
  language: string;
  slug: string;
  packageName: string;
  install: string;
  repoUrl: string;
  version: string;
  status: "stable" | "beta";
  note: string;
};

const SDK_CATALOG: SdkItem[] = [
  {
    id: "typescript",
    language: "TypeScript / Node.js",
    slug: "typescript",
    packageName: "@defarm/sdk",
    install: "npm install @defarm/sdk",
    repoUrl: "https://www.npmjs.com/package/@defarm/sdk",
    version: "0.1.3",
    status: "stable",
    note: "SDK principal, usado como base para integracoes de parceiro.",
  },
  {
    id: "python",
    language: "Python",
    slug: "python",
    packageName: "defarm-sdk",
    install: "pip install defarm-sdk",
    repoUrl: "https://pypi.org/project/defarm-sdk/",
    version: "0.1.0",
    status: "stable",
    note: "Cliente com foco em automacoes de ingestao e reconciliacao.",
  },
  {
    id: "go",
    language: "Go",
    slug: "go",
    packageName: "github.com/defarm-repo/defarm-sdk-go/defarm",
    install: "go get github.com/defarm-repo/defarm-sdk-go/defarm",
    repoUrl: "https://github.com/defarm-repo/defarm-sdk-go",
    version: "0.1.0",
    status: "stable",
    note: "SDK sem dependencias externas, ideal para servicos backend.",
  },
  {
    id: "php",
    language: "PHP",
    slug: "php",
    packageName: "defarm/sdk",
    install: "composer require defarm/sdk",
    repoUrl: "https://packagist.org/packages/defarm/sdk",
    version: "0.1.0",
    status: "stable",
    note: "Voltado para stacks web PHP com fluxo server-to-server.",
  },
  {
    id: "ruby",
    language: "Ruby",
    slug: "ruby",
    packageName: "defarm-sdk",
    install: "gem install defarm-sdk",
    repoUrl: "https://rubygems.org/gems/defarm-sdk",
    version: "0.1.0",
    status: "stable",
    note: "Integracao orientada a jobs e APIs em Ruby.",
  },
  {
    id: "kotlin",
    language: "Kotlin / JVM",
    slug: "kotlin",
    packageName: "net.defarm:defarm-sdk-kotlin",
    install: "implementation(\"net.defarm:defarm-sdk-kotlin:0.1.0\")",
    repoUrl: "https://search.maven.org/",
    version: "0.1.0",
    status: "stable",
    note: "SDK para JVM com foco em sistemas corporativos.",
  },
  {
    id: "java",
    language: "Java",
    slug: "openjdk",
    packageName: "net.defarm:defarm-sdk",
    install: "<artifactId>defarm-sdk</artifactId>",
    repoUrl: "https://search.maven.org/",
    version: "0.1.0",
    status: "beta",
    note: "Versao beta para ecossistema Java 11+.",
  },
  {
    id: "dotnet",
    language: "C# / .NET",
    slug: "dotnet",
    packageName: "Defarm.Sdk",
    install: "dotnet add package Defarm.Sdk",
    repoUrl: "https://www.nuget.org/packages/Defarm.Sdk",
    version: "0.1.0",
    status: "beta",
    note: "SDK beta para integracoes .NET 8+.",
  },
];

function LanguageLogo({ language, slug }: { language: string; slug: string }) {
  return (
    <img
      src={`https://cdn.simpleicons.org/${slug}`}
      alt={`Logo ${language}`}
      className="h-4 w-4 rounded-sm"
      loading="lazy"
      decoding="async"
    />
  );
}

export function PartnerCliTools() {
  const [copied, setCopied] = useState<"none" | "cli">("none");

  const copy = async (target: "cli", content: string) => {
    await navigator.clipboard.writeText(content);
    setCopied(target);
    setTimeout(() => setCopied("none"), 1800);
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h4 className="font-semibold text-foreground inline-flex items-center gap-2">
            <TerminalSquare className="h-4 w-4" />
            CLI
          </h4>
          <Button size="sm" variant="outline" onClick={() => copy("cli", CLI_SNIPPET)}>
            {copied === "cli" ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            Copiar
          </Button>
        </div>
        <pre className="bg-muted rounded-lg p-3 overflow-x-auto text-xs text-muted-foreground">{CLI_SNIPPET}</pre>
      </Card>
    </div>
  );
}

export function PartnerSdkTools() {
  const [copied, setCopied] = useState<string>("none");

  const copy = async (target: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopied(target);
    setTimeout(() => setCopied("none"), 1800);
  };

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="text-base font-semibold text-foreground">SDKs DeFarm para Parceiros</h3>
        <p className="text-sm text-muted-foreground mt-1.5">
          Escolha a linguagem do seu stack e use o pacote oficial. Todos os SDKs seguem os mesmos conceitos de autenticacao (JWT e API key),
          ingestao e reconciliacao de resposta.
        </p>
      </Card>

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h4 className="font-semibold text-foreground inline-flex items-center gap-2">
            <Code2 className="h-4 w-4" />
            SDK (TypeScript)
          </h4>
          <Button size="sm" variant="outline" onClick={() => copy("sdk", SDK_SNIPPET)}>
            {copied === "sdk" ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            Copiar
          </Button>
        </div>
        <pre className="bg-muted rounded-lg p-3 overflow-x-auto text-xs text-muted-foreground">{SDK_SNIPPET}</pre>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {SDK_CATALOG.map((sdk) => (
          <Card key={sdk.id} className="p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h4 className="font-semibold text-foreground inline-flex items-center gap-2">
                <LanguageLogo language={sdk.language} slug={sdk.slug} />
                {sdk.language}
              </h4>
              <Badge variant={sdk.status === "stable" ? "default" : "secondary"}>v{sdk.version}</Badge>
            </div>

            <p className="text-xs text-muted-foreground">{sdk.note}</p>

            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Pacote:</span> <code>{sdk.packageName}</code>
            </div>

            <pre className="bg-muted rounded-lg p-3 overflow-x-auto text-xs text-muted-foreground">{sdk.install}</pre>

            <div className="flex items-center justify-between gap-2">
              <Button size="sm" variant="outline" onClick={() => copy(sdk.id, sdk.install)}>
                {copied === sdk.id ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                Copiar install
              </Button>
              <a
                href={sdk.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline"
              >
                Abrir pacote
              </a>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
