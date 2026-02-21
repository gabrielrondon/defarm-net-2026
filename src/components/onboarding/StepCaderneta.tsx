import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  BookOpen,
  MapPin,
  Tag,
  Shield,
  Landmark,
  Radio,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import logoIcon from "@/assets/logo-icon.png";

interface PortfolioItem {
  id: string;
  identifier: string;
  dfid: string;
}

interface StepCadernetaProps {
  carNumber: string;
  portfolio: PortfolioItem[];
  onNext: () => void;
}

export function StepCaderneta({ carNumber, portfolio, onNext }: StepCadernetaProps) {
  const { t } = useTranslation();

  // Derive initials from CAR state code or fallback
  const stateCode = carNumber?.slice(0, 2)?.toUpperCase() || "BR";

  const unlockedFeatures = [
    {
      icon: Shield,
      label: t("onboarding.stepCaderneta.featureCompliance"),
      unlocked: true,
    },
    {
      icon: Landmark,
      label: t("onboarding.stepCaderneta.featureFinance"),
      unlocked: true,
    },
    {
      icon: Radio,
      label: t("onboarding.stepCaderneta.featureNetwork"),
      unlocked: true,
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <BookOpen className="w-8 h-8 text-primary" />
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
          {t("onboarding.stepCaderneta.title")}
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          {t("onboarding.stepCaderneta.subtitle")}
        </p>
      </div>

      {/* Digital Passbook Card */}
      <div className="max-w-md mx-auto w-full">
        <div
          className="rounded-2xl border-[3px] border-foreground overflow-hidden bg-background"
          style={{ boxShadow: "6px 6px 0 0 hsl(var(--foreground))" }}
        >
          {/* Card Header */}
          <div className="bg-primary p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logoIcon} alt="DeFarm" className="w-8 h-8" />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-primary-foreground/70 font-semibold">
                  {t("onboarding.stepCaderneta.cardLabel")}
                </p>
                <p className="text-lg font-bold text-primary-foreground">
                  DeFarm Protocol
                </p>
              </div>
            </div>
            <div className="bg-primary-foreground/20 p-2 rounded-full">
              <Lock className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>

          {/* Card Body */}
          <div className="p-5 space-y-5">
            {/* Owner */}
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                <span className="text-primary font-bold text-sm">{stateCode}</span>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                  {t("onboarding.stepCaderneta.ownerLabel")}
                </p>
                <p className="text-sm font-medium text-foreground">
                  {t("onboarding.stepCaderneta.ownerPlaceholder")}
                </p>
              </div>
            </div>

            <hr className="border-border" />

            {/* Property / Land */}
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider mb-2">
                {t("onboarding.stepCaderneta.landLabel")}
              </p>
              <div className="bg-muted rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      CAR {carNumber?.slice(0, 2) || "—"}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-mono truncate">
                      {carNumber || "—"}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] border-primary/30 text-primary shrink-0"
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {t("onboarding.stepCaderneta.verified")}
                </Badge>
              </div>
            </div>

            {/* Portfolio Assets */}
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider mb-2">
                {t("onboarding.stepCaderneta.assetsLabel")} ({portfolio.length})
              </p>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {portfolio.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="bg-muted rounded-lg p-2.5 flex items-center gap-2.5"
                  >
                    <Tag className="w-3.5 h-3.5 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">
                        {item.identifier}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">
                        {item.dfid}
                      </p>
                    </div>
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  </div>
                ))}
                {portfolio.length > 4 && (
                  <p className="text-[11px] text-muted-foreground text-center">
                    +{portfolio.length - 4} {t("onboarding.stepCaderneta.moreAssets")}
                  </p>
                )}
              </div>
            </div>

            {/* Sync indicator */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                {t("onboarding.stepCaderneta.syncLabel")}
              </p>
            </div>
          </div>
        </div>

        {/* Unlocked features */}
        <div className="mt-6 space-y-2">
          <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider text-center mb-3">
            {t("onboarding.stepCaderneta.unlockedLabel")}
          </p>
          <div className="grid grid-cols-3 gap-3">
            {unlockedFeatures.map((feat) => (
              <div
                key={feat.label}
                className="bg-muted rounded-xl p-3 text-center border border-border"
              >
                <feat.icon className="h-5 w-5 mx-auto text-primary mb-1.5" />
                <p className="text-[11px] font-medium text-foreground leading-tight">
                  {feat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-8 text-center">
        <Button
          size="lg"
          onClick={onNext}
          className="px-8 py-6 text-lg font-semibold gap-2"
        >
          {t("onboarding.stepCaderneta.continue")}
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
