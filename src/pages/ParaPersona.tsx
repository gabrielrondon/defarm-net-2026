import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { AnchorStatus } from "@/components/proof";

// Lote D — /para/:persona no estilo "Ledger".
// COPY mantida do objeto PERSONAS aprovado (#107). Mudou só o VISUAL:
//  - eyebrow = código de registro mono (RST/CRT/…) + régua, não ícone-em-chip
//  - H1 com palavra-chave em text-primary flat (sem caixa verde)
//  - bullets com marcador quadrado fino (não check verde gordo)
//  - card lateral "Prova que você emite" = o artefato real da persona num DFID
// EN: personas ainda não são i18n em prod; quando forem, extrair `copy` p/ chaves.

type PersonaKey = "rastreadores" | "certificadoras" | "frigorificos" | "oesas" | "produtores";

interface Persona {
  code: string;
  eyebrow: string;
  /** [antes, palavra-em-primary, depois] */
  headline: [string, string, string];
  subtitle: string;
  bullets: string[];
  cta: string;
  ctaTo?: string; // default /contato?perfil=<persona>
  /** artefato que a persona emite, carimbado no DFID de exemplo */
  proof: { tag: string; event: string; meta: string; stacked?: boolean };
}

const PERSONAS: Record<PersonaKey, Persona> = {
  rastreadores: {
    code: "RST",
    eyebrow: "Para rastreadoras SISBOV",
    headline: ["O ", "brinco SISBOV", ", agora tokenizado."],
    subtitle:
      "Cada número de brinco vira um identificador permanente on-chain (DFID), com QR público auditável. Um produto novo, sem dor adicional de campo — a numeração SISBOV de 15 dígitos já é a chave.",
    bullets: [
      "Emita brincos em lote: cole os números SISBOV e cada um vira um DFID com QR pronto pra imprimir e aplicar.",
      "Identidade única e permanente, ancorada on-chain — verificável por qualquer comprador.",
      "Seja a primeira certificadora SISBOV do Brasil a emitir um token por brinco.",
    ],
    cta: "Quero tokenizar meus brincos",
    proof: { tag: "BRINCO → DFID", event: "Brinco emitido", meta: "SISBOV 076000000099004" },
  },
  certificadoras: {
    code: "CRT",
    eyebrow: "Para certificadoras",
    headline: ["Do PDF assinado ao ", "atestado verificável", "."],
    subtitle:
      "Emita o seu certificado (raça, orgânico, ambiental, halal, EUDR) on-chain, com QR público auditável. Digitalização sem custo de software interno e prova exportável pro mercado externo.",
    bullets: [
      "Ateste um animal pelo DFID: o atestado fica gravado e público, com o seu nome como emissora.",
      "O importador escaneia o QR e vê a validação na hora — falsificação fica criptograficamente impossível.",
      "Funciona pra qualquer protocolo: a granularidade do seu certificado vive no conteúdo, não em sistemas separados.",
    ],
    cta: "Quero emitir atestados on-chain",
    proof: { tag: "ATESTADO", event: "Atestado · Orgânico BR", meta: "protocolo ORG-2026-118" },
  },
  frigorificos: {
    code: "FRG",
    eyebrow: "Para frigoríficos",
    headline: ["Crie o seu selo e veja quem já ", "passa o filtro", "."],
    subtitle:
      "Defina o seu selo de bonificação, conceda ao lote e tenha a prova on-chain — ferramenta de prospecção de fornecedor e de venda pro importador.",
    bullets: [
      "Conceda o seu selo a um animal pelo DFID: vira prova pública com o seu nome.",
      "Vire o pagador do prêmio e puxe a rede de fornecedores pro seu padrão.",
      "Sem montar infraestrutura de blockchain, geoespacial ou auditoria — a DeFarm é a camada.",
    ],
    cta: "Quero criar o meu selo",
    proof: { tag: "SELO", event: "Selo · Bonificação A", meta: "lote A-118 · 42 cabeças" },
  },
  oesas: {
    code: "OSA",
    eyebrow: "Para OESAs",
    headline: ["A GTA que você emite, com ", "prova pública", "."],
    subtitle:
      "A DeFarm não substitui a GTA — lê a movimentação e devolve valor: carimbo público auditável por GTA, histórico DFID linkado e alertas de inconsistência. A soberania da OESA é preservada.",
    bullets: [
      "Carimbe a movimentação pelo número da GTA: vira prova pública, com a sua palavra como órgão sanitário.",
      "Receba alertas de integridade — GTA clonada entre animais, mesmo animal em dois lugares.",
      "Ferramenta extra de fiscalização, sem ônus operacional.",
    ],
    cta: "Quero o painel da minha OESA",
    proof: { tag: "CARIMBO GTA", event: "GTA carimbada", meta: "GTA 0552-MS · destino interno" },
  },
  produtores: {
    code: "PRD",
    eyebrow: "Para produtores",
    headline: ["Seu rebanho, com identidade que ", "vale prêmio", "."],
    subtitle:
      "Cada animal ganha um identificador permanente (DFID). Rastreador, certificadora, frigorífico e OESA constroem prova em cima dele — e a prova é o que abre o mercado premium (EUDR, China, selos).",
    bullets: [
      "Veja seus animais com a identidade tokenizada e o histórico que os compradores confiam.",
      "Cada selo, atestado e movimentação se acumula no DFID do seu animal — a sua carta de acesso ao prêmio.",
      "Comece grátis: registre o seu rebanho e veja a prova crescer.",
    ],
    cta: "Quero tokenizar meu rebanho",
    ctaTo: "/cadastro",
    proof: { tag: "REBANHO", event: "4 provas acumuladas", meta: "DFID-BEEF-BR-2026-001106", stacked: true },
  },
};

function PersonaProof({ p }: { p: Persona }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)]">
      <div className="mb-4 flex items-center justify-between border-b border-dashed border-border pb-4">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Prova que você emite
        </span>
        <span className="grid h-7 place-items-center rounded-md border border-border px-2 font-mono text-[11px] font-semibold tracking-[0.08em] text-primary">
          {p.code}
        </span>
      </div>
      <div className="mb-1 break-all font-mono text-[14px] font-medium tracking-tight">
        DFID-BEEF-BR-2026-001106-b0e4d7
      </div>
      <div className="mb-4 font-mono text-[11px] text-muted-foreground">{p.proof.tag}</div>

      {p.proof.stacked ? (
        <div className="mb-4 space-y-2.5">
          {[["RST", "Brinco emitido"], ["OSA", "GTA carimbada"], ["FRG", "Selo · Bonificação A"], ["CRT", "Atestado"]].map(
            ([c, lbl]) => (
              <div key={c} className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 shrink-0 rounded-[2px] bg-primary" />
                <span className="flex-1 text-[13px]">{lbl}</span>
                <span className="font-mono text-[10.5px] text-muted-foreground">{c}</span>
              </div>
            ),
          )}
        </div>
      ) : (
        <div className="mb-4 rounded-xl bg-primary/[0.06] p-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-[5px] h-2 w-2 shrink-0 rounded-[2px] bg-primary" />
            <div className="min-w-0">
              <div className="text-[13.5px] font-semibold" style={{ color: "hsl(var(--primary-deep))" }}>
                {p.proof.event}
              </div>
              <div className="mt-0.5 break-all font-mono text-[11px] text-muted-foreground">{p.proof.meta}</div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-muted p-3">
        <AnchorStatus status="confirmed" compact />
        <div className="mt-1 font-mono text-[10.5px] text-muted-foreground">stellar · público · auditável</div>
      </div>
    </div>
  );
}

export default function ParaPersona() {
  const { persona } = useParams<{ persona: string }>();
  const p = persona ? PERSONAS[persona as PersonaKey] : undefined;
  if (!p) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 hidden lg:block"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)/0.04) 1px,transparent 1px),linear-gradient(90deg,hsl(var(--foreground)/0.04) 1px,transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage: "radial-gradient(circle at 80% 10%, black, transparent 60%)",
            WebkitMaskImage: "radial-gradient(circle at 80% 10%, black, transparent 60%)",
          }}
        />
        <div className="section-container relative py-16 sm:py-20">
          <div className="grid items-start gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="flex items-center gap-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-primary">
                <span className="grid h-5 place-items-center rounded border border-primary/40 px-1.5 text-[10px]">
                  {p.code}
                </span>
                <span className="h-px w-5 bg-primary/40" />
                {p.eyebrow}
              </div>
              <h1 className="mt-4 text-[34px] font-bold leading-[1.04] tracking-[-0.03em] sm:text-[46px]" style={{ textWrap: "balance" }}>
                {p.headline[0]}
                <span className="text-primary">{p.headline[1]}</span>
                {p.headline[2]}
              </h1>
              <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-muted-foreground" style={{ textWrap: "pretty" }}>
                {p.subtitle}
              </p>

              <ul className="mt-8 space-y-3.5">
                {p.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-3">
                    <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-[2px] bg-primary" />
                    <span className="text-[15px] leading-relaxed text-foreground/90">{b}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link to={p.ctaTo ?? `/contato?perfil=${persona}`}>
                    {p.cta} <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="lg">
                  <Link to="/sobre">Como funciona</Link>
                </Button>
              </div>

              <p className="mt-6 max-w-lg font-mono text-[11px] leading-relaxed text-muted-foreground">
                Você entra, traz os seus dados e, em conjunto, a rede vira a superfície obrigatória de passagem do dado
                bovino brasileiro.
              </p>
            </div>

            <div className="lg:pl-2 lg:pt-2">
              <PersonaProof p={p} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
