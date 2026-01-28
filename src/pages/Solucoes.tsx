import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Scan, Shield, Coins, QrCode, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const solutions = [
  {
    icon: Scan,
    title: "Rastreabilidade de Gado",
    description: "Sistema completo de rastreamento individual de animais. Do nascimento ao abate, cada etapa é registrada de forma segura e imutável na blockchain.",
    features: [
      "Registro individual por animal",
      "Histórico completo de movimentações",
      "Dados de saúde e vacinação",
      "Integração com sistemas existentes",
    ],
  },
  {
    icon: Shield,
    title: "Compliance EUDR",
    description: "Atenda às exigências do Regulamento de Desmatamento da União Europeia de forma automática. Relatórios e documentação prontos para exportação.",
    features: [
      "Due diligence automatizada",
      "Geolocalização de propriedades",
      "Relatórios para importadores",
      "Certificação de origem",
    ],
  },
  {
    icon: Coins,
    title: "Tokenização",
    description: "Transforme seus ativos agrícolas em tokens digitais. Acesse novos mercados e possibilidades de financiamento através da tecnologia blockchain.",
    features: [
      "Tokens para cada lote",
      "Marketplace integrado",
      "Liquidez para produtores",
      "Transparência total",
    ],
  },
  {
    icon: QrCode,
    title: "Verificação por QR Code",
    description: "Permita que consumidores finais verifiquem toda a origem do produto com um simples scan de QR Code no ponto de venda.",
    features: [
      "QR Code por produto",
      "Página de verificação",
      "Histórico completo",
      "Compartilhamento em redes",
    ],
  },
];

const Solucoes = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero */}
        <section className="pt-32 pb-16 bg-background">
          <div className="section-container">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
                Nossas <span className="highlight-text">Soluções</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Tecnologia de ponta para rastreabilidade agrícola completa
              </p>
            </div>
          </div>
        </section>

        {/* Solutions Grid */}
        <section className="pb-20">
          <div className="section-container">
            <div className="space-y-16">
              {solutions.map((solution, index) => (
                <div
                  key={solution.title}
                  className={`flex flex-col lg:flex-row gap-12 items-center ${
                    index % 2 === 1 ? "lg:flex-row-reverse" : ""
                  }`}
                >
                  {/* Content */}
                  <div className="flex-1 space-y-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <solution.icon className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-3xl font-bold text-foreground">
                      {solution.title}
                    </h2>
                    <p className="text-lg text-muted-foreground">
                      {solution.description}
                    </p>
                    <ul className="space-y-3">
                      {solution.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-3">
                          <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <div className="w-2 h-2 bg-primary rounded-full" />
                          </div>
                          <span className="text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold mt-4">
                      Saiba mais
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>

                  {/* Visual placeholder */}
                  <div className="flex-1 w-full">
                    <div className="aspect-video bg-gradient-to-br from-primary/5 to-primary/20 rounded-2xl flex items-center justify-center">
                      <solution.icon className="h-24 w-24 text-primary/30" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Solucoes;
