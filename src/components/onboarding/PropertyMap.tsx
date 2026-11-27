import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoJsonObject } from "geojson";

// Aceita TODAS as formas que o L.geoJSON renderiza — Feature, FeatureCollection e
// geometria crua (Polygon/MultiPolygon…). O property_polygons.geojson do backend é
// Value arbitrário (o PUT grava o cru do Check, que é geometria SEM .geometry), então
// exigir só Feature dropava o polígono real em silêncio. Rejeita só o vazio/sem-type.
export function isRenderableGeoJson(v: unknown): v is GeoJsonObject {
  if (!v || typeof v !== "object") return false;
  const o = v as { type?: unknown; geometry?: unknown; features?: unknown; coordinates?: unknown; geometries?: unknown };
  switch (o.type) {
    case "Feature":
      return !!o.geometry;
    case "FeatureCollection":
      return Array.isArray(o.features) && o.features.length > 0;
    case "GeometryCollection":
      return Array.isArray(o.geometries) && o.geometries.length > 0;
    case "Point":
    case "MultiPoint":
    case "LineString":
    case "MultiLineString":
    case "Polygon":
    case "MultiPolygon":
      return Array.isArray(o.coordinates) && o.coordinates.length > 0;
    default:
      return false;
  }
}

interface PropertyMapProps {
  geojson: GeoJsonObject;
  className?: string;
  compact?: boolean;
  /** Camada por cima do polígono: áreas queimadas (GET /car/:car/fire-s2). Feature.properties: burnDate, areaHa. */
  burnedAreas?: GeoJsonObject | null;
}

const fmtBurnDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
};

export function PropertyMap({ geojson, className = "", compact = false, burnedAreas = null }: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || !isRenderableGeoJson(geojson)) return;

    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    const map = L.map(mapRef.current, {
      zoomControl: !compact,
      attributionControl: false,
      dragging: !compact,
      scrollWheelZoom: !compact,
      doubleClickZoom: !compact,
      touchZoom: !compact,
    });

    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 18,
    }).addTo(map);

    const geoLayer = L.geoJSON(geojson, {
      style: {
        color: "#22c55e",
        weight: 3,
        fillColor: "#22c55e",
        fillOpacity: 0.2,
        dashArray: compact ? undefined : "6 4",
      },
    }).addTo(map);

    if (burnedAreas && isRenderableGeoJson(burnedAreas)) {
      L.geoJSON(burnedAreas, {
        style: { color: "#f97316", weight: 1, fillColor: "#ef4444", fillOpacity: 0.55 },
        onEachFeature: (feature, layer) => {
          const p = (feature?.properties ?? {}) as { burnDate?: string; areaHa?: number };
          if (p.burnDate) {
            layer.bindTooltip(
              `${fmtBurnDate(p.burnDate)}${typeof p.areaHa === "number" ? ` · ${p.areaHa.toLocaleString(undefined, { maximumFractionDigits: 1 })} ha` : ""}`,
              { sticky: true },
            );
          }
        },
      }).addTo(map);
    }

    const padding: [number, number] = compact ? [15, 15] : [40, 40];
    const bounds = geoLayer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding });
    } else {
      map.setView([-15, -55], 4); // fallback Brasil — mantém o basemap visível
    }
    mapInstance.current = map;
    // Recupera do caso em que o container nasce 0×0 (o mapa ficaria quebrado pra sempre
    // sem um invalidateSize posterior): recalcula o tamanho e re-enquadra após o layout.
    requestAnimationFrame(() => {
      if (!mapInstance.current) return;
      map.invalidateSize();
      if (bounds.isValid()) {
        try {
          map.fitBounds(bounds, { padding });
        } catch {
          /* mantém a view atual */
        }
      }
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [geojson, compact, burnedAreas]);

  return (
    <div
      ref={mapRef}
      className={`rounded-xl border border-border overflow-hidden ${className}`}
    />
  );
}
