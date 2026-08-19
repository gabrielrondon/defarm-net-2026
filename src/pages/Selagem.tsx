import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, ExternalLink, Lock } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

// Página de FEATURE, fora do site principal (net#203 follow-up): link aberto para
// demonstrar pontualmente, mas NÃO indexada — meta robots aqui, `Disallow: /selagem`
// no robots.txt, e nenhum link na home/nav. Ver o PR para o racional.
const DFID = "DFID-DEFARM-BR-2026-009447-552749";
const COMMITMENT = "1eeeb48ebbfa4c4f2aeb3c0c72381cfc06ef3fdfdbe1306f503cf518aea27acf";
const VERIFY_URL = `/v/${DFID}`;
const REPO_URL = "https://github.com/defarm-repo/defarm-verify";

/** Marca a rota como não-indexável enquanto ela estiver montada. */
function useNoIndex() {
  useEffect(() => {
    const tag = document.createElement("meta");
    tag.name = "robots";
    tag.content = "noindex,nofollow";
    document.head.appendChild(tag);
    const prevTitle = document.title;
    document.title = "Vitrine Selada · DeFarm";
    return () => {
      tag.remove();
      document.title = prevTitle;
    };
  }, []);
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{children}</p>
  );
}

function Section({
  eyebrow,
  title,
  lead,
  children,
  className = "",
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border-t border-border py-16 sm:py-20 ${className}`}>
      <div className="mx-auto max-w-3xl px-6">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="mt-2.5 text-balance text-2xl font-semibold leading-tight text-foreground sm:text-[28px]">
          {title}
        </h2>
        {lead && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{lead}</p>}
        {children}
      </div>
    </section>
  );
}

const PROVAS = [
  {
    tag: "A",
    title: "O mundo vê a prova, não o valor",
    body: "Na página pública, o campo aparece com seu compromisso criptográfico e sua autoria assinada — e a assinatura foi re-verificada por fora, sem confiar em nenhum “sim” do servidor. O valor não aparece em lugar nenhum.",
  },
  {
    tag: "B",
    title: "A DeFarm é cega",
    body: "Varredura do valor em todas as superfícies — página pública, dados brutos e o banco de produção direto. Zero ocorrências. A leitura como administrador da própria DeFarm foi barrada. O conteúdo simplesmente não existe do lado da plataforma.",
  },
  {
    tag: "C",
    title: "O destinatário lê",
    body: "Só o comprador — o frigorífico destinatário — abriu o envelope com a sua chave privada e recuperou o valor real. O compromisso fechou: qualquer adulteração teria falhado a abertura.",
  },
  {
    tag: "D",
    title: "Mais ninguém",
    body: "Nem o próprio produtor que selou consegue reabrir — não há envelope endereçado a ele. Uma chave errada falha. A caixa de qualquer terceiro está vazia.",
  },
];

const RECIBO: Array<[string, React.ReactNode]> = [
  ["identificador", <span className="font-mono text-[12.5px] break-all">{DFID}</span>],
  [
    "campo",
    <span>
      <span className="font-mono text-[12.5px]">preco_venda</span>
      <span className="text-muted-foreground"> · selado</span>
    </span>,
  ],
  [
    "selado por",
    <span>
      Fazenda São Marcos
      <span className="text-[hsl(var(--primary-deep))]"> · autoria verificada ✓</span>
    </span>,
  ],
  ["algoritmo", <span className="font-mono text-[12.5px]">hmac-sha256 / hkdf-sha256</span>],
  ["compromisso", <span className="font-mono text-[11.5px] break-all leading-relaxed">{COMMITMENT}</span>],
  ["chave do selador", <span className="font-mono text-[12.5px]">VITRINE-SIGN-FAZENDA · Ed25519</span>],
  ["valor", <span className="text-muted-foreground">privado — legível apenas pelo destinatário</span>],
];

const PASSOS = [
  {
    n: "01",
    title: "A âncora on-chain, direto da fonte.",
    body: "O par identificador–conteúdo é lido da transação pública no Horizon da rede — sem passar pela DeFarm.",
  },
  {
    n: "02",
    title: "O snapshot, por IPFS.",
    body: "O conteúdo é resolvido pelo seu CID em gateways IPFS públicos independentes, e os bytes têm de bater — em todos.",
  },
  {
    n: "03",
    title: "Cada evento, recalculado do zero.",
    body: "O hash de integridade de cada registro é recomputado localmente e comparado com o publicado.",
  },
  {
    n: "04",
    title: "O selo, com criptografia padrão.",
    body: "O compromisso e a autoria usam algoritmos abertos (HMAC-SHA256 / HKDF, assinatura Ed25519) — reproduzíveis por qualquer ferramenta, sem nada proprietário.",
  },
];

const PILARES = [
  ["Rastreabilidade pública", "O animal é verificável por qualquer um, on-chain, na cadeia aberta."],
  ["Sigilo do titular", "O dado comercial é cifrado na origem, endereçado a um único destinatário."],
  ["Plataforma neutra", "A DeFarm move o envelope sem poder abri-lo. Cegueira estrutural, provada."],
];

export default function Selagem() {
  useNoIndex();
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* HERO — o paradoxo é o produto */}
      <section className="border-b border-border bg-muted/30 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" />
            O primeiro selo real · em produção
          </div>
          <h1 className="mt-5 text-balance text-[34px] font-semibold leading-[1.08] tracking-tight text-foreground sm:text-[46px]">
            Provado por qualquer um.
            <br />
            <span className="text-muted-foreground">Legível por ninguém.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-muted-foreground">
            Um boi rastreado na cadeia pública da DeFarm carrega um dado comercial selado. Qualquer pessoa confirma
            que ele existe, quem o registrou e que não foi alterado — sem nunca ver o valor. Nem a própria DeFarm
            consegue lê-lo.
          </p>

          <div className="mt-9 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                selado · preco_venda
              </div>
              <div className="mt-4 flex items-baseline gap-2 font-mono text-[30px] leading-none text-foreground">
                <span>R$</span>
                <span className="tracking-[0.28em] text-muted-foreground">•••••</span>
              </div>
              <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
                Cifrado no dispositivo do produtor. Só o comprador destinatário decifra — o servidor guarda apenas o
                envelope.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--primary-deep))]">
                <Check className="h-3.5 w-3.5" />
                verificado · a mesma linha
              </div>
              <div className="mt-4 text-[20px] font-semibold leading-tight text-foreground">
                Existe · Autêntico · Íntegro
              </div>
              <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
                Ancorado on-chain, autoria assinada (Ed25519) e compromisso criptográfico que prova que o valor não
                mudou.
              </p>
            </div>
          </div>

          <p className="mt-6 text-[14px] leading-relaxed text-foreground/80">
            O paradoxo é o produto: a mesma informação está, ao mesmo tempo, oculta para o mundo e comprovável pelo
            mundo.
          </p>
        </div>
      </section>

      {/* AS 4 PROVAS */}
      <Section
        eyebrow="O que foi provado"
        title="Quatro provas, verificadas de fora"
        lead="Não é alegação nossa: cada uma foi medida de forma independente, inclusive contra o banco de dados de produção."
      >
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {PROVAS.map((p) => (
            <div key={p.tag} className="rounded-2xl border border-border bg-card p-6">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted font-mono text-[13px] font-semibold text-foreground">
                {p.tag}
              </div>
              <h3 className="mt-4 text-[16px] font-semibold text-foreground">{p.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* O ARTEFATO REAL — herói da página: aberto e estilizado */}
      <Section
        eyebrow="O artefato real"
        title="O que está gravado on-chain"
        lead="Estes são os dados públicos do selo — abertos por desenho. Tudo verificável; nada revela o preço."
      >
        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-6 py-3">
            <span className="flex items-center gap-2 text-[12px] font-semibold text-foreground">
              <Lock className="h-3.5 w-3.5" />
              Campo selado · registro público
            </span>
            <span className="text-[12px] text-[hsl(var(--primary-deep))]">✓ íntegro</span>
          </div>
          <dl className="divide-y divide-border">
            {RECIBO.map(([k, v]) => (
              <div key={k} className="grid gap-1 px-6 py-3.5 sm:grid-cols-[9.5rem_1fr] sm:gap-4">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{k}</dt>
                <dd className="text-[14px] text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      {/* NÃO CONFIE — VERIFIQUE */}
      <Section
        eyebrow="Não confie — verifique"
        title="Um auditor não precisa de nós para conferir"
        lead="A verificação não depende desta página nem do servidor da DeFarm. As ferramentas são públicas e abertas — qualquer um refaz a conta na própria máquina."
      >
        <ol className="mt-8 space-y-4">
          {PASSOS.map((s) => (
            <li key={s.n} className="flex gap-4 rounded-xl border border-border bg-card px-5 py-4">
              <span className="font-mono text-[13px] font-semibold text-muted-foreground">{s.n}</span>
              <div>
                <p className="text-[14.5px] font-medium text-foreground">{s.title}</p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:border-[hsl(var(--primary))]"
        >
          <span>
            <span className="font-mono text-[13.5px] font-medium text-foreground">
              github.com/defarm-repo/defarm-verify
            </span>
            <span className="mt-1 block text-[12.5px] text-muted-foreground">
              Verificador público · código aberto (MIT) · roda na sua máquina
            </span>
          </span>
          <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
        </a>
        <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
          O repositório também declara os próprios limites — o que prova e o que ainda não prova. Um verificador
          honesto mostra as arestas.
        </p>
      </Section>

      {/* POR QUE IMPORTA */}
      <Section
        eyebrow="Por que isto importa"
        title="A confiança deixa de exigir exposição"
        lead="Rastreabilidade sempre pediu uma troca dolorosa: para provar, era preciso abrir. O produtor mostrava preço, margem e relação comercial para quem não precisava ver. Aqui, não."
      >
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {PILARES.map(([t, d]) => (
            <div key={t} className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-[14px] font-semibold text-foreground">{t}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* VERIFIQUE VOCÊ MESMO */}
      <section className="border-t border-border py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <Eyebrow>Verifique você mesmo</Eyebrow>
          <Link
            to={VERIFY_URL}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-6 py-3 text-[15px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Abrir a verificação pública
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-4 break-all font-mono text-[12px] text-muted-foreground">defarm.net{VERIFY_URL}</p>
        </div>
      </section>

      {/* RODAPÉ HONESTO */}
      <section className="border-t border-border bg-muted/30 py-8">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            Vitrine de demonstração: os atores (Fazenda São Marcos, Frigorífico Vale Verde) e os dados do animal são
            ilustrativos. O selo criptográfico, a ancoragem on-chain e as quatro provas são reais e em produção.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
