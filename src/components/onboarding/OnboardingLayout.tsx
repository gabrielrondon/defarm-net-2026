import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LogIn } from "lucide-react";
import { useTranslation } from "react-i18next";
import logoIcon from "@/assets/logo-icon.png";

interface OnboardingLayoutProps {
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
  onStepClick?: (step: number) => void;
}

const stepKeys = ["property", "identify", "register", "portfolio", "compliance", "opportunities"];

export function OnboardingLayout({ 
  children, 
  currentStep, 
  totalSteps,
  onStepClick 
}: OnboardingLayoutProps) {
  const { t } = useTranslation();
  const progressPercent = ((currentStep) / totalSteps) * 100;

  const handleStepClick = (stepIndex: number) => {
    const step = stepIndex + 1;
    if (step < currentStep && onStepClick) {
      onStepClick(step);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img 
              src={logoIcon} 
              alt="DeFarm" 
              className="h-8 w-8"
            />
            <span className="font-bold text-lg text-foreground">DeFarm</span>
          </Link>
          
          <Link to="/login">
            <Button variant="ghost" size="sm" className="gap-2">
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">{t("onboarding.loginPrompt")}</span>
              <span className="sm:hidden">{t("onboarding.loginPromptMobile")}</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-muted/30 border-b border-border/30">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-3">
            {stepKeys.map((key, index) => {
              const step = index + 1;
              const isCompleted = step < currentStep;
              const isCurrent = step === currentStep;
              const isClickable = isCompleted;

              return (
                <button
                  key={key}
                  onClick={() => handleStepClick(index)}
                  disabled={!isClickable}
                  className={`text-xs font-medium transition-all ${
                    isCurrent
                      ? "text-primary font-bold"
                      : isCompleted
                        ? "text-primary hover:text-primary/80 cursor-pointer underline-offset-2 hover:underline"
                        : "text-muted-foreground cursor-default"
                  }`}
                >
                  <span className="hidden sm:inline">{t(`onboarding.steps.${key}`)}</span>
                  <span className="sm:hidden">{step}</span>
                </button>
              );
            })}
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 md:py-12 flex flex-col">
          {children}
        </div>
      </main>

      {/* Footer hint */}
      <footer className="py-4 text-center text-xs text-muted-foreground border-t border-border/30">
        <p>{t("onboarding.footer")}</p>
      </footer>
    </div>
  );
}
