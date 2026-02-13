import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  ArrowRight, 
  FileText, 
  Landmark, 
  TrendingUp, 
  CheckCircle2,
  Lock,
  Sparkles
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface StepFinanceProps {
  itemCount: number;
  onSave: () => void;
}

export function StepFinance({ itemCount, onSave }: StepFinanceProps) {
  const { t } = useTranslation();

  const opportunities = [
    {
      id: "cpr",
      icon: FileText,
      title: t("onboarding.step5.cprTitle"),
      description: t("onboarding.step5.cprDesc"),
      requirements: [
        { label: t("onboarding.step5.reqAssets"), met: true },
        { label: t("onboarding.step5.reqCompliance"), met: true },
        { label: t("onboarding.step5.reqProperty"), met: false },
      ],
      highlight: t("onboarding.step5.cprHighlight"),
    },
    {
      id: "finance",
      icon: Landmark,
      title: t("onboarding.step5.financeTitle"),
      description: t("onboarding.step5.financeDesc"),
      requirements: [
        { label: t("onboarding.step5.reqAssets"), met: true },
        { label: t("onboarding.step5.reqCompliance"), met: true },
        { label: t("onboarding.step5.reqHistory"), met: false },
      ],
      highlight: t("onboarding.step5.financeHighlight"),
    },
    {
      id: "premium",
      icon: TrendingUp,
      title: t("onboarding.step5.premiumTitle"),
      description: t("onboarding.step5.premiumDesc"),
      requirements: [
        { label: t("onboarding.step5.reqAssets"), met: true },
        { label: t("onboarding.step5.reqEudr"), met: true },
        { label: t("onboarding.step5.reqCerts"), met: false },
      ],
      highlight: t("onboarding.step5.premiumHighlight"),
    },
  ];

  const subtitle = itemCount === 1
    ? t("onboarding.step5.subtitle", { count: itemCount })
    : t("onboarding.step5.subtitlePlural", { count: itemCount });

  return (
    <div className="flex-1 flex flex-col">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          {t("onboarding.step5.unlocked")}
        </div>
        
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
          {t("onboarding.step5.title")}
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          {subtitle}
        </p>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full">
        <div className="space-y-4 mb-8">
          {opportunities.map((opp, index) => (
            <Card 
              key={opp.id}
              className="p-5 hover:border-primary/50 transition-all cursor-pointer animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <opp.icon className="w-6 h-6 text-primary" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{opp.title}</h3>
                    <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full">
                      {opp.highlight}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{opp.description}</p>
                  
                  <div className="flex flex-wrap gap-2">
                    {opp.requirements.map((req, i) => (
                      <div 
                        key={i}
                        className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
                          req.met 
                            ? "bg-green-500/10 text-green-600" 
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {req.met ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <Lock className="w-3 h-3" />
                        )}
                        {req.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-6 bg-primary/5 border-primary/20 text-center">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {t("onboarding.step5.readyTitle")}
          </h3>
          
          <Button
            size="lg"
            onClick={onSave}
            className="px-8 py-6 text-lg font-semibold gap-2 w-full sm:w-auto"
          >
            {t("onboarding.step5.savePortfolio")}
            <ArrowRight className="w-5 h-5" />
          </Button>
        </Card>
      </div>
    </div>
  );
}
