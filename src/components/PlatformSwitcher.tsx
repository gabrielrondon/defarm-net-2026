import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Scan, 
  Landmark, 
  Code, 
  ArrowRight, 
  Shield, 
  TrendingUp, 
  FileText,
  ExternalLink,
  Play
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SimularTaxasDialog } from "./SimularTaxasDialog";
import { ComoFuncionaDialog } from "./ComoFuncionaDialog";

type Platform = "rastreio" | "financeiro" | "developers";

interface PlatformData {
  id: Platform;
  icon: typeof Scan;
  label: string;
  shortLabel: string;
  headline: string;
  highlight: string;
  headlineEnd?: string;
  description: string;
  cta: string;
  ctaExternal?: string;
  ctaHref?: string;
  secondaryCta?: string;
  secondaryAction?: "popup" | "link";
  stats: { value: string; label: string }[];
  features: { icon: typeof Shield; text: string }[];
}

const platforms: Record<Platform, PlatformData> = {
  rastreio: {
    id: "rastreio",
    icon: Scan,
    label: "Plataforma #1 em Rastreabilidade",
    shortLabel: "Rastreio",
    headline: "A plataforma de",
    highlight: "rastreabilidade agrícola",
    headlineEnd: "mais completa do Brasil",
    description: "Conectamos toda a cadeia produtiva com transparência, tecnologia blockchain e compliance EUDR. Do campo até a mesa do consumidor.",
    cta: "Acessar Plataforma",
    ctaHref: "/login",
    secondaryCta: "Ver como funciona",
    secondaryAction: "popup",
    stats: [
      { value: "20.000+", label: "Gados rastreados" },
      { value: "143", label: "Produtores ativos" },
      { value: "98%", label: "Satisfação" },
    ],
    features: [
      { icon: Shield, text: "Blockchain imutável" },
      { icon: FileText, text: "Compliance EUDR" },
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
    ctaExternal: "https://cpr.defarm.net",
    secondaryCta: "Simular taxas",
    secondaryAction: "popup",
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
    ctaExternal: "https://docs.defarm.net",
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

const platformOrder: Platform[] = ["rastreio", "financeiro", "developers"];

export function PlatformSwitcher() {
  const [activePlatform, setActivePlatform] = useState<Platform>("rastreio");
  const [showTaxasDialog, setShowTaxasDialog] = useState(false);
  const [showComoFuncionaDialog, setShowComoFuncionaDialog] = useState(false);
  
  const active = platforms[activePlatform];
  const currentIndex = platformOrder.indexOf(activePlatform);
  const prevPlatform = platformOrder[(currentIndex - 1 + platformOrder.length) % platformOrder.length];
  const nextPlatform = platformOrder[(currentIndex + 1) % platformOrder.length];

  const handleSecondaryClick = () => {
    if (activePlatform === "financeiro") {
      setShowTaxasDialog(true);
    } else if (activePlatform === "rastreio") {
      setShowComoFuncionaDialog(true);
    }
  };

  return (
    <>
      <section className="min-h-[calc(100vh-80px)] pt-20 bg-background relative overflow-hidden">
        
        {/* Floating Tab - Left Side */}
        <button
          onClick={() => setActivePlatform(prevPlatform)}
          className={cn(
            "fixed left-0 top-1/2 -translate-y-1/2 z-40",
            "group flex items-center",
            "bg-foreground/5 hover:bg-primary/10 backdrop-blur-md",
            "border-y border-r border-border/50 hover:border-primary",
            "rounded-r-3xl py-12 px-5",
            "transition-all duration-500 ease-out",
            "hover:px-10 hover:py-16 hover:shadow-2xl hover:scale-105"
          )}
        >
          <div className="flex flex-col items-center gap-4 transition-all duration-500 group-hover:gap-6">
            {(() => {
              const Icon = platforms[prevPlatform].icon;
              return <Icon className="h-10 w-10 text-muted-foreground group-hover:text-primary group-hover:h-14 group-hover:w-14 transition-all duration-500" />;
            })()}
            <span className="text-base font-bold text-muted-foreground group-hover:text-primary group-hover:text-xl transition-all duration-500 [writing-mode:vertical-lr] rotate-180 tracking-wide">
              {platforms[prevPlatform].shortLabel}
            </span>
          </div>
        </button>

        {/* Floating Tab - Right Side */}
        <button
          onClick={() => setActivePlatform(nextPlatform)}
          className={cn(
            "fixed right-0 top-1/2 -translate-y-1/2 z-40",
            "group flex items-center",
            "bg-foreground/5 hover:bg-primary/10 backdrop-blur-md",
            "border-y border-l border-border/50 hover:border-primary",
            "rounded-l-3xl py-12 px-5",
            "transition-all duration-500 ease-out",
            "hover:px-10 hover:py-16 hover:shadow-2xl hover:scale-105"
          )}
        >
          <div className="flex flex-col items-center gap-4 transition-all duration-500 group-hover:gap-6">
            {(() => {
              const Icon = platforms[nextPlatform].icon;
              return <Icon className="h-10 w-10 text-muted-foreground group-hover:text-primary group-hover:h-14 group-hover:w-14 transition-all duration-500" />;
            })()}
            <span className="text-base font-bold text-muted-foreground group-hover:text-primary group-hover:text-xl transition-all duration-500 [writing-mode:vertical-lr] tracking-wide">
              {platforms[nextPlatform].shortLabel}
            </span>
          </div>
        </button>

        {/* Platform Indicator Dots */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 flex gap-2">
          {platformOrder.map((platformId) => (
            <button
              key={platformId}
              onClick={() => setActivePlatform(platformId)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                platformId === activePlatform 
                  ? "w-8 bg-primary" 
                  : "bg-foreground/20 hover:bg-foreground/40"
              )}
              title={platforms[platformId].shortLabel}
            />
          ))}
        </div>

        {/* Main Content - Full Screen */}
        <div 
          className="min-h-[calc(100vh-80px)] flex items-center animate-fade-in"
          key={activePlatform}
        >
          <div className="section-container py-12">
            <div className="max-w-4xl mx-auto text-center">
              {/* Platform Badge */}
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <active.icon className="h-4 w-4" />
                {active.label}
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
                {active.headline}{" "}
                <span className="highlight-text">{active.highlight}</span>
                {active.headlineEnd && ` ${active.headlineEnd}`}
              </h1>

              {/* Description */}
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                {active.description}
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                {active.ctaExternal ? (
                  <a href={active.ctaExternal} target="_blank" rel="noopener noreferrer">
                    <Button
                      size="lg"
                      className="btn-offset bg-primary hover:bg-primary text-primary-foreground font-semibold px-8 py-6 text-lg rounded-lg"
                    >
                      {active.cta}
                      <ExternalLink className="ml-2 h-5 w-5" />
                    </Button>
                  </a>
                ) : active.ctaHref ? (
                  <Link to={active.ctaHref}>
                    <Button
                      size="lg"
                      className="btn-offset bg-primary hover:bg-primary text-primary-foreground font-semibold px-8 py-6 text-lg rounded-lg"
                    >
                      {active.cta}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                ) : (
                  <Button
                    size="lg"
                    className="btn-offset bg-primary hover:bg-primary text-primary-foreground font-semibold px-8 py-6 text-lg rounded-lg"
                  >
                    {active.cta}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                )}
                {active.secondaryCta && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleSecondaryClick}
                    className="btn-offset font-semibold px-8 py-6 text-lg border-2 rounded-lg"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    {active.secondaryCta}
                  </Button>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-8 pt-10 border-t border-border max-w-2xl mx-auto">
                {active.stats.map((stat, idx) => (
                  <div key={idx} className="text-center">
                    <p className="text-3xl sm:text-4xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Dialogs */}
      <SimularTaxasDialog open={showTaxasDialog} onOpenChange={setShowTaxasDialog} />
      <ComoFuncionaDialog open={showComoFuncionaDialog} onOpenChange={setShowComoFuncionaDialog} />
    </>
  );
}
