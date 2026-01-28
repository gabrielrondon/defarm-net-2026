import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Target, Heart, Shield, Users } from "lucide-react";

const values = [
  {
    icon: Target,
    title: "Missão",
    description: "Revolucionar a rastreabilidade agrícola brasileira, garantindo transparência e confiança em toda a cadeia produtiva.",
  },
  {
    icon: Heart,
    title: "Propósito",
    description: "Conectar produtores, indústria e consumidores através de tecnologia acessível e dados confiáveis.",
  },
  {
    icon: Shield,
    title: "Integridade",
    description: "Dados imutáveis e verificáveis. Nossa plataforma blockchain garante que cada informação seja verdadeira.",
  },
  {
    icon: Users,
    title: "Colaboração",
    description: "Trabalhamos lado a lado com todos os participantes da cadeia para criar soluções que funcionam na prática.",
  },
];

const stats = [
  { number: "2020", label: "Ano de fundação" },
  { number: "20.000+", label: "Animais rastreados" },
  { number: "143", label: "Produtores parceiros" },
  { number: "15", label: "Estados atendidos" },
];

const Sobre = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero */}
        <section className="pt-32 pb-16 bg-background">
          <div className="section-container">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
                Sobre a <span className="highlight-text">DeFarm</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Transformando a agropecuária brasileira com tecnologia e transparência
              </p>
            </div>
          </div>
        </section>

        {/* Story */}
        <section className="pb-20">
          <div className="section-container">
            <div className="max-w-4xl mx-auto">
              <div className="prose prose-lg">
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  A DeFarm nasceu da necessidade de trazer mais transparência e confiança para a cadeia produtiva agrícola brasileira. Fundada em 2020 por especialistas em tecnologia blockchain e agronegócio, nossa missão é conectar cada elo da cadeia com dados verificáveis e imutáveis.
                </p>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Acreditamos que a rastreabilidade não é apenas uma exigência regulatória, mas uma oportunidade de valorizar a produção brasileira no mercado global. Com a DeFarm, produtores podem comprovar a qualidade e origem de seus produtos, frigoríficos garantem compliance total, e consumidores têm acesso à história completa do que consomem.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-16 bg-primary">
          <div className="section-container">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-4xl sm:text-5xl font-bold text-primary-foreground mb-2">
                    {stat.number}
                  </p>
                  <p className="text-primary-foreground/80">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-20 bg-background">
          <div className="section-container">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Nossos <span className="highlight-text">Valores</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map((value) => (
                <div
                  key={value.title}
                  className="bg-secondary/30 rounded-2xl p-8 text-center hover:shadow-md transition-shadow"
                >
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-6">
                    <value.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">
                    {value.title}
                  </h3>
                  <p className="text-muted-foreground">{value.description}</p>
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

export default Sobre;
