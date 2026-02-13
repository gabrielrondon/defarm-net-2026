import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Tag } from "lucide-react";
import { generateFakeId, detectIdType, type GeneratedId } from "@/lib/fake-id-generator";
import { useTranslation } from "react-i18next";
import type { CarGeoJSON } from "@/lib/check-api/car";
import { PropertyMap } from "./PropertyMap";

interface StepIdentifierProps {
  value: string;
  onChange: (value: string, isFake: boolean) => void;
  onNext: () => void;
  carNumber?: string;
  propertyGeojson?: CarGeoJSON | null;
}

export function StepIdentifier({ value, onChange, onNext, carNumber, propertyGeojson }: StepIdentifierProps) {
  const { t } = useTranslation();
  const [isFake, setIsFake] = useState(false);
  const [detectedType, setDetectedType] = useState<string | null>(null);

  useEffect(() => {
    if (value) {
      const type = detectIdType(value);
      setDetectedType(type);
    } else {
      setDetectedType(null);
    }
  }, [value]);

  const handleGenerateFake = () => {
    const generated: GeneratedId = generateFakeId();
    onChange(generated.value, true);
    setIsFake(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value, false);
    setIsFake(false);
  };

  const canProceed = value.trim().length >= 3;

  return (
    <div className="flex-1 flex flex-col items-center justify-center animate-fade-in">
      {/* Property context banner */}
      {propertyGeojson && (
        <div className="w-full max-w-2xl mb-8 animate-fade-in">
          <div className="flex flex-col md:flex-row gap-4 items-stretch bg-muted/40 rounded-2xl p-4 border border-border/60">
            <div className="md:w-48 flex-shrink-0">
              <PropertyMap geojson={propertyGeojson} className="h-32 md:h-full" compact />
            </div>
            <div className="flex flex-col justify-center text-left">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                {t("onboarding.stepProperty.mapCaption")}
              </p>
              {carNumber && (
                <p className="text-sm font-mono text-foreground/80 truncate mb-2">
                  {carNumber}
                </p>
              )}
              <p className="text-sm text-primary font-medium">
                {t("onboarding.step1.propertyContext")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Icon */}
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Tag className="w-8 h-8 text-primary" />
      </div>

      {/* Title */}
      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 text-center">
        {t("onboarding.step1.title")}
      </h1>
      <p className="text-muted-foreground mb-8 max-w-md text-sm md:text-base text-center">
        {t("onboarding.step1.subtitle")}
      </p>

      {/* Input */}
      <div className="w-full max-w-lg mb-3">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={t("onboarding.step1.placeholder")}
          autoFocus
          className="w-full text-lg md:text-xl font-mono font-semibold text-center 
                     border-2 border-border rounded-xl bg-muted/30 px-4 py-4
                     focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                     placeholder:text-muted-foreground/40
                     transition-all"
        />

        <div className="mt-3 min-h-[28px] text-center">
          {detectedType && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              {t("onboarding.step1.detected", { type: detectedType.toUpperCase() })}
            </div>
          )}

          {isFake && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium animate-fade-in">
              <Sparkles className="w-3 h-3" />
              {t("onboarding.step1.fakeGenerated")}
            </div>
          )}
        </div>
      </div>

      {/* Generate fake */}
      <button
        onClick={handleGenerateFake}
        className="text-sm text-muted-foreground hover:text-primary transition-colors mb-8 underline underline-offset-4"
      >
        {t("onboarding.step1.generateFake")}
      </button>

      {/* Continue */}
      <Button
        size="lg"
        onClick={onNext}
        disabled={!canProceed}
        className={`px-8 py-6 text-lg font-semibold gap-2 transition-all duration-300 ${
          canProceed ? "animate-fade-in" : "opacity-50"
        }`}
      >
        {t("onboarding.step1.continue")}
        <ArrowRight className="w-5 h-5" />
      </Button>
    </div>
  );
}
