import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { CarGeoJSON } from "@/lib/check-api/car";

interface PropertyMapProps {
  geojson: CarGeoJSON;
  className?: string;
  compact?: boolean;
}

export function PropertyMap({ geojson, className = "", compact = false }: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || !geojson) return;

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

    const geoLayer = L.geoJSON(geojson as any, {
      style: {
        color: "#22c55e",
        weight: 3,
        fillColor: "#22c55e",
        fillOpacity: 0.2,
        dashArray: compact ? undefined : "6 4",
      },
    }).addTo(map);

    map.fitBounds(geoLayer.getBounds(), { padding: compact ? [15, 15] : [40, 40] });
    mapInstance.current = map;

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [geojson, compact]);

  return (
    <div
      ref={mapRef}
      className={`rounded-xl border border-border overflow-hidden ${className}`}
    />
  );
}
