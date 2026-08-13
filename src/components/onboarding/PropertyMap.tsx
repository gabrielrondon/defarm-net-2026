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
    // Guard contra geojson vazio/inválido ({} passa por checagens de truthiness mas
    // não tem geometry → L.geoJSON gera bounds inválido → fitBounds estoura → tela branca).
    if (!mapRef.current || !geojson || !(geojson as any).geometry) return;

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
  }, [geojson, compact]);

  return (
    <div
      ref={mapRef}
      className={`rounded-xl border border-border overflow-hidden ${className}`}
    />
  );
}
