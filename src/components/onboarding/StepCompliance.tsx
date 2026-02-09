import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  ArrowRight, 
  Leaf, 
  Globe, 
  FileCheck, 
  CheckCircle2, 
  Loader2,
  AlertCircle 
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface ComplianceChecks {
  environmental: boolean | null;
  eudr: boolean | null;
  documentation: boolean | null;
}

interface StepComplianceProps {
  itemCount: number;
  checks: ComplianceChecks;
  onChecksComplete: (checks: ComplianceChecks) => void;
  onNext: () => void;
}

export function StepCompliance({ 
  itemCount, 
  checks, 
  onChecksComplete, 
  onNext 
}: StepComplianceProps) {
  const { t } = useTranslation();
  const [currentChecks, setCurrentChecks] = useState<ComplianceChecks>({
    environmental: null,
    eudr: null,
    documentation: null,
  });
  const [isComplete, setIsComplete] = useState(false);

  const checkConfig = [
    {
      key: "environmental" as const,
      icon: Leaf,
      label: t("onboarding.step4.environmental"),
      description: t("onboarding.step4.environmentalDesc"),
      delay: 500,
    },
    {
      key: "eudr" as const,
      icon: Globe,
      label: t("onboarding.step4.eudr"),
      description: t("onboarding.step4.eudrDesc"),
      delay: 1500,
    },
    {
      key: "documentation" as const,
      icon: FileCheck,
      label: t("onboarding.step4.documentation"),
      description: t("onboarding.step4.documentationDesc"),
      delay: 2500,
    },
  ];

  useEffect(() => {
    checkConfig.forEach(({ key, delay }) => {
      setTimeout(() => {
        setCurrentChecks(prev => {
          const updated = { ...prev, [key]: true };
          
          if (Object.values(updated).every(v => v === true)) {
            setTimeout(() => {
              setIsComplete(true);
              onChecksComplete(updated);
            }, 500);
          }
          
          return updated;
        });
      }, delay);
    });
  }, [onChecksComplete]);

  const renderCheckStatus = (status: boolean | null) => {
    if (status === null) {
      return <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />;
    }
    if (status) {
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    }
    return <AlertCircle className="w-5 h-5 text-amber-500" />;
  };

  const subtitle = itemCount === 1 
    ? t("onboarding.step4.subtitle", { count: itemCount })
    : t("onboarding.step4.subtitlePlural", { count: itemCount });

  return (
    <div className="flex-1 flex flex-col">
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
          {t("onboarding.step4.title")}
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          {subtitle}
        </p>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full">
        <div className="space-y-4 mb-8">
          {checkConfig.map(({ key, icon: Icon, label, description }) => (
            <Card 
              key={key}
              className={`p-5 transition-all duration-500 ${
                currentChecks[key] === true 
                  ? "border-green-500/30 bg-green-500/5" 
                  : "border-border"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-500 ${
                  currentChecks[key] === true 
                    ? "bg-green-500/10" 
                    : "bg-muted"
                }`}>
                  <Icon className={`w-6 h-6 transition-colors duration-500 ${
                    currentChecks[key] === true 
                      ? "text-green-500" 
                      : "text-muted-foreground"
                  }`} />
                </div>
                
                <div className="flex-1">
                  <div className="font-medium text-foreground">{label}</div>
                  <div className="text-sm text-muted-foreground">{description}</div>
                </div>
                
                {renderCheckStatus(currentChecks[key])}
              </div>
            </Card>
          ))}
        </div>

        {isComplete && (
          <Card className="p-6 bg-green-500/5 border-green-500/30 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t("onboarding.step4.allVerified")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("onboarding.step4.allVerifiedDesc")}
            </p>
          </Card>
        )}
      </div>

      <div className="mt-8 text-center">
        <Button
          size="lg"
          onClick={onNext}
          disabled={!isComplete}
          className="px-8 py-6 text-lg font-semibold gap-2"
        >
          {t("onboarding.step4.viewOpportunities")}
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
