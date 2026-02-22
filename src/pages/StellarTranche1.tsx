import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, CheckCircle2, Code2, DatabaseZap, FileText, Rocket, TerminalSquare } from "lucide-react";

const steps = [
  {
    title: "Passo 1: Preparar workspace e autenticação",
    detail:
      "Crie/valide workspace do tipo partner, gere credenciais e confirme acesso ao gateway. Isso fecha identidade e autorização da integração.",
  },
  {
    title: "Passo 2: Definir canônico e mapeamento",
    detail:
      "Escolha o identificador canônico principal (SISBOV, chip, ear_tag etc), mapeie colunas e configure fallback para evitar duplicações de DFID.",
  },
  {
    title: "Passo 3: Ingerir via endpoint único",
    detail:
      "Envie dados para POST /api/items/bulk (mesmo endpoint usado no Portal Parceiro). Ative template salvo por parceiro para reduzir fricção.",
  },
  {
    title: "Passo 4: Enriquecer com eventos",
    detail:
      "Registre eventos tipados (item_movement, item_vaccinated, item_weighed...) para construir timeline operacional e trilha de auditoria.",
  },
  {
    title: "Passo 5: Validar circuito e visão pública",
    detail:
      "Confirme itens no circuito, visibilidade público/privado, URL compartilhável e coerência da página pública para demonstração.",
  },
  {
    title: "Passo 6: Evidências da tranche",
    detail:
      "Registre receipts, outputs de teste CLI/SDK, e logs de integração de dois parceiros para prestação da Tranche 1.",
  },
];

const checklist = [
  "auth: login/logout/whoami/refresh",
  "workspace: init/status/config/reset",
  "circuits: list/show/join/members",
  "items: new/list/show/update",
  "events: add/list/show/update",
  "SDK + docs + quickstart parceiro",
  "2 integrações externas com estratégia de privacidade",
];

const StellarTranche1 = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="pt-28 pb-14 bg-gradient-to-b from-slate-50 to-background">
          <div className="section-container">
            <div className="max-w-5xl mx-auto">
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <Badge className="bg-slate-800 text-white">Tranche 1 - MVP</Badge>
                <Badge variant="outline">Mês 3</Badge>
                <Badge variant="outline">Budget US$ 24k</Badge>
              </div>

              <h1 className="text-4xl sm:text-5xl font-black leading-tight">
                Guia minucioso de execução: CLI, SDK, playground e demo operacional
              </h1>
              <p className="mt-5 text-lg text-muted-foreground max-w-4xl">
                Esta página é seu roteiro para apresentar a DeFarm com profundidade técnica e clareza de negócio. Ela cobre o
                passo a passo completo da Tranche 1, incluindo comandos práticos e narrativa de demo para parceiros.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild className="btn-offset">
                  <a href="#playground">Ir para playground <ArrowRight className="h-4 w-4" /></a>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/stellar">Voltar visão geral Stellar</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14">
          <div className="section-container">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold mb-6">Escopo oficial da Tranche 1</h2>
              <Card>
                <CardContent className="pt-6 grid sm:grid-cols-2 gap-3 text-sm">
                  {checklist.map((item) => (
                    <p key={item} className="flex items-start gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600" />
                      <span>{item}</span>
                    </p>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-14 bg-muted/40 border-y">
          <div className="section-container">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold mb-8">Passo a passo de execução</h2>
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <Card key={step.title}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-xl">{index + 1}. {step.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{step.detail}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="playground" className="py-14">
          <div className="section-container">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold mb-8">Playground (pronto para demo)</h2>
              <div className="grid lg:grid-cols-3 gap-6 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2"><TerminalSquare className="h-5 w-5 text-emerald-600" /> CLI</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Autenticar, listar circuitos, criar item e adicionar evento em menos de 2 minutos.
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2"><Code2 className="h-5 w-5 text-emerald-600" /> SDK</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Integrar em sistemas parceiros com TypeScript e fluxo padrão de autenticação + ingestão.
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2"><DatabaseZap className="h-5 w-5 text-emerald-600" /> API Bulk</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Endpoint único de ingestão para portal parceiro e integração direta (`POST /api/items/bulk`).
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Comandos CLI essenciais</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="rounded-lg bg-slate-950 text-slate-50 p-4 text-xs sm:text-sm overflow-x-auto">
{`cd tooling/defarm-sdk && npm install && npm run build
cd ../defarm-cli && npm install && npm run build

node dist/index.js workspace init --gateway https://gateway.defarm.net
node dist/index.js auth login --email <email> --password <senha>
node dist/index.js circuits list
node dist/index.js items list --circuit <circuit_id>
node dist/index.js events list --circuit <circuit_id>`}
                    </pre>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Exemplo API Bulk (portal parceiro usa o mesmo endpoint)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="rounded-lg bg-slate-950 text-slate-50 p-4 text-xs sm:text-sm overflow-x-auto">
{`curl -X POST "https://gateway.defarm.net/api/items/bulk" \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "circuit_id": "<uuid>",
    "items": [
      {
        "value_chain": "BEEF",
        "country": "BR",
        "year": 2026,
        "identifiers": [{ "identifier_type": "sisbov", "identifier_value": "105500497219983" }],
        "metadata": { "source": "gerbov", "lote": "Bezerros serra" }
      }
    ]
  }'`}
                    </pre>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Exemplo SDK (TypeScript)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="rounded-lg bg-slate-950 text-slate-50 p-4 text-xs sm:text-sm overflow-x-auto">
{`import { DefarmSdk } from "@defarm/sdk";

const sdk = new DefarmSdk({ gatewayBaseUrl: "https://gateway.defarm.net" });
const auth = await sdk.auth.login(process.env.DEFARM_EMAIL!, process.env.DEFARM_PASSWORD!);
sdk.setAccessToken(auth.access_token);

const circuits = await sdk.circuits.list();
const circuit = circuits[0];

const item = await sdk.items.create({
  value_chain: "BEEF",
  country: "BR",
  year: 2026,
  circuit_id: circuit.id,
  metadata: { canonical_type: "sisbov", canonical_id: "105500497219983", source: "gerbov" },
});

await sdk.events.add({
  event_type: "item_vaccinated",
  source_type: "partner",
  source_id: "gerbov",
  circuit_id: circuit.id,
  item_id: item.id,
  payload: { vaccine: "aftosa" },
});`}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 bg-muted/40 border-y">
          <div className="section-container">
            <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2"><Rocket className="h-5 w-5 text-emerald-600" /> Script de demo (10 minutos)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>1. Mostrar circuito parceiro (CowPro/Gerbov) e itens já tokenizados.</p>
                  <p>2. Ingerir um novo item ao vivo e provar deduplicação por canônico.</p>
                  <p>3. Registrar evento tipado e abrir timeline do item.</p>
                  <p>4. Exibir página pública do circuito e link de compartilhamento.</p>
                  <p>5. Mostrar recibo/log da ingestão para auditoria.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2"><FileText className="h-5 w-5 text-emerald-600" /> Links de apoio</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Link className="block text-primary hover:underline" to="/app/parceiro">Portal Parceiro</Link>
                  <a className="block text-primary hover:underline" href="/openapi.yaml">OpenAPI (gateway)</a>
                  <Link className="block text-primary hover:underline" to="/stellar">Página principal do grant</Link>
                  <p className="text-muted-foreground">Doc técnico interno: <code>engines/docs/partner/quickstart-cli-sdk.md</code></p>
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
