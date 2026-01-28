import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Scan, 
  Landmark, 
  Code, 
  ArrowRight, 
  Shield, 
  TrendingUp, 
  FileText,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

type Platform = "rastreabilidade" | "financeiro" | "developers";

interface PlatformData {
  id: Platform;
  icon: typeof Scan;
  label: string;
  shortLabel: string;
  headline: string;
  highlight: string;
  description: string;
  cta: string;
  secondaryCta: string;
  externalLink?: string;
  stats: { value: string; label: string }[];
  features: { icon: typeof Shield; text: string }[];
}

const platforms: Record<Platform, PlatformData> = {
  rastreabilidade: {
    id: "rastreabilidade",
    icon: Scan,
    label: "Rastreabilidade",
    shortLabel: "Rastro",
    headline: "Rastreabilidade agrícola",
    highlight: "do campo à mesa",
    description: "Conecte toda a cadeia produtiva com transparência, blockchain e compliance EUDR. Cada animal, cada etapa, 100% rastreável.",
    cta: "Solicitar Demo",
    secondaryCta: "Ver como funciona",
    stats: [
      { value: "20.000+", label: "Gados rastreados" },
      { value: "143", label: "Produtores ativos" },
      { value: "100%", label: "Compliance EUDR" },
    ],
    features: [
      { icon: Shield, text: "Blockchain imutável" },
      { icon: FileText, text: "Relatórios automáticos" },
    ],
  },
  financeiro: {
    id: "financeiro",
    icon: Landmark,
    label: "Financeiro",
    shortLabel: "Finance",
    headline: "CPR Digital com",
    highlight: "garantias reais",
    description: "Emita CPRs financeiros online e vincule ativos rastreáveis como garantia. Acesse melhores taxas com bancos parceiros.",
    cta: "Emitir CPR",
    secondaryCta: "Simular taxas",
    stats: [
      { value: "R$50M+", label: "Em CPRs emitidos" },
      { value: "-2.5%", label: "Taxa média vs mercado" },
      { value: "24h", label: "Aprovação rápida" },
    ],
    features: [
      { icon: TrendingUp, text: "Melhores taxas" },
      { icon: Shield, text: "Garantias tokenizadas" },
    ],
  },
  developers: {
    id: "developers",
    icon: Code,
    label: "Developers",
    shortLabel: "Devs",
    headline: "APIs poderosas para",
    highlight: "integrar tudo",
    description: "Documentação completa, SDKs em múltiplas linguagens e suporte dedicado. Construa sobre a infraestrutura DeFarm.",
    cta: "Acessar Docs",
    secondaryCta: "Ver exemplos",
    externalLink: "https://docs.defarm.net",
    stats: [
      { value: "REST", label: "API moderna" },
      { value: "99.9%", label: "Uptime garantido" },
      { value: "5 min", label: "Para integrar" },
    ],
    features: [
      { icon: Code, text: "SDKs prontos" },
      { icon: FileText, text: "Docs completos" },
    ],
  },
};

const platformOrder: Platform[] = ["rastreabilidade", "financeiro", "developers"];

export function PlatformSwitcher() {
  const [activePlatform, setActivePlatform] = useState<Platform>("rastreabilidade");
  
  const active = platforms[activePlatform];
  const inactivePlatforms = platformOrder.filter(p => p !== activePlatform);

  return (
    <section className="min-h-[calc(100vh-80px)] pt-24 pb-12 bg-background relative overflow-hidden">
      <div className="section-container h-full">
        <div className="flex flex-col lg:flex-row gap-4 h-full">
          
          {/* Inactive Platform Tabs - Left Side on Desktop */}
          <div className="flex lg:flex-col gap-3 order-2 lg:order-1">
            {inactivePlatforms.map((platformId) => {
              const platform = platforms[platformId];
              return (
                <button
                  key={platformId}
                  onClick={() => setActivePlatform(platformId)}
                  className={cn(
                    "group flex-1 lg:flex-none lg:w-20 p-4 rounded-xl border-2 border-border",
                    "bg-secondary/50 hover:bg-secondary hover:border-primary/30",
                    "transition-all duration-300 ease-out",
                    "flex flex-col items-center justify-center gap-2"
                  )}
                >
                  <platform.icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors writing-mode-vertical lg:writing-mode-vertical">
                    {platform.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Platform - Main Content */}
          <div 
            className={cn(
              "flex-1 rounded-2xl p-8 lg:p-12 order-1 lg:order-2",
              "bg-gradient-to-br from-primary/5 via-background to-primary/10",
              "border-2 border-primary/20",
              "transition-all duration-500 ease-out",
              "animate-fade-in"
            )}
            key={activePlatform}
          >
            <div className="max-w-3xl mx-auto">
              {/* Platform Badge */}
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
                <active.icon className="h-4 w-4" />
                {active.label}
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
                {active.headline}{" "}
                <span className="highlight-text">{active.highlight}</span>
              </h1>

              {/* Description */}
              <p className="text-xl text-muted-foreground max-w-2xl mb-8">
                {active.description}
              </p>

              {/* Features Pills */}
              <div className="flex flex-wrap gap-3 mb-8">
                {active.features.map((feature, idx) => (
                  <div 
                    key={idx}
                    className="inline-flex items-center gap-2 bg-background border border-border px-4 py-2 rounded-full text-sm"
                  >
                    <feature.icon className="h-4 w-4 text-primary" />
                    {feature.text}
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                {active.externalLink ? (
                  <a href={active.externalLink} target="_blank" rel="noopener noreferrer">
                    <Button
                      size="lg"
                      className="btn-offset bg-primary hover:bg-primary text-primary-foreground font-semibold px-8 py-6 text-lg rounded-lg"
                    >
                      {active.cta}
                      <ExternalLink className="ml-2 h-5 w-5" />
                    </Button>
                  </a>
                ) : (
                  <Button
                    size="lg"
                    className="btn-offset bg-primary hover:bg-primary text-primary-foreground font-semibold px-8 py-6 text-lg rounded-lg"
                  >
                    {active.cta}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="lg"
                  className="btn-offset font-semibold px-8 py-6 text-lg border-2 rounded-lg"
                >
                  {active.secondaryCta}
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-border">
                {active.stats.map((stat, idx) => (
                  <div key={idx} className="text-center lg:text-left">
                    <p className="text-2xl sm:text-3xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
    </section>
  );
}
