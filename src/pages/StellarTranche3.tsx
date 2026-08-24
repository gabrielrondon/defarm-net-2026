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
  Blocks,
  CheckCircle2,
  Code2,
  Copy,
  ExternalLink,
  FileText,
  Gauge,
  Landmark,
  Lock,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

const deliverables = [
  { label: "Platform live on Stellar mainnet — IPCM update + NFT mint in a single atomic Soroban transaction", done: true },
  { label: "Miniapp framework published: @defarm/miniapp on npm (TypeScript) + Rust workspace, both wrapping the SDK", done: true },
  { label: "Example miniapps shipped in both stacks: tokenization + marketplace, verified against the production gateway", done: true },
  { label: "Institutional partners connected in production (beef supply chain BR/UY + livestock ERP integrator)", done: true },
  { label: "Public developer documentation: docs.defarm.net, partner OpenAPI, Swagger UI, Postman collection, build-on-defarm guide", done: true },
  { label: "Monitoring and support: SLO catalog, mainnet runbook, incident process, anchor-queue recovery procedures", done: true },
  { label: "Performance validated far beyond the 1k+ items / 10+ circuits target (see production snapshot below)", done: true },
];

const snapshot = [
  { metric: "Items registered", value: "8,837", note: "8,000+ in the largest circuit alone" },
  { metric: "Circuits with items", value: "138", note: "31 circuits hold 10+ items" },
  { metric: "Typed events recorded", value: "57,013", note: "movement, weighing, vaccination, custody…" },
  { metric: "Anchor jobs processed", value: "11,925", note: "11,265 completed by the adapter pipeline" },
  { metric: "On-chain anchors confirmed", value: "5,063", note: "creation + CID updates + NFT mints" },
  { metric: "NFT mints on mainnet", value: "2,239", note: "tokenization PoC running as a live flow" },
  { metric: "Operation receipts", value: "838", note: "813 ingestion + 25 selective disclosure" },
  { metric: "Active workspaces with items", value: "36", note: "partner, producer, processor, certifier roles" },
];

const steps = [
  {
    title: "Install the miniapp framework",
    goal: "Get the published framework package and scaffold a project that consumes the DeFarm API.",
    commands: `npm install @defarm/miniapp\n\n# or start from the reference examples (public repo)\ngit clone https://github.com/defarm-repo/tooling\ncd tooling/packages/miniapp/examples/tokenization`,
    expected: "Framework installed; reference examples available locally.",
    nextAction: "Configure your workspace API key.",
  },
  {
    title: "Configure credentials",
    goal: "Point the miniapp at the production gateway with a workspace-scoped partner key.",
    commands: `export DEFARM_GATEWAY=https://gateway.defarm.net\nexport DEFARM_API_KEY=<partner_api_key>`,
    expected: "Environment ready; the key scopes every call to your workspace.",
    nextAction: "List items to confirm connectivity.",
  },
  {
    title: "Read verified data",
    goal: "Use the framework helpers to list items and inspect one verifiable identity.",
    commands: `import { DefarmMiniapp } from '@defarm/miniapp';\n\nconst app = new DefarmMiniapp({\n  gateway: process.env.DEFARM_GATEWAY,\n  apiKey: process.env.DEFARM_API_KEY,\n});\n\nconst items = await app.items.list({ circuitId: '<circuit_id>', limit: 50 });\nconst item = await app.items.show(items[0].id);`,
    expected: "Items returned from your circuit with DFIDs and event history.",
    nextAction: "Run the tokenization flow.",
  },
  {
    title: "Run the tokenization example",
    goal: "Turn a verified item into a tokenized representation with an auditable disclosure.",
    commands: `# inside tooling/packages/miniapp/examples/tokenization\nnpm install && npm run dev\n\n# the example exposes provenance over HTTP\ncurl http://localhost:3000/token/<DFID>`,
    expected: "Disclosure receipt + IPCM anchor reference returned for the DFID.",
    nextAction: "Verify the anchor independently on Stellar mainnet.",
  },
  {
    title: "Verify on mainnet",
    goal: "Check the on-chain anchor and the public item page without trusting DeFarm.",
    commands: `# public item page (no auth)\nopen https://defarm.net/i/DFID-BEEF-BR-2026-000084-78422b\n\n# IPCM contract on Stellar mainnet\nopen https://stellar.expert/explorer/public/contract/CCWKKEQTMGBNLHDKSYWFOA4IFFR2GT6FRYSHIXQQGNVB64AQHCFXLL4S`,
    expected: "Anchor transaction visible on Stellar; public page shows the verifiable history.",
    nextAction: "Build your own miniapp on top of the same primitives.",
  },
];

const miniappSnippet = `import { DefarmMiniapp } from '@defarm/miniapp';

const app = new DefarmMiniapp({
  gateway: 'https://gateway.defarm.net',
  apiKey: process.env.DEFARM_API_KEY,
});

// list items in a circuit
const items = await app.items.list({ circuitId: '<circuit_id>', limit: 50 });

// create a disclosure for a finance audience
const disclosure = await app.disclosures.create({
  itemId: items[0].id,
  preset: 'finance_basic',
  audience: 'investor',
});

// receipts are the audit trail
const receipts = await app.receipts.list({ circuitId: '<circuit_id>' });`;

const rustSnippet = `# Rust framework mirrors the TypeScript surface
# tooling/rust: defarm-sdk + defarm-miniapp
cd tooling/rust/defarm-miniapp/examples/tokenization
cargo run

# the marketplace example renders listings with disclosure receipts
cd ../marketplace
cargo run`;

const verifySnippet = `# public item page — no auth, no DeFarm account
open https://defarm.net/i/DFID-BEEF-BR-2026-000084-78422b

# IPCM contract (mainnet)
open https://stellar.expert/explorer/public/contract/CCWKKEQTMGBNLHDKSYWFOA4IFFR2GT6FRYSHIXQQGNVB64AQHCFXLL4S

# NFT contract (mainnet)
open https://stellar.expert/explorer/public/contract/CC64BBFHI6WVBUARNNMJN4LMFSO4DUI3WCQ7EFQKVXGCXIO3JGZTABXH`;

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

const StellarTranche3 = () => {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="pt-28 pb-16 bg-gradient-to-b from-emerald-50 to-background">
          <div className="section-container">
            <div className="max-w-5xl mx-auto">
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <Badge className="bg-primary text-primary-foreground">Tranche 3 — Mainnet</Badge>
                <Badge variant="outline">Final tranche</Badge>
                <Badge variant="outline">Budget US $30,000</Badge>
                <Badge className="bg-primary text-primary-foreground">Ready for SCF review</Badge>
              </div>

              <h1 className="text-4xl sm:text-5xl font-black leading-tight">
                Live on Stellar mainnet, with a framework for others to build on
              </h1>
              <p className="mt-5 text-lg text-muted-foreground max-w-4xl">
                The final tranche closes the loop: real partner data anchored on mainnet at scale, a published
                miniapp framework in TypeScript and Rust, institutional partners in production, and public
                documentation so any developer can build on verified agricultural data.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild className="btn-offset">
                  <a href="#snapshot">Production snapshot <ArrowRight className="h-4 w-4" /></a>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/stellar">Back to grant overview</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/stellar/tranche2">Tranche 2 (verified)</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/stellar/tranche1">Tranche 1 (verified)</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="section-container">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold mb-2">Tranche 3 deliverables</h2>
              <p className="text-muted-foreground mb-6">Mainnet operations, developer framework, institutional adoption, and validated scale.</p>
              <Card>
                <CardContent className="pt-6 grid sm:grid-cols-2 gap-3 text-sm">
                  {deliverables.map((item) => (
                    <p key={item.label} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                      <span className="text-foreground">{item.label}</span>
                    </p>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="snapshot" className="py-16 bg-muted/40 border-y">
          <div className="section-container">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold mb-2">Production snapshot — 2026-08-24</h2>
              <p className="text-muted-foreground mb-8">
                Numbers below are real production traffic measured directly from the live registry and the
                Stellar mainnet contracts — not a synthetic benchmark. The SCF target was 1,000+ items across
                10+ circuits.
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {snapshot.map((s) => (
                  <Card key={s.metric}>
                    <CardContent className="pt-6">
                      <p className="text-3xl font-black text-primary">{s.value}</p>
                      <p className="text-sm font-semibold mt-1">{s.metric}</p>
                      <p className="text-xs text-muted-foreground mt-1">{s.note}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid lg:grid-cols-2 gap-6 mt-8">
                <Card className="border-primary/30">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Blocks className="h-5 w-5 text-primary" /> Mainnet contracts</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <p className="font-semibold">IPCM (provenance)</p>
                      <a
                        className="text-primary hover:underline break-all inline-flex items-center gap-1"
                        href="https://stellar.expert/explorer/public/contract/CCWKKEQTMGBNLHDKSYWFOA4IFFR2GT6FRYSHIXQQGNVB64AQHCFXLL4S"
                        target="_blank" rel="noopener noreferrer"
                      >
                        CCWKKEQTMGBNLHDKSYWFOA4IFFR2GT6FRYSHIXQQGNVB64AQHCFXLL4S <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      </a>
                    </div>
                    <div>
                      <p className="font-semibold">NFT (tokenization)</p>
                      <a
                        className="text-primary hover:underline break-all inline-flex items-center gap-1"
                        href="https://stellar.expert/explorer/public/contract/CC64BBFHI6WVBUARNNMJN4LMFSO4DUI3WCQ7EFQKVXGCXIO3JGZTABXH"
                        target="_blank" rel="noopener noreferrer"
                      >
                        CC64BBFHI6WVBUARNNMJN4LMFSO4DUI3WCQ7EFQKVXGCXIO3JGZTABXH <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      </a>
                    </div>
                    <p className="text-muted-foreground">
                      Each anchor pins the item snapshot to IPFS and updates the IPCM contract — with NFT mint —
                      in one atomic Soroban transaction.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-primary/30">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Lock className="h-5 w-5 text-primary" /> Beyond the promised scope</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" /><span>Contributor signatures: Ed25519-signed events with daily RFC 3161 trusted-timestamp roots, surfaced on public verify pages.</span></p>
                    <p className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" /><span>Sealed fields live in production: sensitive values encrypted end-to-end for a single recipient — unreadable even by DeFarm — with public commitments.</span></p>
                    <p className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" /><span>Independent verification: the MIT-licensed <a className="text-primary hover:underline" href="https://github.com/defarm-repo/defarm-verify" target="_blank" rel="noopener noreferrer">defarm-verify</a> CLIs check anchors and signatures without touching DeFarm infrastructure.</span></p>
                    <p className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" /><span>SDK 0.2.x adds the sealed-envelope wire format with Rust↔TypeScript interoperability proven by conformance vectors.</span></p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="section-container">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold mb-2">Build on DeFarm in five steps</h2>
              <p className="text-muted-foreground mb-8">Click each step for exact actions, expected output and next move.</p>
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
                          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Run</p>
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

        <section id="examples" className="py-16 bg-muted/40 border-y">
          <div className="section-container">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold mb-2">Miniapp framework examples</h2>
              <p className="text-muted-foreground mb-8">The same surface in TypeScript and Rust, plus trustless verification of the results.</p>

              <div className="grid lg:grid-cols-3 gap-6 mb-10">
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Code2 className="h-5 w-5 text-primary" /> TypeScript</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">@defarm/miniapp wraps the SDK with typed helpers for items, events, disclosures and receipts.</CardContent>
                </Card>
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Gauge className="h-5 w-5 text-primary" /> Rust</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">defarm-sdk + defarm-miniapp crates mirror the surface; both example apps ran verified against production.</CardContent>
                </Card>
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Verify</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">Every result is checkable on public pages and directly on the Stellar mainnet contracts.</CardContent>
                </Card>
              </div>

              <Tabs defaultValue="typescript" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="typescript" className="gap-1.5"><Code2 className="h-4 w-4" /> TypeScript</TabsTrigger>
                  <TabsTrigger value="rust" className="gap-1.5"><Gauge className="h-4 w-4" /> Rust</TabsTrigger>
                  <TabsTrigger value="verify" className="gap-1.5"><ShieldCheck className="h-4 w-4" /> Verify</TabsTrigger>
                </TabsList>

                <TabsContent value="typescript">
                  <CodeBlock code={miniappSnippet} language="ts" />
                </TabsContent>
                <TabsContent value="rust">
                  <CodeBlock code={rustSnippet} language="bash" />
                </TabsContent>
                <TabsContent value="verify">
                  <CodeBlock code={verifySnippet} language="bash" />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="section-container">
            <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" /> Institutional adoption</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Production circuits ingest data from real supply-chain actors: beef traceability partners in
                    Brazil and Uruguay, and a livestock ERP integrator onboarded through the partner portal with
                    workspace-scoped API keys and credit-metered usage.
                  </p>
                  <p>
                    Partner onboarding is self-service: API key issuance, ingestion preview, routing rules,
                    webhooks and receipts are all available through the portal and documented publicly.
                  </p>
                  <p className="flex items-center gap-2">
                    <Rocket className="h-4 w-4 text-primary" />
                    <a className="text-primary hover:underline" href="https://docs.defarm.net" target="_blank" rel="noopener noreferrer">Partner documentation at docs.defarm.net</a>
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Resources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <a className="flex items-center gap-2 text-primary hover:underline" href="https://www.npmjs.com/package/@defarm/miniapp" target="_blank" rel="noopener noreferrer">@defarm/miniapp on npm <ExternalLink className="h-3.5 w-3.5" /></a>
                  <a className="flex items-center gap-2 text-primary hover:underline" href="https://www.npmjs.com/package/@defarm/sdk" target="_blank" rel="noopener noreferrer">@defarm/sdk on npm <ExternalLink className="h-3.5 w-3.5" /></a>
                  <a className="flex items-center gap-2 text-primary hover:underline" href="https://www.npmjs.com/package/@defarm/cli" target="_blank" rel="noopener noreferrer">@defarm/cli on npm <ExternalLink className="h-3.5 w-3.5" /></a>
                  <a className="flex items-center gap-2 text-primary hover:underline" href="https://github.com/defarm-repo/tooling" target="_blank" rel="noopener noreferrer">Public tooling repository (SDK, CLI, miniapp, Rust) <ExternalLink className="h-3.5 w-3.5" /></a>
                  <a className="flex items-center gap-2 text-primary hover:underline" href="https://docs.defarm.net" target="_blank" rel="noopener noreferrer">Developer documentation <ExternalLink className="h-3.5 w-3.5" /></a>
                  <a className="flex items-center gap-2 text-primary hover:underline" href="https://defarm.net/i/DFID-BEEF-BR-2026-000084-78422b" target="_blank" rel="noopener noreferrer">Live public item example <ExternalLink className="h-3.5 w-3.5" /></a>
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

export default StellarTranche3;
