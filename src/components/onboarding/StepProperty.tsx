import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, MapPin, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getCarGeoJSON, type CarGeoJSON } from "@/lib/check-api/car";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface StepPropertyProps {
  value: string;
  onChange: (value: string, isFake: boolean) => void;
  onNext: () => void;
}

function generateFakeCAR(): string {
  const states: Record<string, string> = {
    MT: "51", MG: "31", SP: "35", GO: "52", MS: "50",
    BA: "29", PA: "15", TO: "17", PR: "41", RS: "43",
  };
  const stateKeys = Object.keys(states);
  const state = stateKeys[Math.floor(Math.random() * stateKeys.length)];
  const code = states[state];
  const mun = String(Math.floor(Math.random() * 900) + 100).padStart(4, "0");
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  const hash = Array.from({ length: 32 }, () =>
    "0123456789ABCDEF"[Math.floor(Math.random() * 16)]
  ).join("");
  return `${state}-${code}${mun}-${hash.slice(0, 32)}`;
}

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

export function StepProperty({ value, onChange, onNext }: StepPropertyProps) {
  const { t } = useTranslation();
  const [isFake, setIsFake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [geojson, setGeojson] = useState<CarGeoJSON | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canProceed = value.trim().length >= 5;

  const handleGenerateFake = () => {
    const fakeCAR = generateFakeCAR();
    onChange(fakeCAR, true);
    setIsFake(true);
    setGeojson(null);
    setError(null);
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
      const result = await getCarGeoJSON(value.trim());
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
          className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
        >
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
