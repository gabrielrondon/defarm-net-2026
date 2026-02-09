import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  ArrowLeft,
  MapPin, 
  QrCode,
  Link2,
  Share2,
  CheckCircle2,
  Leaf,
  Shield,
  FileCheck,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import satelliteImage from "@/assets/satellite-farm-polygon.jpg";

interface ComoFuncionaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const stepIcons = [MapPin, QrCode, Link2, Share2, CheckCircle2];
const checkIcons = [Leaf, Shield, FileCheck, Globe];

function StepVisual({ type, t }: { type: number; t: any }) {
  if (type === 0) {
    return (
      <div className="relative rounded-2xl overflow-hidden">
        <img 
          src={satelliteImage} 
          alt="Rural property" 
          className="w-full h-40 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
        <div className="absolute bottom-3 left-3 flex items-center gap-2 text-xs text-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full">
          <MapPin className="h-3 w-3 text-primary" />
          {t("comoFunciona.polygonVerified")}
        </div>
      </div>
    );
  }

  if (type === 1) {
    return (
      <div className="flex items-center justify-center h-40 bg-gradient-to-br from-muted/50 to-muted rounded-2xl">
        <div className="relative">
          <div className="w-24 h-24 bg-background rounded-2xl shadow-lg flex items-center justify-center border border-border">
            <QrCode className="h-12 w-12 text-primary" />
          </div>
          <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">
            DFID
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full border border-border">
            #A7B2C4
          </div>
        </div>
      </div>
    );
  }

  if (type === 2) {
    return (
      <div className="flex items-center justify-center h-40 bg-gradient-to-br from-muted/50 to-muted rounded-2xl px-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-background rounded-xl shadow flex items-center justify-center border border-border">
            <span className="text-lg">🐄</span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="w-8 h-0.5 bg-primary rounded-full" />
            <div className="w-8 h-0.5 bg-primary/50 rounded-full" />
          </div>
          <div className="w-12 h-12 bg-background rounded-xl shadow flex items-center justify-center border border-border">
            <span className="text-lg">🏭</span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="w-8 h-0.5 bg-primary rounded-full" />
            <div className="w-8 h-0.5 bg-primary/50 rounded-full" />
          </div>
          <div className="w-12 h-12 bg-background rounded-xl shadow flex items-center justify-center border border-border">
            <span className="text-lg">🛒</span>
          </div>
        </div>
      </div>
    );
  }

  if (type === 3) {
    return (
      <div className="flex items-center justify-center h-40 bg-gradient-to-br from-muted/50 to-muted rounded-2xl">
        <div className="relative">
          <div className="w-48 bg-background rounded-xl shadow-lg p-3 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs font-medium text-foreground">Verifiable Link</span>
            </div>
            <div className="bg-muted rounded-lg p-2 text-xs text-muted-foreground font-mono truncate">
              defarm.net/v/a7b2c4
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 4) {
    return (
      <div className="grid grid-cols-2 gap-2 h-40">
        {[0, 1, 2, 3].map((idx) => {
          const Icon = checkIcons[idx];
          return (
            <div
              key={idx}
              className="flex items-center gap-2 bg-background rounded-xl p-3 border border-border shadow-sm"
            >
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs font-medium text-foreground leading-tight">
                {t(`comoFunciona.checks.${idx}`)}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}

export function ComoFuncionaDialog({ open, onOpenChange }: ComoFuncionaDialogProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const totalSteps = 5;
  const isLast = currentStep === totalSteps - 1;
  const isFirst = currentStep === 0;

  const StepIcon = stepIcons[currentStep];

  const handleNext = () => {
    if (isLast) {
      onOpenChange(false);
      navigate("/login");
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setCurrentStep(0);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-6 pb-4">
          {Array.from({ length: totalSteps }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                idx === currentStep 
                  ? "w-6 bg-primary" 
                  : idx < currentStep 
                    ? "bg-primary/50" 
                    : "bg-muted-foreground/20"
              )}
            />
          ))}
        </div>

        {/* Card content */}
        <div className="px-6 pb-6">
          {/* Step header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <StepIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                {t("comoFunciona.stepOf", { current: currentStep + 1, total: totalSteps })}
              </p>
              <h3 className="text-lg font-bold text-foreground">
                {t(`comoFunciona.steps.${currentStep}.title`)}
              </h3>
            </div>
          </div>

          {/* Visual */}
          <div className="mb-4">
            <StepVisual type={currentStep} t={t} />
          </div>

          {/* Description */}
          <p className="text-muted-foreground text-sm mb-6">
            {t(`comoFunciona.steps.${currentStep}.description`)}
          </p>

          {/* Navigation */}
          <div className="flex gap-3">
            {!isFirst && (
              <Button
                variant="outline"
                onClick={handlePrev}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("comoFunciona.back")}
              </Button>
            )}
            <Button
              onClick={handleNext}
              className={cn(
                "flex-1 btn-offset bg-primary hover:bg-primary text-primary-foreground",
                isFirst && "w-full"
              )}
            >
              {isLast ? t("comoFunciona.accessPlatform") : t("comoFunciona.next")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
