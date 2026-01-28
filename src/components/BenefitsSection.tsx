import { Factory, Store, Leaf, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const stakeholders = [
  {
    icon: Leaf,
    title: "Para Produtores",
    description: "Valorize sua produção com certificação de origem. Acesso a mercados premium e melhor precificação.",
    benefits: [
      "Registro digital completo",
      "Histórico de manejo",
      "Certificados automáticos",
      "Acesso a novos mercados",
    ],
    color: "bg-green-50",
    iconColor: "text-green-600",
  },
  {
    icon: Factory,
    title: "Para Frigoríficos",
    description: "Garanta compliance total com regulamentações e rastreabilidade de ponta a ponta.",
    benefits: [
      "Compliance EUDR",
      "Due diligence simplificada",
      "Relatórios automáticos",
      "Integração com sistemas",
    ],
    color: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    icon: Store,
    title: "Para Varejistas",
    description: "Ofereça transparência total aos consumidores e diferencie sua marca no mercado.",
    benefits: [
      "QR Code para clientes",
      "Selo de origem",
      "Marketing sustentável",
      "Fidelização de clientes",
    ],
    color: "bg-purple-50",
    iconColor: "text-purple-600",
  },
];

export function BenefitsSection() {
  return (
    <section className="py-20 bg-background">
      <div className="section-container">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Soluções para toda a <span className="highlight-text">cadeia produtiva</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Benefícios específicos para cada participante do ecossistema
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {stakeholders.map((stakeholder) => (
            <div
              key={stakeholder.title}
              className="bg-background border border-border rounded-2xl p-8 hover:shadow-lg transition-shadow"
            >
              {/* Icon */}
              <div className={`w-14 h-14 ${stakeholder.color} rounded-xl flex items-center justify-center mb-6`}>
                <stakeholder.icon className={`h-7 w-7 ${stakeholder.iconColor}`} />
              </div>

              {/* Content */}
              <h3 className="text-2xl font-bold text-foreground mb-3">
                {stakeholder.title}
              </h3>
              <p className="text-muted-foreground mb-6">
                {stakeholder.description}
              </p>

              {/* Benefits list */}
              <ul className="space-y-3 mb-8">
                {stakeholder.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    </div>
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button variant="ghost" className="p-0 h-auto font-semibold text-primary hover:text-primary/80">
                Saiba mais
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
