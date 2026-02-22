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
  DatabaseZap,
  ExternalLink,
  FileText,
  Rocket,
  TerminalSquare,
} from "lucide-react";
import { toast } from "sonner";

/* ── deliverables data ─────────────────────────────────── */

const deliverables = [
  { label: "auth: login / logout / whoami / refresh", done: true },
  { label: "workspace: init / status / config / reset", done: true },
  { label: "circuits: list / show / join / members", done: true },
  { label: "items: new / list / show / update", done: true },
  { label: "events: add / list / show / update", done: true },
  { label: "SDK + docs + partner quickstart", done: true },
  { label: "2 external integrations with privacy strategy", done: false },
];

const steps = [
  {
    title: "Prepare workspace & authentication",
    detail:
      "Create or validate a partner-type workspace, generate credentials, and confirm gateway access. This closes identity and authorization for the integration.",
  },
  {
    title: "Define canonical identifiers & mapping",
    detail:
      "Choose the primary canonical identifier (SISBOV, chip, ear_tag, etc.), map columns, and configure fallback to prevent DFID duplication.",
  },
  {
    title: "Ingest via a single endpoint",
    detail:
      "Send data to POST /api/items/bulk — the same endpoint used by the Partner Portal. Activate saved partner templates to reduce friction.",
  },
  {
    title: "Enrich with typed events",
    detail:
      "Record typed events (item_movement, item_vaccinated, item_weighed…) to build an operational timeline and audit trail.",
  },
  {
    title: "Validate circuit & public view",
    detail:
      "Confirm items in the circuit, public/private visibility, shareable URL, and consistency of the public page for demonstration.",
  },
  {
    title: "Tranche evidence package",
    detail:
      "Collect receipts, CLI/SDK test outputs, and integration logs from two partners to deliver the Tranche 1 evidence package.",
  },
];

/* ── code snippets ─────────────────────────────────────── */

const cliSnippet = `# Install & build
# Option A: no global install
npx @defarm/cli --help

# Preferred for partners (API key auth)
npx @defarm/cli auth api-key --key '<partner_api_key>'
npx @defarm/cli circuits list

# Alternative: login/password
npx @defarm/cli workspace init --gateway https://gateway.defarm.net
npx @defarm/cli auth login --email partner@example.com --password '••••••'

# Explore circuits & items
npx @defarm/cli circuits list
npx @defarm/cli items list --circuit <circuit_id>
npx @defarm/cli items new \\
  --value-chain BEEF --country BR --year 2026 \\
  --circuit-id <circuit_id> \\
  --metadata '{"canonical_type":"sisbov","canonical_id":"105500497219983"}'

# Add an event
npx @defarm/cli events add \\
  --event-type item_vaccinated \\
  --source-type partner --source-id demo_partner \\
  --circuit-id <circuit_id> --item-id <item_id> \\
  --payload '{"vaccine":"aftosa"}'`;

const installSnippet = `# Prerequisites
# - Node.js 20+
# - npm 10+
# - account in DeFarm platform

# CLI (no install)
npx @defarm/cli --help

# CLI (optional global install)
npm install -g @defarm/cli
defarm --help

# SDK install in your project
npm install @defarm/sdk

# first commands
defarm workspace init --gateway https://gateway.defarm.net
defarm auth login --email <partner_email> --password '<partner_password>'`;

const apiSnippet = `curl -X POST "https://gateway.defarm.net/api/items/bulk" \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "circuit_id": "<uuid>",
    "items": [
      {
        "value_chain": "BEEF",
        "country": "BR",
        "year": 2026,
        "identifiers": [
          { "identifier_type": "sisbov",
            "identifier_value": "105500497219983" }
        ],
        "metadata": {
          "source": "gerbov",
          "lot": "Calves - Serra"
        }
      }
    ]
  }'`;

const sdkSnippet = `import { DefarmSdk } from "@defarm/sdk";

const sdk = new DefarmSdk({
  gatewayBaseUrl: "https://gateway.defarm.net",
});

// Preferred for partners: API key
sdk.setApiKey(process.env.DEFARM_API_KEY!);

// Alternative: login/password
// const auth = await sdk.auth.login(process.env.DEFARM_EMAIL!, process.env.DEFARM_PASSWORD!);
// sdk.setAccessToken(auth.access_token);

// List circuits & pick the first one
const circuits = await sdk.circuits.list();
const circuit = circuits[0];

// Create an item
const item = await sdk.items.create({
  value_chain: "BEEF",
  country: "BR",
  year: 2026,
  circuit_id: circuit.id,
  metadata: {
    canonical_type: "sisbov",
    canonical_id: "105500497219983",
    source: "gerbov",
  },
});

// Record a vaccination event
await sdk.events.add({
  event_type: "item_vaccinated",
  source_type: "partner",
  source_id: "gerbov",
  circuit_id: circuit.id,
  item_id: item.id,
  payload: { vaccine: "aftosa" },
});`;

/* ── component ─────────────────────────────────────────── */

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

const StellarTranche1 = () => {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero */}
        <section className="pt-28 pb-16 bg-gradient-to-b from-emerald-50 to-background">
          <div className="section-container">
            <div className="max-w-5xl mx-auto">
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <Badge className="bg-primary text-primary-foreground">Tranche 1 — MVP</Badge>
                <Badge variant="outline">Month 3</Badge>
                <Badge variant="outline">Budget US $24,000</Badge>
              </div>

              <h1 className="text-4xl sm:text-5xl font-black leading-tight">
                CLI, SDK & operational demo — ready to ship
              </h1>
              <p className="mt-5 text-lg text-muted-foreground max-w-4xl">
                Everything needed to onboard a partner from scratch: authenticate, ingest data, record events,
                and expose a verifiable public circuit — all through a single gateway.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild className="btn-offset">
                  <a href="#playground">Jump to playground <ArrowRight className="h-4 w-4" /></a>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/stellar">Back to grant overview</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Deliverables checklist */}
        <section className="py-16">
          <div className="section-container">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold mb-2">Tranche 1 deliverables</h2>
              <p className="text-muted-foreground mb-6">Official scope committed in the SCF #40 proposal.</p>
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

        {/* Execution steps */}
        <section className="py-16 bg-muted/40 border-y">
          <div className="section-container">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold mb-2">Execution steps</h2>
              <p className="text-muted-foreground mb-8">Click any step for details.</p>
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <Card
                    key={step.title}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-sm ${activeStep === index ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setActiveStep(activeStep === index ? null : index)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        {step.title}
                      </CardTitle>
                    </CardHeader>
                    {activeStep === index && (
                      <CardContent>
                        <p className="text-muted-foreground pl-10">{step.detail}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Playground */}
        <section id="playground" className="py-16">
          <div className="section-container">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold mb-2">Install on any laptop (real setup)</h2>
              <p className="text-muted-foreground mb-8">
                Published npm packages. Partners can run directly without cloning DeFarm repositories.
              </p>

              <div className="grid lg:grid-cols-3 gap-6 mb-8">
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg">CLI package</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <code className="text-xs bg-muted px-1 rounded">@defarm/cli</code>
                    <a className="mt-2 block text-primary hover:underline" href="https://www.npmjs.com/package/@defarm/cli" target="_blank" rel="noopener noreferrer">View on npm</a>
                  </CardContent>
                </Card>
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg">SDK package</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <code className="text-xs bg-muted px-1 rounded">@defarm/sdk</code>
                    <a className="mt-2 block text-primary hover:underline" href="https://www.npmjs.com/package/@defarm/sdk" target="_blank" rel="noopener noreferrer">View on npm</a>
                  </CardContent>
                </Card>
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg">Auth mode</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Partners should prefer API key. Login/password stays available for interactive flows.
                  </CardContent>
                </Card>
              </div>

              <CodeBlock code={installSnippet} language="bash" />

              <h2 className="text-3xl font-bold mb-2">Interactive playground</h2>
              <p className="text-muted-foreground mb-8">
                Three ways to integrate — pick the one that fits your workflow and try the commands below.
              </p>

              {/* Capability cards */}
              <div className="grid lg:grid-cols-3 gap-6 mb-10">
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TerminalSquare className="h-5 w-5 text-primary" /> CLI
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Authenticate, list circuits, create items, and add events from your terminal in under 2 minutes.
                  </CardContent>
                </Card>
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Code2 className="h-5 w-5 text-primary" /> SDK
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Integrate into partner systems with TypeScript. Standard auth + ingestion flow with full type safety.
                  </CardContent>
                </Card>
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DatabaseZap className="h-5 w-5 text-primary" /> REST API
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Single bulk ingestion endpoint for the Partner Portal and direct integrations (<code className="text-xs bg-muted px-1 rounded">POST /api/items/bulk</code>).
                  </CardContent>
                </Card>
              </div>

              {/* Tabbed code examples */}
              <Tabs defaultValue="cli" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="cli" className="gap-1.5"><TerminalSquare className="h-4 w-4" /> CLI</TabsTrigger>
                  <TabsTrigger value="api" className="gap-1.5"><DatabaseZap className="h-4 w-4" /> REST API</TabsTrigger>
                  <TabsTrigger value="sdk" className="gap-1.5"><Code2 className="h-4 w-4" /> SDK</TabsTrigger>
                </TabsList>

                <TabsContent value="cli">
                  <CodeBlock code={cliSnippet} language="bash" />
                </TabsContent>
                <TabsContent value="api">
                  <CodeBlock code={apiSnippet} language="bash" />
                </TabsContent>
                <TabsContent value="sdk">
                  <CodeBlock code={sdkSnippet} language="typescript" />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </section>

        {/* Demo script + links */}
        <section className="py-16 bg-muted/40 border-y">
          <div className="section-container">
            <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2"><Rocket className="h-5 w-5 text-primary" /> Live demo script (10 min)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p className="flex items-start gap-2"><span className="font-bold text-foreground w-5 shrink-0">1.</span> Show partner circuit (CowPro / Gerbov) with existing tokenized items.</p>
                  <p className="flex items-start gap-2"><span className="font-bold text-foreground w-5 shrink-0">2.</span> Ingest a new item live and prove canonical deduplication.</p>
                  <p className="flex items-start gap-2"><span className="font-bold text-foreground w-5 shrink-0">3.</span> Record a typed event and open the item timeline.</p>
                  <p className="flex items-start gap-2"><span className="font-bold text-foreground w-5 shrink-0">4.</span> Display the public circuit page and shareable link.</p>
                  <p className="flex items-start gap-2"><span className="font-bold text-foreground w-5 shrink-0">5.</span> Show ingestion receipt / log for audit evidence.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Resources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Link className="flex items-center gap-2 text-primary hover:underline" to="/app/parceiro">
                    Partner Portal <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                  <a className="flex items-center gap-2 text-primary hover:underline" href="/openapi.yaml" target="_blank" rel="noopener noreferrer">
                    OpenAPI specification (gateway) <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <Link className="flex items-center gap-2 text-primary hover:underline" to="/stellar">
                    Grant overview page <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                  <p className="text-muted-foreground pt-1">
                    Technical docs: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">engines/docs/partner/quickstart-cli-sdk.md</code>
                  </p>
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

export default StellarTranche1;
