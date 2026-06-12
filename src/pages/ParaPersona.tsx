import { useParams, Link, Navigate } from "react-router-dom";
import { Tag, BadgeCheck, Award, Truck, Check, ArrowRight } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";

// Portas de convite (#107): uma landing pública por persona, com a linguagem de
// valor do paper. CTA único leva ao contato (captura de interesse — o onboarding
// provisiona o tipo certo). É o link que o Gabriel manda pro contato da CIDASC,
// Pantanal, Astra etc.
type PersonaKey =
  | "rastreadores"
  | "certificadoras"
  | "frigorificos"
  | "oesas";

interface PersonaContent {
  icon: typeof Tag;
  eyebrow: string;
  headline: string;
  subtitle: string;
  bullets: string[];
  cta: string;
}

const PERSONAS: Record<PersonaKey, PersonaContent> = {
  rastreadores: {
    icon: Tag,
    eyebrow: "Para rastreadoras SISBOV",
    headline: "O brinco SISBOV, agora tokenizado.",
    subtitle:
      "Cada número de brinco vira um identificador permanente on-chain (DFID), com QR público auditável. Um produto novo, sem dor adicional de campo — a numeração SISBOV de 15 dígitos já é a chave.",
    bullets: [
      "Emita brincos em lote: cole os números SISBOV e cada um vira um DFID com QR pronto pra imprimir e aplicar.",
      "Identidade única e permanente, ancorada on-chain — verificável por qualquer comprador.",
      "Seja a primeira certificadora SISBOV do Brasil a emitir um token por brinco.",
    ],
    cta: "Quero tokenizar meus brincos",
  },
  certificadoras: {
    icon: BadgeCheck,
    eyebrow: "Para certificadoras",
    headline: "Do PDF assinado ao atestado verificável.",
    subtitle:
      "Emita o seu certificado (raça, orgânico, ambiental, halal, EUDR) on-chain, com QR público auditável. Digitalização sem custo de software interno e prova exportável pro mercado externo.",
    bullets: [
      "Ateste um animal pelo DFID: o atestado fica gravado e público, com o seu nome como emissora.",
      "O importador escaneia o QR e vê a validação na hora — falsificação fica criptograficamente impossível.",
      "Funciona pra qualquer protocolo: a granularidade do seu certificado vive no conteúdo, não em sistemas separados.",
    ],
    cta: "Quero emitir atestados on-chain",
  },
  frigorificos: {
    icon: Award,
    eyebrow: "Para frigoríficos",
    headline: "Crie o seu selo e veja quem já passa o filtro.",
    subtitle:
      "Defina o seu selo de bonificação, conceda ao lote e tenha a prova on-chain — ferramenta de prospecção de fornecedor e de venda pro importador.",
    bullets: [
      "Conceda o seu selo a um animal pelo DFID: vira prova pública com o seu nome.",
      "Vire o pagador do prêmio e puxe a rede de fornecedores pro seu padrão.",
      "Sem montar infraestrutura de blockchain, geoespacial ou auditoria — a DeFarm é a camada.",
    ],
    cta: "Quero criar o meu selo",
  },
  oesas: {
    icon: Truck,
    eyebrow: "Para OESAs",
    headline: "A GTA que você emite, com prova pública.",
    subtitle:
      "A DeFarm não substitui a GTA — lê a movimentação e devolve valor: carimbo público auditável por GTA, histórico DFID linkado e alertas de inconsistência. A soberania da OESA é preservada.",
    bullets: [
      "Carimbe a movimentação pelo número da GTA: vira prova pública, com a sua palavra como órgão sanitário (o maior nível de confiança da rede).",
      "Receba alertas de integridade — GTA clonada entre animais, mesmo animal em dois lugares.",
      "Ferramenta extra de fiscalização, sem ônus operacional.",
    ],
    cta: "Quero o painel da minha OESA",
  },
};

export default function ParaPersona() {
  const { persona } = useParams<{ persona: string }>();
  const content = persona ? PERSONAS[persona as PersonaKey] : undefined;

  if (!content) {
    return <Navigate to="/" replace />;
  }

  const Icon = content.icon;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="pt-32 pb-16">
          <div className="section-container">
            <div className="max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 text-sm font-medium text-primary mb-4">
                <Icon className="h-4 w-4" />
                {content.eyebrow}
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-5">
                {content.headline}
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                {content.subtitle}
              </p>

              <ul className="space-y-3 mb-10">
                {content.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Check className="h-3 w-3 text-primary" />
                    </span>
                    <span className="text-foreground">{b}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link to={`/contato?perfil=${persona}`}>
                    {content.cta} <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/sobre">Como funciona</Link>
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mt-6">
                Você entra, traz os seus dados e, em conjunto, a rede vira a
                superfície obrigatória de passagem do dado bovino brasileiro.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
