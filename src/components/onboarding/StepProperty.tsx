import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, MapPin, Loader2, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getCarGeoJSON, getSampleCarNumbers, getRandomSampleCar, type CarGeoJSON } from "@/lib/check-api/car";
import { PropertyMap } from "./PropertyMap";

interface StepPropertyProps {
  value: string;
  onChange: (value: string, isFake: boolean) => void;
  onNext: (geojson: CarGeoJSON) => void;
}

export function StepProperty({ value, onChange, onNext }: StepPropertyProps) {
  const { t } = useTranslation();
  const [isFake, setIsFake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [geojson, setGeojson] = useState<CarGeoJSON | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sampleCars, setSampleCars] = useState<string[]>([]);
  const [loadingSample, setLoadingSample] = useState(false);

  useEffect(() => {
    getSampleCarNumbers().then(setSampleCars).catch(() => {});
  }, []);

  const searchCar = useCallback(async (carNumber: string) => {
    if (carNumber.trim().length < 5) return;
    setLoading(true);
    setError(null);
    setGeojson(null);

    try {
      const result = await getCarGeoJSON(carNumber.trim(), { skipAuth: true });
      if (!result?.geometry?.type || !result?.geometry?.coordinates?.length) {
        setError(t("onboarding.stepProperty.noGeometry"));
        return;
      }
      setGeojson(result);
    } catch (err: any) {
      console.error("[StepProperty] CAR lookup failed:", err);
      setError(t("onboarding.stepProperty.searchError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const handleGenerateFake = async () => {
    let samples = sampleCars;
    if (samples.length === 0) {
      setLoadingSample(true);
      try {
        samples = await getSampleCarNumbers();
        setSampleCars(samples);
      } catch {
        setError(t("onboarding.stepProperty.searchError"));
        setLoadingSample(false);
        return;
      }
      setLoadingSample(false);
    }

    const car = getRandomSampleCar(samples);
    onChange(car, true);
    setIsFake(true);
    setGeojson(null);
    setError(null);
    // Auto-search after generating
    await searchCar(car);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value, false);
    setIsFake(false);
    setGeojson(null);
    setError(null);
  };

  const handleSearch = () => searchCar(value);

  const canSearch = value.trim().length >= 5;
  const canProceed = !!geojson;

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in">
      {/* Icon */}
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <MapPin className="w-8 h-8 text-primary" />
      </div>

      {/* Title */}
      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
        {t("onboarding.stepProperty.title")}
      </h1>
      <p className="text-muted-foreground mb-8 max-w-md text-sm md:text-base">
        {t("onboarding.stepProperty.subtitle")}
      </p>

      {/* Input Area */}
      <div className="w-full max-w-lg mb-3">
        <div className="relative">
          <input
            type="text"
            value={value}
            onChange={handleInputChange}
            placeholder={t("onboarding.stepProperty.placeholder")}
            autoFocus
            className="w-full text-lg md:text-xl font-mono font-semibold text-center 
                       border-2 border-border rounded-xl bg-muted/30 px-4 py-4
                       focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
                       placeholder:text-muted-foreground/40
                       transition-all"
          />
          {geojson && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center animate-scale-in">
                <Check className="w-4 h-4 text-primary-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Status badges */}
        <div className="mt-3 min-h-[28px]">
          {isFake && !loading && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium animate-fade-in">
              <Sparkles className="w-3 h-3" />
              {t("onboarding.stepProperty.fakeGenerated")}
            </div>
          )}
          {loading && (
            <div className="inline-flex items-center gap-2 text-muted-foreground text-xs animate-fade-in">
              <Loader2 className="w-3 h-3 animate-spin" />
              {t("onboarding.stepProperty.searching")}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={handleGenerateFake}
          disabled={loadingSample || loading}
          className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4 disabled:opacity-50"
        >
          {loadingSample ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
          {t("onboarding.stepProperty.generateFake")}
        </button>

        {canSearch && !geojson && !loading && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSearch}
            className="gap-2 animate-fade-in"
          >
            <MapPin className="w-4 h-4" />
            {t("onboarding.stepProperty.searchMap")}
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 text-sm text-amber-600 bg-amber-500/10 px-4 py-2.5 rounded-xl max-w-lg animate-fade-in">
          {error}
        </div>
      )}

      {/* Map */}
      {geojson && (
        <div className="w-full max-w-lg mb-6 animate-fade-in">
          <PropertyMap geojson={geojson} className="h-56 md:h-72 shadow-lg" />
          <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
            <Check className="w-3 h-3 text-primary" />
            {t("onboarding.stepProperty.mapCaption")}
          </p>
        </div>
      )}

      {/* Continue */}
      <Button
        size="lg"
        onClick={() => geojson && onNext(geojson)}
        disabled={!canProceed}
        className={`px-8 py-6 text-lg font-semibold gap-2 transition-all duration-300 ${
          canProceed ? "animate-fade-in" : "opacity-50"
        }`}
      >
        {t("onboarding.stepProperty.continue")}
        <ArrowRight className="w-5 h-5" />
      </Button>
    </div>
  );
}
