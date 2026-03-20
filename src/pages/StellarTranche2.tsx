import { useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Code2,
  Copy,
  Eye,
  ExternalLink,
  FileText,
  Receipt,
  Rocket,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

const deliverables = [
  { label: "Selective disclosure command + privacy presets", done: false },
  { label: "Receipt system (list/show) available", done: false },
  { label: "Advanced typed events validation", done: false },
  { label: "Soroban governance contract on testnet", done: false },
  { label: "Proof-of-concept tokenization on Stellar testnet", done: false },
  { label: "Web dashboard for non-technical users", done: true },
  { label: "Public API documentation synchronized", done: true },
];

const steps = [
  {
    title: "Prepare testnet environment",
    goal: "Set gateway/auth and define testnet variables for repeatable runs.",
    commands: `export DEFARM_GATEWAY=https://gateway.defarm.net\nexport DEFARM_API_KEY=<partner_api_key>\nexport DEFARM_CIRCUIT_ID=<circuit_id>\nexport STELLAR_NETWORK=testnet`,
    expected: "Environment variables ready for all commands in this tranche.",
    nextAction: "Create baseline item/event data for disclosure and receipts.",
  },
  {
    title: "Create baseline records",
    goal: "Generate one item and one typed event as source for disclosure and receipt validation.",
    commands: `npx @defarm/cli auth api-key --key \"$DEFARM_API_KEY\"\nnpx @defarm/cli items new \\\n  --value-chain BEEF --country BR --year 2026 \\\n  --circuit-id \"$DEFARM_CIRCUIT_ID\" \\\n  --metadata '{"canonical_type":"sisbov","canonical_id":"105500497219983","source":"tranche2"}'\n\nnpx @defarm/cli events add \\\n  --event-type item_movement \\\n  --source-type partner --source-id tranche2 \\\n  --circuit-id \"$DEFARM_CIRCUIT_ID\" --item-id <item_id> \\\n  --payload '{"gta_number":"BR-GTA-001","from":"farm-a","to":"farm-b"}'`,
    expected: "Item + event visible in circuit and ready for disclosure test.",
    nextAction: "Run selective disclosure calls with different privacy presets.",
  },
  {
    title: "Execute selective disclosure",
    goal: "Test privacy presets and verify that only allowed fields are exposed.",
    commands: `curl -X POST \"$DEFARM_GATEWAY/api/disclosures\" \\\n  -H \"x-api-key: $DEFARM_API_KEY\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n    "item_id":"<item_id>",\n    "preset":"finance_basic",\n    "audience":"bank_partner"\n  }'`,
    expected: "Disclosure artifact created with restricted field set.",
    nextAction: "Fetch receipt and persist evidence for audit.",
  },
  {
    title: "Validate receipts",
    goal: "Confirm disclosure/anchoring operations generate receipts that can be listed and inspected.",
    commands: `curl -X GET \"$DEFARM_GATEWAY/api/receipts?circuit_id=$DEFARM_CIRCUIT_ID\" \\\n  -H \"x-api-key: $DEFARM_API_KEY\"\n\ncurl -X GET \"$DEFARM_GATEWAY/api/receipts/<receipt_id>\" \\\n  -H \"x-api-key: $DEFARM_API_KEY\"`,
    expected: "Receipt list and receipt detail return traceable operation metadata.",
    nextAction: "Anchor proof path on Stellar testnet.",
  },
  {
    title: "Anchor proof in Stellar testnet",
    goal: "Publish proof hash/receipt linkage to Soroban-enabled testnet workflow.",
    commands: `# placeholder command (replace with final contract call)\nstellar contract invoke \\\n  --network testnet \\\n  --id <soroban_contract_id> \\\n  --source <key_alias> \\\n  -- publish_receipt \\\n  --receipt_id <receipt_id> \\\n  --proof_hash <hash>`,
    expected: "Testnet transaction hash captured and linked back to receipt.",
    nextAction: "Show end-to-end dashboard and finalize tranche evidence pack.",
  },
  {
    title: "Close tranche evidence package",
    goal: "Assemble technical proof for SCF tranche review.",
    commands: `# mandatory evidence checklist\n# 1) command logs\n# 2) receipt ids\n# 3) tx hash on testnet\n# 4) UI screenshots (dashboard + public view)\n# 5) updated OpenAPI references`,
    expected: "Evidence bundle complete and reproducible by external reviewers.",
    nextAction: "Promote successful flows into Tranche 3 mainnet backlog.",
  },
];

const envTemplate = `# .env.tranche2\nDEFARM_GATEWAY=https://gateway.defarm.net\nDEFARM_API_KEY=your_partner_api_key\nDEFARM_CIRCUIT_ID=your_circuit_id\nSTELLAR_NETWORK=testnet\nSOROBAN_CONTRACT_ID=your_contract_id`;

const quickstartScript = `# 1) auth\nnpx @defarm/cli auth api-key --key \"$DEFARM_API_KEY\"\n\n# 2) create item\nnpx @defarm/cli items new \\\n  --value-chain BEEF --country BR --year 2026 \\\n  --circuit-id \"$DEFARM_CIRCUIT_ID\" \\\n  --metadata '{"canonical_type":"sisbov","canonical_id":"105500497219983","source":"tranche2"}'\n\n# 3) create typed event\nnpx @defarm/cli events add \\\n  --event-type item_movement \\\n  --source-type partner --source-id tranche2 \\\n  --circuit-id \"$DEFARM_CIRCUIT_ID\" --item-id <item_id> \\\n  --payload '{"gta_number":"BR-GTA-001","from":"farm-a","to":"farm-b"}'\n\n# 4) disclosure\ncurl -X POST \"$DEFARM_GATEWAY/api/disclosures\" \\\n  -H \"x-api-key: $DEFARM_API_KEY\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{"item_id":"<item_id>","preset":"finance_basic","audience":"bank_partner"}'\n\n# 5) list receipts\ncurl -X GET \"$DEFARM_GATEWAY/api/receipts?circuit_id=$DEFARM_CIRCUIT_ID\" \\\n  -H \"x-api-key: $DEFARM_API_KEY\"\n\n# 6) capture testnet tx\n# stellar contract invoke ... (see execution step 5)`;

const disclosureSnippet = `curl -X POST "https://gateway.defarm.net/api/disclosures" \\\n  -H "x-api-key: <partner_api_key>" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "item_id":"<item_id>",\n    "preset":"finance_basic",\n    "audience":"bank_partner",\n    "expires_in_days":30\n  }'`;

const receiptSnippet = `curl -X GET "https://gateway.defarm.net/api/receipts?circuit_id=<circuit_id>" \\\n  -H "x-api-key: <partner_api_key>"\n\ncurl -X GET "https://gateway.defarm.net/api/receipts/<receipt_id>" \\\n  -H "x-api-key: <partner_api_key>"`;

const sorobanSnippet = `stellar contract invoke \\\n  --network testnet \\\n  --id <soroban_contract_id> \\\n  --source <key_alias> \\\n  -- publish_receipt \\\n  --receipt_id <receipt_id> \\\n  --proof_hash <sha256_hash>`;

function CodeBlock({ code, language }: { code: string; language: string }) {
  const copy = () => {
    navigator.clipboard.writeText(code);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="relative group">
      <button
        onClick={copy}
        className="absolute top-3 right-3 p-1.5 rounded-md bg-muted/20 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted/40"
        title="Copy"
      >
        <Copy className="h-4 w-4" />
      </button>
      <pre className="rounded-lg bg-card-foreground text-card p-5 text-xs sm:text-sm overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
      <span className="absolute bottom-2 right-3 text-[10px] uppercase tracking-wider text-muted-foreground/60">{language}</span>
    </div>
  );
}

const StellarTranche2 = () => {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const copyText = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="pt-28 pb-16 bg-gradient-to-b from-sky-50 to-background">
          <div className="section-container">
            <div className="max-w-5xl mx-auto">
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <Badge className="bg-primary text-primary-foreground">Tranche 2 — Testnet</Badge>
                <Badge variant="outline">Month 4-6</Badge>
                <Badge variant="outline">Budget US $36,000</Badge>
                <Badge className="bg-amber-500 text-white">In progress</Badge>
              </div>

              <h1 className="text-4xl sm:text-5xl font-black leading-tight">
                Selective disclosure, receipts and Soroban testnet operations
              </h1>
              <p className="mt-5 text-lg text-muted-foreground max-w-4xl">
                This tranche connects privacy-preserving data sharing with auditable receipts and testnet anchoring. It is the bridge from core traceability into programmable finance.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild className="btn-offset">
                  <a href="#examples">Jump to tranche2 code examples <ArrowRight className="h-4 w-4" /></a>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/stellar">Back to grant overview</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/stellar/tranche1">Review tranche1 (completed)</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="section-container">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold mb-2">Tranche 2 deliverables</h2>
              <p className="text-muted-foreground mb-6">Scope focused on privacy controls, receipts, and testnet contract operations.</p>
              <Card>
                <CardContent className="pt-6 grid sm:grid-cols-2 gap-3 text-sm">
                  {deliverables.map((item) => (
                    <p key={item.label} className="flex items-start gap-2">
                      {item.done ? (
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      )}
                      <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
                    </p>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/40 border-y">
          <div className="section-container">
            <div className="max-w-5xl mx-auto">
              <Card className="mb-8 border-primary/30">
                <CardHeader>
                  <CardTitle className="text-xl">Quickstart mode (tranche2)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">Copy env + script and run the full testnet-oriented flow in sequence.</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => copyText(envTemplate, ".env template")}>Copy .env template</Button>
                    <Button size="sm" variant="outline" onClick={() => copyText(quickstartScript, "Quickstart script")}>Copy all 6 steps</Button>
                  </div>
                  <CodeBlock code={envTemplate} language="env" />
                  <CodeBlock code={quickstartScript} language="bash" />
                </CardContent>
              </Card>

              <h2 className="text-3xl font-bold mb-2">Execution steps</h2>
              <p className="text-muted-foreground mb-8">Click each step for exact terminal actions, expected output and next move.</p>
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <Card
                    key={step.title}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-sm ${activeStep === index ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setActiveStep(activeStep === index ? null : index)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0">{index + 1}</span>
                        {step.title}
                      </CardTitle>
                    </CardHeader>
                    {activeStep === index && (
                      <CardContent className="pl-10 space-y-4">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Goal</p>
                          <p className="text-sm text-foreground mt-1">{step.goal}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Run in terminal</p>
                          <CodeBlock code={step.commands} language="bash" />
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Expected result</p>
                          <p className="text-sm text-foreground mt-1">{step.expected}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Next action</p>
                          <p className="text-sm text-foreground mt-1">{step.nextAction}</p>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="examples" className="py-16">
          <div className="section-container">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold mb-2">Tranche 2 code examples</h2>
              <p className="text-muted-foreground mb-8">Reference commands for selective disclosure, receipts, and Soroban testnet anchoring.</p>

              <div className="grid lg:grid-cols-3 gap-6 mb-10">
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Eye className="h-5 w-5 text-primary" /> Disclosure</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">Create controlled views of item data for specific audiences.</CardContent>
                </Card>
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Receipt className="h-5 w-5 text-primary" /> Receipts</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">Track auditable operation receipts for compliance and finance evidence.</CardContent>
                </Card>
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Soroban Testnet</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">Anchor proof references in testnet contracts for programmable trust.</CardContent>
                </Card>
              </div>

              <Tabs defaultValue="disclosure" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="disclosure" className="gap-1.5"><Eye className="h-4 w-4" /> Disclosure</TabsTrigger>
                  <TabsTrigger value="receipts" className="gap-1.5"><Receipt className="h-4 w-4" /> Receipts</TabsTrigger>
                  <TabsTrigger value="soroban" className="gap-1.5"><Code2 className="h-4 w-4" /> Soroban</TabsTrigger>
                </TabsList>

                <TabsContent value="disclosure">
                  <CodeBlock code={disclosureSnippet} language="bash" />
                </TabsContent>
                <TabsContent value="receipts">
                  <CodeBlock code={receiptSnippet} language="bash" />
                </TabsContent>
                <TabsContent value="soroban">
                  <CodeBlock code={sorobanSnippet} language="bash" />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/40 border-y">
          <div className="section-container">
            <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2"><Rocket className="h-5 w-5 text-primary" /> Demo script (tranche2)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p className="flex items-start gap-2"><span className="font-bold text-foreground w-5 shrink-0">1.</span> Show baseline item + typed event created by partner flow.</p>
                  <p className="flex items-start gap-2"><span className="font-bold text-foreground w-5 shrink-0">2.</span> Create selective disclosure for finance audience.</p>
                  <p className="flex items-start gap-2"><span className="font-bold text-foreground w-5 shrink-0">3.</span> Open receipt list/detail and capture ids.</p>
                  <p className="flex items-start gap-2"><span className="font-bold text-foreground w-5 shrink-0">4.</span> Execute Soroban testnet publish and show tx hash.</p>
                  <p className="flex items-start gap-2"><span className="font-bold text-foreground w-5 shrink-0">5.</span> Save logs/screenshots as tranche evidence package.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Resources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <a className="flex items-center gap-2 text-primary hover:underline" href="https://www.npmjs.com/package/@defarm/cli" target="_blank" rel="noopener noreferrer">NPM CLI <ExternalLink className="h-3.5 w-3.5" /></a>
                  <a className="flex items-center gap-2 text-primary hover:underline" href="https://www.npmjs.com/package/@defarm/sdk" target="_blank" rel="noopener noreferrer">NPM SDK <ExternalLink className="h-3.5 w-3.5" /></a>
                  <a className="flex items-center gap-2 text-primary hover:underline" href="/openapi.yaml" target="_blank" rel="noopener noreferrer">OpenAPI specification <ExternalLink className="h-3.5 w-3.5" /></a>
                  <Link className="flex items-center gap-2 text-primary hover:underline" to="/stellar">Grant overview page <ExternalLink className="h-3.5 w-3.5" /></Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default StellarTranche2;
