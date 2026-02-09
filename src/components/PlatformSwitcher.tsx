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
import { useTranslation } from "react-i18next";
import { SimularTaxasDialog } from "./SimularTaxasDialog";
import { ComoFuncionaDialog } from "./ComoFuncionaDialog";

type Platform = "rastreio" | "financeiro" | "developers";

const platformOrder: Platform[] = ["rastreio", "financeiro", "developers"];

const platformIcons: Record<Platform, typeof Scan> = {
  rastreio: Scan,
  financeiro: Landmark,
  developers: Code,
};

const platformFeatureIcons: Record<Platform, (typeof Shield)[]> = {
  rastreio: [Shield, FileText],
  financeiro: [TrendingUp, Shield],
  developers: [Code, FileText],
};

const platformMeta: Record<Platform, { ctaExternal?: string; ctaHref?: string; secondaryAction?: "popup" | "link" }> = {
  rastreio: { ctaHref: "/onboarding", secondaryAction: "popup" },
  financeiro: { ctaExternal: "https://cpr.defarm.net", secondaryAction: "popup" },
  developers: { ctaExternal: "https://docs.defarm.net" },
};

export function PlatformSwitcher() {
  const [activePlatform, setActivePlatform] = useState<Platform>("rastreio");
  const [showTaxasDialog, setShowTaxasDialog] = useState(false);
  const [showComoFuncionaDialog, setShowComoFuncionaDialog] = useState(false);
  const { t } = useTranslation();
  
  const currentIndex = platformOrder.indexOf(activePlatform);
  const prevPlatform = platformOrder[(currentIndex - 1 + platformOrder.length) % platformOrder.length];
  const nextPlatform = platformOrder[(currentIndex + 1) % platformOrder.length];

  const ActiveIcon = platformIcons[activePlatform];
  const meta = platformMeta[activePlatform];

  const handleSecondaryClick = () => {
    if (activePlatform === "financeiro") {
      setShowTaxasDialog(true);
    } else if (activePlatform === "rastreio") {
      setShowComoFuncionaDialog(true);
    }
  };

  const label = t(`platform.${activePlatform}.label`);
  const headline = t(`platform.${activePlatform}.headline`);
  const highlight = t(`platform.${activePlatform}.highlight`);
  const description = t(`platform.${activePlatform}.description`);
  const cta = t(`platform.${activePlatform}.cta`);
  const secondaryCta = t(`platform.${activePlatform}.secondaryCta`, { defaultValue: "" });

  const stats = [0, 1, 2].map(i => ({
    value: t(`platform.${activePlatform}.stats.${i}.value`),
    label: t(`platform.${activePlatform}.stats.${i}.label`),
  }));

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
              const Icon = platformIcons[prevPlatform];
              return <Icon className="h-10 w-10 text-muted-foreground group-hover:text-primary group-hover:h-14 group-hover:w-14 transition-all duration-500" />;
            })()}
            <span className="text-base font-bold text-muted-foreground group-hover:text-primary group-hover:text-xl transition-all duration-500 [writing-mode:vertical-lr] rotate-180 tracking-wide">
              {t(`platform.${prevPlatform}.shortLabel`)}
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
              const Icon = platformIcons[nextPlatform];
              return <Icon className="h-10 w-10 text-muted-foreground group-hover:text-primary group-hover:h-14 group-hover:w-14 transition-all duration-500" />;
            })()}
            <span className="text-base font-bold text-muted-foreground group-hover:text-primary group-hover:text-xl transition-all duration-500 [writing-mode:vertical-lr] tracking-wide">
              {t(`platform.${nextPlatform}.shortLabel`)}
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
              title={t(`platform.${platformId}.shortLabel`)}
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
                <ActiveIcon className="h-4 w-4" />
                {label}
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
                {headline}{" "}
                <span className="highlight-text">{highlight}</span>
              </h1>

              {/* Description */}
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                {description}
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                {meta.ctaExternal ? (
                  <a href={meta.ctaExternal} target="_blank" rel="noopener noreferrer">
                    <Button
                      size="lg"
                      className="btn-offset bg-primary hover:bg-primary text-primary-foreground font-semibold px-8 py-6 text-lg rounded-lg"
                    >
                      {cta}
                      <ExternalLink className="ml-2 h-5 w-5" />
                    </Button>
                  </a>
                ) : meta.ctaHref ? (
                  <Link to={meta.ctaHref}>
                    <Button
                      size="lg"
                      className="btn-offset bg-primary hover:bg-primary text-primary-foreground font-semibold px-8 py-6 text-lg rounded-lg"
                    >
                      {cta}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                ) : (
                  <Button
                    size="lg"
                    className="btn-offset bg-primary hover:bg-primary text-primary-foreground font-semibold px-8 py-6 text-lg rounded-lg"
                  >
                    {cta}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                )}
                {secondaryCta && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleSecondaryClick}
                    className="btn-offset font-semibold px-8 py-6 text-lg border-2 rounded-lg"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    {secondaryCta}
                  </Button>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-8 pt-10 border-t border-border max-w-2xl mx-auto">
                {stats.map((stat, idx) => (
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
