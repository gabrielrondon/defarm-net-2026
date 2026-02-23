import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  const [copied, setCopied] = useState<"none" | "sdk">("none");

  const copy = async (target: "sdk", content: string) => {
    await navigator.clipboard.writeText(content);
    setCopied(target);
    setTimeout(() => setCopied("none"), 1800);
  };

  return (
    <div className="space-y-6">
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
    </div>
  );
}
