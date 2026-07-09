import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  ArrowRight,
  MapPin,
  Boxes,
  Anchor,
  Maximize2,
  Minimize2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Demonstração institucional pública do CIR (Circuito Independente de
// Rastreabilidade), operado tecnicamente pela DeFarm. Rota: /demo/:code
//
// TODO(dados): tudo aqui é SINTÉTICO e anonimizado (LGPD) — sem CPF, sem nome de
// produtor, sem coordenada exata. Municípios/agregados apenas. O objetivo é passar
// "isto é um sistema em operação", não expor dado real. É self-contained (nenhuma
// chamada de API), então funciona offline e não quebra numa rede instável.
// ---------------------------------------------------------------------------

type SignedBy = { issuer: string; verified: boolean };

type DemoEvent = {
  date: string;
  type: string;
  typeLabel: string;
  dfid: string;
  animal: string; // anonimizado (últimos dígitos do SISBOV sintético)
  signedBy: SignedBy;
};

type DemoCert = {
  dfid: string;
  sisbov: string; // sintético
  mapCode: string; // código MAP (id institucional-público do estabelecimento)
  valueChain: string;
  status: string;
  municipality: string;
  weightKg: number;
  anchoredTx: string;
  events: DemoEvent[];
};

const KPIS = [
  { label: "DFIDs ancorados", value: "1.284", icon: Boxes },
  { label: "Ancoragens Stellar (mainnet)", value: "1.284", icon: Anchor },
  { label: "Eventos registrados", value: "6.907", icon: CheckCircle2 },
  { label: "Propriedades (MS)", value: "38", icon: MapPin },
];

const LAYERS = [
  {
    n: "1",
    title: "ERP privado",
    who: "Gerbov, Consiste TI",
    what: "Origem do dado: identidade do animal, pesagens, movimentações, geolocalização da leitura.",
  },
  {
    n: "2",
    title: "DeFarm",
    who: "Camada de rastreabilidade",
    what: "Gera a identidade canônica (DFID), ancora na rede pública (Stellar mainnet) e compõe o certificado — cada contribuição assinada pelo seu autor.",
  },
  {
    n: "3",
    title: "Certificado público",
    who: "Auditável por qualquer um",
    what: "Verificação pública sem login: prova on-chain + status validado pela IAGRO (OESA), sem expor dado pessoal.",
  },
];

const RECENT_EVENTS: DemoEvent[] = [
  { date: "2026-07-15", type: "item_weighed", typeLabel: "Pesagem", dfid: "DFID-BEEF-BR-2026-004050", animal: "•••983", signedBy: { issuer: "Gerbov", verified: true } },
  { date: "2026-07-15", type: "item_movement", typeLabel: "Movimentação", dfid: "DFID-BEEF-BR-2026-004050", animal: "•••983", signedBy: { issuer: "Gerbov", verified: true } },
  { date: "2026-07-14", type: "sanitary_status", typeLabel: "Status sanitário", dfid: "DFID-BEEF-BR-2026-004050", animal: "•••983", signedBy: { issuer: "IAGRO", verified: true } },
  { date: "2026-07-12", type: "item_vaccinated", typeLabel: "Vacinação", dfid: "DFID-BEEF-BR-2026-003911", animal: "•••217", signedBy: { issuer: "Gerbov", verified: true } },
  { date: "2026-07-10", type: "item_born", typeLabel: "Nascimento", dfid: "DFID-BEEF-BR-2026-003911", animal: "•••217", signedBy: { issuer: "Gerbov", verified: true } },
];

const CERTS: DemoCert[] = [
  {
    dfid: "DFID-BEEF-BR-2026-004050",
    sisbov: "105500497219983",
    mapCode: "5100250-0001",
    valueChain: "BEEF",
    status: "Ativo",
    municipality: "Campo Grande / MS",
    weightKg: 492,
    anchoredTx: "a3f2…9c1b",
    events: RECENT_EVENTS.filter((e) => e.dfid === "DFID-BEEF-BR-2026-004050"),
  },
  {
    dfid: "DFID-BEEF-BR-2026-003911",
    sisbov: "105500497210217",
    mapCode: "5100250-0002",
    valueChain: "BEEF",
    status: "Ativo",
    municipality: "Dourados / MS",
    weightKg: 388,
    anchoredTx: "77c4…e0d9",
    events: RECENT_EVENTS.filter((e) => e.dfid === "DFID-BEEF-BR-2026-003911"),
  },
];

const PROPERTIES = [
  { municipality: "Campo Grande / MS", animals: 412 },
  { municipality: "Dourados / MS", animals: 305 },
  { municipality: "Três Lagoas / MS", animals: 288 },
  { municipality: "Corumbá / MS", animals: 279 },
];

function SignedBadge({ signedBy }: { signedBy: SignedBy }) {
  return (
    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
      <ShieldCheck className="h-4 w-4" />
      assinado por {signedBy.issuer} ✓
    </span>
  );
}

export default function DemoDashboard() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<DemoCert | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [presentation, setPresentation] = useState(false);

  const runSearch = (raw: string) => {
    const q = raw.trim().toLowerCase();
    if (!q) {
      setResult(null);
      setNotFound(false);
      return;
    }
    const hit = CERTS.find(
      (c) =>
        c.dfid.toLowerCase().includes(q) ||
        c.sisbov.includes(q) ||
        c.mapCode.toLowerCase().includes(q)
    );
    setResult(hit ?? null);
    setNotFound(!hit);
  };

  const containerClass = useMemo(
    () => (presentation ? "max-w-5xl mx-auto px-4 py-10 text-[1.08rem]" : "max-w-6xl mx-auto px-4 py-8"),
    [presentation]
  );

  return (
    <div className="min-h-screen bg-background">
      <div className={containerClass}>
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <h1 className={presentation ? "text-4xl font-bold" : "text-2xl sm:text-3xl font-bold"}>
                Circuito Independente de Rastreabilidade
              </h1>
            </div>
            <p className="text-muted-foreground mt-2">
              Rastreabilidade individual bovina, ancorada em rede pública e validada pela OESA —
              operado tecnicamente pela DeFarm.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setPresentation((p) => !p)}>
            {presentation ? <Minimize2 className="h-4 w-4 mr-2" /> : <Maximize2 className="h-4 w-4 mr-2" />}
            {presentation ? "Sair do modo apresentação" : "Modo apresentação"}
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {KPIS.map((kpi) => (
            <Card key={kpi.label} className="border-border/70">
              <CardContent className="pt-6">
                <kpi.icon className="h-5 w-5 text-primary mb-2" />
                <div className={presentation ? "text-4xl font-bold" : "text-3xl font-bold"}>{kpi.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{kpi.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Arquitetura em 3 camadas */}
        <Card className="mb-8 border-border/70">
          <CardHeader>
            <CardTitle className="text-lg">Como funciona — três camadas</CardTitle>
            <CardDescription>ERP → DeFarm → certificado público, com a IAGRO como validadora institucional.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
              {LAYERS.map((layer, i) => (
                <div key={layer.n} className="relative">
                  <div className="rounded-lg border border-border/70 p-4 h-full bg-muted/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary">Camada {layer.n}</Badge>
                      <span className="font-semibold">{layer.title}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">{layer.who}</div>
                    <p className="text-sm text-muted-foreground">{layer.what}</p>
                  </div>
                  {i < LAYERS.length - 1 && (
                    <ArrowRight className="hidden md:block absolute top-1/2 -right-3 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Busca */}
        <Card className="mb-8 border-border/70">
          <CardHeader>
            <CardTitle className="text-lg">Verificar um animal</CardTitle>
            <CardDescription>Busque por DFID, SISBOV ou código MAP. Verificação pública, sem login.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runSearch(query)}
                  placeholder="DFID-BEEF-BR-2026-004050  ·  105500497219983  ·  5100250-0001"
                  className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <Button onClick={() => runSearch(query)}>Verificar</Button>
            </div>

            {notFound && (
              <p className="text-sm text-muted-foreground">
                Nada encontrado. Experimente <button className="underline" onClick={() => { setQuery(CERTS[0].dfid); runSearch(CERTS[0].dfid); }}>{CERTS[0].dfid}</button>.
              </p>
            )}

            {result && (
              <div className="rounded-lg border border-border/70 p-4 bg-muted/20">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="font-mono text-sm font-semibold">{result.dfid}</div>
                  <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-600/40">
                    <Anchor className="h-3 w-3 mr-1" /> ancorado na Stellar · tx {result.anchoredTx}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
                  <div><div className="text-muted-foreground text-xs">SISBOV</div><div className="font-mono">{result.sisbov}</div></div>
                  <div><div className="text-muted-foreground text-xs">Código MAP</div><div className="font-mono">{result.mapCode}</div></div>
                  <div><div className="text-muted-foreground text-xs">Município</div><div>{result.municipality}</div></div>
                  <div><div className="text-muted-foreground text-xs">Peso</div><div>{result.weightKg} kg</div></div>
                </div>
                <div className="space-y-1.5">
                  {result.events.map((e, idx) => (
                    <div key={idx} className="flex flex-wrap items-center justify-between gap-2 text-sm border-t border-border/50 pt-1.5">
                      <span><span className="text-muted-foreground">{e.date}</span> · {e.typeLabel}</span>
                      <SignedBadge signedBy={e.signedBy} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Eventos recentes + Propriedades */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <Card className="lg:col-span-2 border-border/70">
            <CardHeader>
              <CardTitle className="text-lg">Eventos recentes</CardTitle>
              <CardDescription>Cada registro assinado pelo contribuinte, verificável por qualquer um.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {RECENT_EVENTS.map((e, idx) => (
                  <div key={idx} className="flex flex-wrap items-center justify-between gap-2 text-sm border-b border-border/50 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-24">{e.date}</span>
                      <Badge variant="secondary">{e.typeLabel}</Badge>
                      <span className="font-mono text-xs text-muted-foreground">{e.dfid} · {e.animal}</span>
                    </div>
                    <SignedBadge signedBy={e.signedBy} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-lg">Propriedades</CardTitle>
              <CardDescription>Agregado por município (sem coordenada exata).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {PROPERTIES.map((p) => (
                  <div key={p.municipality} className="flex items-center justify-between text-sm border-b border-border/50 pb-2">
                    <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{p.municipality}</span>
                    <span className="font-semibold">{p.animals}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground text-center">
          Demonstração · dados sintéticos e anonimizados (LGPD) · nenhum dado pessoal exibido.
        </p>
      </div>
    </div>
  );
}
