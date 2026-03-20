import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import stellarLogo from "@/assets/partners/stellar.png";
import { ArrowRight, Blocks, CheckCircle2, Database, FileClock, ShieldCheck, Wallet, ExternalLink } from "lucide-react";
import { useState } from "react";

const pillars = [
  {
    icon: Database,
    title: "Data Layer",
    desc: "Ingest and normalize agricultural data from ERPs, associations, and partner providers into a unified schema.",
    details: [
      "Canonical identifier resolution (SISBOV, ear tag, chip)",
      "Bulk ingestion via REST API or Partner Portal",
      "Deduplication engine with DFID generation",
    ],
  },
  {
    icon: Blocks,
    title: "Traceability Layer",
    desc: "DFIDs, circuits, typed events, and verifiable history for every traceable item across the value chain.",
    details: [
      "Typed event timeline (movement, vaccination, weighing)",
      "Public/private circuit visibility with shareable URLs",
      "Audit trail with Merkle-tree anchoring",
    ],
  },
  {
    icon: Wallet,
    title: "Liquidity Layer",
    desc: "Auditable proofs anchored on Stellar to enable credit, insurance, and financial services for agri-assets.",
    details: [
      "On-chain receipts via Soroban smart contracts",
      "Selective disclosure for sensitive data",
      "Programmable compliance proofs for lenders",
    ],
  },
];

const tranches = [
  {
    title: "Tranche 1 — MVP",
    budget: "$24,000",
    month: "Month 3",
    status: "Completed",
    goal: "CLI + SDK + core operations + 2 partner integrations with full documentation",
    href: "/stellar/tranche1",
    highlights: ["Auth & workspace management", "Items & events CRUD", "Partner SDK + quickstart"],
  },
  {
    title: "Tranche 2 — Testnet",
    budget: "$36,000",
    month: "Month 6",
    status: "In progress",
    goal: "Selective disclosure, on-chain receipts, and Soroban governance on testnet",
    href: "/stellar/tranche2",
    highlights: ["Soroban contract deployment", "Selective disclosure engine", "Testnet anchoring pipeline"],
  },
  {
    title: "Tranche 3 — Mainnet",
    budget: "$30,000",
    month: "Month 9",
    status: "Planned",
    goal: "Go-live on mainnet, miniapp framework, and institutional partner onboarding",
    href: "/stellar",
    highlights: ["Mainnet deployment", "Miniapp framework for partners", "Institutional onboarding flow"],
  },
];

const StellarOverview = () => {
  const [expandedPillar, setExpandedPillar] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero */}
        <section className="pt-28 pb-16 bg-gradient-to-b from-emerald-50 to-background">
          <div className="section-container">
            <div className="max-w-5xl mx-auto">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <Badge className="bg-primary text-primary-foreground">Stellar Community Fund #40</Badge>
                <Badge variant="outline" className="border-primary/40 text-primary">Awarded</Badge>
                <Badge variant="outline">US $90,000</Badge>
              </div>

              <div className="grid lg:grid-cols-[1.6fr_1fr] gap-10 items-start">
                <div>
                  <h1 className="text-4xl sm:text-5xl font-black text-foreground leading-tight">
                    From trusted agri-data to digital assets with real liquidity
                  </h1>
                  <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                    DeFarm turns traceability into financial infrastructure. Every item — animal, lot, property, or agri-asset — gets a
                    verifiable identity, an event history, and auditable proofs anchored on the Stellar network.
                  </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild className="btn-offset">
                  <Link to="/stellar/tranche2">Tranche 2 deliverables <ArrowRight className="h-4 w-4" /></Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/stellar/tranche1">Tranche 1 (completed)</Link>
                </Button>
                <Button asChild variant="outline">
                  <a href="/openapi.yaml" target="_blank" rel="noopener noreferrer">
                    API Reference <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href="https://www.npmjs.com/package/@defarm/cli" target="_blank" rel="noopener noreferrer">
                    NPM CLI <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href="https://www.npmjs.com/package/@defarm/sdk" target="_blank" rel="noopener noreferrer">
                    NPM SDK <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
                </div>
                <Card className="border-primary/20 bg-card/90 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-3">
                      <img src={stellarLogo} alt="Stellar" className="h-6 w-auto" />
                      Grant Snapshot
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="rounded-lg border bg-muted/40 p-3">
                      <p className="font-semibold">Traction target</p>
                      <p className="text-muted-foreground">20+ producers, 3 associations, 200k registered animals.</p>
                    </div>
                    <div className="rounded-lg border bg-muted/40 p-3">
                      <p className="font-semibold">Operational target</p>
                      <p className="text-muted-foreground">100% of tokens anchored on Stellar with auditable history.</p>
                    </div>
                    <div className="rounded-lg border bg-muted/40 p-3">
                      <p className="font-semibold">Ecosystem</p>
                      <p className="text-muted-foreground">Stellar + Soroban smart contracts for programmable compliance.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="py-10">
          <div className="section-container">
            <div className="max-w-5xl mx-auto">
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="pt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold uppercase tracking-wide text-primary">Start here</p>
                    <h2 className="text-2xl font-bold">Want to see the completed MVP?</h2>
                    <p className="text-sm text-muted-foreground">
                      Open the Tranche 1 page to view the shipped CLI, SDK, live workflow, and recorded demo.
                    </p>
                  </div>
                  <Button asChild className="btn-offset shrink-0">
                    <Link to="/stellar/tranche1">See Tranche 1 <ArrowRight className="h-4 w-4" /></Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Architecture */}
        <section className="py-16">
          <div className="section-container">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold mb-2">Three-layer architecture</h2>
              <p className="text-muted-foreground mb-8">Click a layer to explore its components.</p>
              <div className="grid md:grid-cols-3 gap-6">
                {pillars.map((pillar, idx) => (
                  <Card
                    key={pillar.title}
                    className={`h-full cursor-pointer transition-all duration-200 hover:shadow-md ${expandedPillar === idx ? "ring-2 ring-primary shadow-md" : ""}`}
                    onClick={() => setExpandedPillar(expandedPillar === idx ? null : idx)}
                  >
                    <CardHeader>
                      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
                        <pillar.icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-xl">{pillar.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-muted-foreground">{pillar.desc}</p>
                      {expandedPillar === idx && (
                        <ul className="space-y-2 pt-2 border-t">
                          {pillar.details.map((d) => (
                            <li key={d} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                              <span>{d}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Tranches roadmap */}
        <section className="py-16 bg-muted/40 border-y">
          <div className="section-container">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold mb-8">Grant roadmap — 3 tranches</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {tranches.map((tranche) => (
                  <Card key={tranche.title} className="h-full flex flex-col">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-1">
                        <Badge
                          variant={tranche.status === "In progress" ? "default" : "outline"}
                          className={tranche.status === "In progress" ? "bg-primary text-primary-foreground" : tranche.status === "Completed" ? "border-emerald-500 text-emerald-700" : ""}
                        >
                          {tranche.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{tranche.month}</span>
                      </div>
                      <CardTitle className="text-xl">{tranche.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-1 flex flex-col">
                      <p className="text-sm text-muted-foreground">{tranche.goal}</p>
                      <ul className="space-y-1.5">
                        {tranche.highlights.map((h) => (
                          <li key={h} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="pt-2 mt-auto">
                        <p className="font-semibold text-lg">{tranche.budget}</p>
                      </div>
                      <Button asChild variant="outline" size="sm" className="w-full">
                        <Link to={tranche.href}>View deliverables <ArrowRight className="h-3.5 w-3.5" /></Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Why it matters + Presentation outline */}
        <section className="py-16">
          <div className="section-container">
            <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Why it matters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-muted-foreground">
                  <p>Rural credit and insurance require reliable proof of history. DeFarm reduces due diligence costs and accelerates decisions for lenders.</p>
                  <p>With verifiable identity per item and auditable events, informational risk drops across the entire value chain — from farm gate to financial desk.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2"><FileClock className="h-5 w-5 text-primary" /> Presentation outline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 text-primary" /> 1. Problem: fragmented data, low trust, high verification cost.</p>
                  <p className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 text-primary" /> 2. Solution: DFID + circuits + events + receipts.</p>
                  <p className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 text-primary" /> 3. Stellar: auditable, programmable anchoring for finance.</p>
                  <p className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 text-primary" /> 4. Live demo: CLI/SDK + partner onboarding flow.</p>
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

export default StellarOverview;
