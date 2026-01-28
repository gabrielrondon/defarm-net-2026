import { Scan, Database, Shield, QrCode } from "lucide-react";

const steps = [
  {
    icon: Scan,
    step: "01",
    title: "Cadastro do Animal",
    description: "Registre cada animal com dados completos de origem, saúde e manejo.",
  },
  {
    icon: Database,
    step: "02",
    title: "Rastreamento em Tempo Real",
    description: "Acompanhe toda a movimentação e histórico do animal na blockchain.",
  },
  {
    icon: Shield,
    step: "03",
    title: "Compliance Automático",
    description: "Gere relatórios de conformidade EUDR de forma automática e segura.",
  },
  {
    icon: QrCode,
    step: "04",
    title: "Verificação por QR Code",
    description: "Consumidores acessam toda a origem do produto com um simples scan.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-20 bg-secondary/30">
      <div className="section-container">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Como <span className="highlight-text">funciona</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Processo simples e eficiente para rastrear toda sua produção
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div
              key={step.step}
              className="relative bg-background rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Step number */}
              <span className="absolute top-4 right-4 text-6xl font-bold text-primary/10">
                {step.step}
              </span>

              {/* Icon */}
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                <step.icon className="h-7 w-7 text-primary" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-foreground mb-3">
                {step.title}
              </h3>
              <p className="text-muted-foreground">{step.description}</p>

              {/* Connector line (except last) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-border" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
