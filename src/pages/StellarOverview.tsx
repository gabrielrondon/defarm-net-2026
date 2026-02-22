import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import stellarLogo from "@/assets/partners/stellar.png";
import { ArrowRight, Blocks, CheckCircle2, Database, FileClock, ShieldCheck, Wallet } from "lucide-react";

const pillars = [
  {
    icon: Database,
    title: "Data Layer",
    text: "Ingestão e normalização de dados agro vindos de ERPs, associações e provedores parceiros.",
  },
  {
    icon: Blocks,
    title: "Traceability Layer",
    text: "DFIDs, circuitos, eventos tipados e histórico verificável para cada item rastreável.",
  },
  {
    icon: Wallet,
    title: "Liquidity Layer",
    text: "Provas auditáveis ancoradas em Stellar para habilitar crédito, seguro e serviços financeiros.",
  },
];

const tranches = [
  {
    title: "Tranche 1 (MVP)",
    budget: "$24k",
    goal: "CLI/SDK + operações núcleo + 2 integrações parceiras",
    href: "/stellar/tranche1",
  },
  {
    title: "Tranche 2 (Testnet)",
    budget: "$36k",
    goal: "Selective disclosure, receipts e governança Soroban em testnet",
    href: "/stellar/tranche1",
  },
  {
    title: "Tranche 3 (Mainnet)",
    budget: "$30k",
    goal: "Go-live em mainnet, miniapp framework e parceiros institucionais",
    href: "/stellar/tranche1",
  },
];

const StellarOverview = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="pt-28 pb-14 bg-gradient-to-b from-emerald-50 to-background">
          <div className="section-container">
            <div className="max-w-5xl mx-auto">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <Badge className="bg-emerald-600 text-white">Stellar Community Fund #40</Badge>
                <Badge variant="outline">Awarded</Badge>
                <Badge variant="outline">US$ 90k</Badge>
              </div>

              <div className="grid lg:grid-cols-[1.6fr_1fr] gap-8 items-start">
                <div>
                  <h1 className="text-4xl sm:text-5xl font-black text-foreground leading-tight">
                    DeFarm: de dados agro confiáveis para ativos digitais com liquidez
                  </h1>
                  <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                    A DeFarm transforma rastreabilidade em infraestrutura financeira: cada item (animal, lote, propriedade,
                    ativo agro) ganha identidade verificável, histórico de eventos e provas auditáveis ancoradas na Stellar.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Button asChild className="btn-offset">
                      <Link to="/stellar/tranche1">Ver plano completo da Tranche 1 <ArrowRight className="h-4 w-4" /></Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link to="/app/parceiro">Ir para Portal Parceiro</Link>
                    </Button>
                  </div>
                </div>
                <Card className="border-emerald-200 bg-white/90">
                  <CardHeader>
                    <CardTitle className="text-xl">Grant Snapshot</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="flex items-center gap-3">
                      <img src={stellarLogo} alt="Stellar" className="h-6 w-auto" />
                      <span className="font-medium">Ecossistema Stellar + Soroban</span>
                    </div>
                    <div className="rounded-lg border bg-muted/40 p-3">
                      <p className="font-semibold">Meta de tração</p>
                      <p className="text-muted-foreground">20+ produtores, 3 associações, 200k animais registrados.</p>
                    </div>
                    <div className="rounded-lg border bg-muted/40 p-3">
                      <p className="font-semibold">Meta operacional</p>
                      <p className="text-muted-foreground">100% dos tokens ancorados na Stellar com histórico auditável.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14">
          <div className="section-container">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold mb-8">Arquitetura em 3 camadas</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {pillars.map((pillar) => (
                  <Card key={pillar.title} className="h-full">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
                        <pillar.icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-xl">{pillar.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{pillar.text}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 bg-muted/40 border-y">
          <div className="section-container">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold mb-8">Roadmap do grant (3 tranches)</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {tranches.map((tranche) => (
                  <Card key={tranche.title} className="h-full">
                    <CardHeader>
                      <CardTitle className="text-xl">{tranche.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">{tranche.goal}</p>
                      <p className="font-semibold">Budget: {tranche.budget}</p>
                      <Button asChild variant="outline" size="sm">
                        <Link to={tranche.href}>Detalhar entregas</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-14">
          <div className="section-container">
            <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-600" /> Por que isso importa</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-muted-foreground">
                  <p>Crédito e seguro rural exigem prova confiável de histórico. A DeFarm reduz custo de diligência e acelera decisão.</p>
                  <p>Com identidade verificável por item e eventos auditáveis, o risco informacional cai para toda a cadeia.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2"><FileClock className="h-5 w-5 text-emerald-600" /> Roteiro da apresentação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600" /> 1. Problema: dados fragmentados e pouca confiabilidade.</p>
                  <p className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600" /> 2. Solução: DFID + circuitos + eventos + receipts.</p>
                  <p className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600" /> 3. Stellar: ancoragem auditável e programável para finanças.</p>
                  <p className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600" /> 4. Tranche 1: mostrar CLI/SDK e onboarding de parceiros.</p>
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
