import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, MapPin, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getCarGeoJSON, getSampleCarNumbers, getRandomSampleCar, type CarGeoJSON } from "@/lib/check-api/car";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function PropertyMap({ geojson }: { geojson: CarGeoJSON }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || !geojson) return;

    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
    }).addTo(map);

    const geoLayer = L.geoJSON(geojson as any, {
      style: {
        color: "#16a34a",
        weight: 3,
        fillColor: "#16a34a",
        fillOpacity: 0.15,
      },
    }).addTo(map);

    map.fitBounds(geoLayer.getBounds(), { padding: [30, 30] });
    mapInstance.current = map;

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [geojson]);

  return (
    <div
      ref={mapRef}
      className="w-full h-64 md:h-80 rounded-xl border border-border overflow-hidden"
    />
  );
}

interface StepPropertyProps {
  value: string;
  onChange: (value: string, isFake: boolean) => void;
  onNext: () => void;
}

export function StepProperty({ value, onChange, onNext }: StepPropertyProps) {
  const { t } = useTranslation();
  const [isFake, setIsFake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [geojson, setGeojson] = useState<CarGeoJSON | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sampleCars, setSampleCars] = useState<string[]>([]);
  const [loadingSample, setLoadingSample] = useState(false);

  // Pre-fetch sample CARs on mount
  useEffect(() => {
    getSampleCarNumbers().then(setSampleCars).catch(() => {});
  }, []);

  const canProceed = value.trim().length >= 5;

  const handleGenerateFake = async () => {
    if (sampleCars.length > 0) {
      const car = getRandomSampleCar(sampleCars);
      onChange(car, true);
      setIsFake(true);
      setGeojson(null);
      setError(null);
    } else {
      setLoadingSample(true);
      try {
        const samples = await getSampleCarNumbers();
        setSampleCars(samples);
        const car = getRandomSampleCar(samples);
        onChange(car, true);
        setIsFake(true);
        setGeojson(null);
        setError(null);
      } catch {
        setError(t("onboarding.stepProperty.searchError"));
      } finally {
        setLoadingSample(false);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value, false);
    setIsFake(false);
    setGeojson(null);
    setError(null);
  };

  const handleSearch = async () => {
    if (!canProceed) return;
    setLoading(true);
    setError(null);
    setGeojson(null);

    try {
      const result = await getCarGeoJSON(value.trim(), { skipAuth: true });
      // Validate that geometry actually has coordinates
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
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-8">
        <MapPin className="w-10 h-10 text-primary" />
      </div>

      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
        {t("onboarding.stepProperty.title")}
      </h1>

      <p className="text-muted-foreground mb-10 max-w-md">
        {t("onboarding.stepProperty.subtitle")}
      </p>

      <div className="w-full max-w-lg mb-4">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={t("onboarding.stepProperty.placeholder")}
          autoFocus
          className="w-full text-xl md:text-2xl font-mono font-bold text-center 
                     border-b-4 border-primary/30 bg-transparent py-4
                     focus:outline-none focus:border-primary
                     placeholder:text-muted-foreground/30
                     transition-colors"
        />

        {isFake && (
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-sm">
            <Sparkles className="w-3 h-3" />
            {t("onboarding.stepProperty.fakeGenerated")}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={handleGenerateFake}
          disabled={loadingSample}
          className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4 disabled:opacity-50"
        >
          {loadingSample ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
          {t("onboarding.stepProperty.generateFake")}
        </button>

        {canProceed && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSearch}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MapPin className="w-4 h-4" />
            )}
            {t("onboarding.stepProperty.searchMap")}
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-6 text-sm text-amber-600 bg-amber-500/10 px-4 py-2 rounded-lg max-w-lg">
          {error}
        </div>
      )}

      {geojson && (
        <div className="w-full max-w-lg mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <PropertyMap geojson={geojson} />
          <p className="text-xs text-muted-foreground mt-2">
            {t("onboarding.stepProperty.mapCaption")}
          </p>
        </div>
      )}

      <Button
        size="lg"
        onClick={onNext}
        disabled={!canProceed}
        className="px-8 py-6 text-lg font-semibold gap-2"
      >
        {t("onboarding.stepProperty.continue")}
        <ArrowRight className="w-5 h-5" />
      </Button>
    </div>
  );
}
