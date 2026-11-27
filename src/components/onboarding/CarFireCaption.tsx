import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Flame } from "lucide-react";
import { getCarFireS2, type CarFireS2 } from "@/lib/check-api/car";

/** Busca a leitura de fogo por polígono do CAR (null = sem leitura; a camada simplesmente não aparece). */
export function useCarFireS2(car: string | null | undefined): CarFireS2 | null {
  const [data, setData] = useState<CarFireS2 | null>(null);
  useEffect(() => {
    setData(null);
    if (!car) return;
    let cancelled = false;
    getCarFireS2(car).then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, [car]);
  return data;
}

type Lang = "pt" | "en" | "es";
const TXT: Record<Lang, { burned: (ha: string, pct: string, y: number) => string; none: (y: number) => string; dates: string; note: string }> = {
  pt: {
    burned: (ha, pct, y) => `Área queimada em ${y}: pelo menos ${ha} ha (${pct}% do imóvel)`,
    none: (y) => `Nenhuma área queimada detectada em ${y}`,
    dates: "Queimadas em",
    note: "Satélite Sentinel-2 (20 m), leitura DeFarm. Fogo leve pode não aparecer.",
  },
  en: {
    burned: (ha, pct, y) => `Burned area in ${y}: at least ${ha} ha (${pct}% of the property)`,
    none: (y) => `No burned area detected in ${y}`,
    dates: "Burned on",
    note: "Sentinel-2 satellite (20 m), DeFarm reading. Light fires may not show.",
  },
  es: {
    burned: (ha, pct, y) => `Área quemada en ${y}: al menos ${ha} ha (${pct}% del inmueble)`,
    none: (y) => `Ninguna área quemada detectada en ${y}`,
    dates: "Quemas en",
    note: "Satélite Sentinel-2 (20 m), lectura DeFarm. Fuego leve puede no aparecer.",
  },
};

/** Legenda curta abaixo do mapa. Só renderiza quando há leitura para o CAR. */
export function CarFireCaption({ fire, className = "" }: { fire: CarFireS2 | null; className?: string }) {
  const { i18n } = useTranslation();
  if (!fire) return null;
  const lang: Lang = i18n.language?.startsWith("en") ? "en" : i18n.language?.startsWith("es") ? "es" : "pt";
  const t = TXT[lang];
  const p = fire.properties;
  const loc = lang === "pt" ? "pt-BR" : lang;
  const burned = (p.burnedHa ?? 0) > 0 && fire.features.length > 0;
  const dates = [...fire.features]
    .sort((a, b) => b.properties.areaHa - a.properties.areaHa)
    .slice(0, 3)
    .map((f) => f.properties.burnDate)
    .sort()
    .map((d) => d.split("-").reverse().slice(0, 2).join("/"));
  return (
    <div className={`text-[12px] leading-snug ${className}`}>
      <div className="flex items-start gap-1.5 font-medium" style={{ color: burned ? "#c2410c" : undefined }}>
        <Flame className="mt-[2px] h-3.5 w-3.5 shrink-0" />
        <span>
          {burned
            ? t.burned(
                (p.burnedHa ?? 0).toLocaleString(loc, { maximumFractionDigits: 0 }),
                (p.burnedPct ?? 0).toLocaleString(loc, { maximumFractionDigits: 1 }),
                p.year,
              )
            : t.none(p.year)}
          {burned && dates.length > 0 && (
            <span className="font-normal text-muted-foreground">
              {" "}· {t.dates} {dates.join(", ")}
            </span>
          )}
        </span>
      </div>
      <div className="text-muted-foreground">{t.note}</div>
    </div>
  );
}
