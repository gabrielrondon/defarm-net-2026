import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { formatHa, type Locale } from "@/lib/eudr-report";

interface EudrMapProps {
  geometry: unknown;
  areaHa: number;
  alertOverlay?: unknown;
  locale: Locale;
  className?: string;
}

// Mapa do polígono analisado (satélite ESRI + polígono amarelo + escala +
// atribuição + área). Imperativo (mesmo padrão do PropertyMap), sem iframe.
export function EudrMap({ geometry, areaHa, alertOverlay, locale, className = "" }: EudrMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || !geometry) return;
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    const map = L.map(mapRef.current, { zoomControl: true, attributionControl: true });
    map.attributionControl.setPrefix(false);

    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 18, attribution: "Imagery © Esri · Alertas © Global Forest Watch" }
    ).addTo(map);

    const geoLayer = L.geoJSON(geometry as any, {
      style: { color: "#ffd400", weight: 2, fillColor: "#ffd400", fillOpacity: 0.12 },
    }).addTo(map);

    if (alertOverlay) {
      L.geoJSON(alertOverlay as any, {
        style: { color: "#b42318", weight: 1, fillColor: "#b42318", fillOpacity: 0.25 },
        pointToLayer: (_feature, latlng) =>
          L.circleMarker(latlng, {
            radius: 3,
            color: "#b42318",
            weight: 1,
            fillColor: "#b42318",
            fillOpacity: 0.55,
          }),
      }).addTo(map);
    }

    L.control.scale({ metric: true, imperial: false }).addTo(map);

    // Legenda
    const legend = new L.Control({ position: "topright" });
    legend.onAdd = () => {
      const div = L.DomUtil.create("div");
      div.style.cssText =
        "background:rgba(255,255,255,.92);padding:6px 8px;border-radius:6px;font:11px sans-serif;color:#1c1917;line-height:1.5;box-shadow:0 1px 3px rgba(0,0,0,.2)";
      const analyzed = locale === "en" ? "Analyzed area" : "Área analisada";
      const alert = locale === "en" ? "Deforestation alert" : "Alerta de desmate";
      const overlayRow = alertOverlay
        ? `<div><span style="display:inline-block;width:10px;height:10px;background:#b42318;opacity:.6;margin-right:4px"></span>${alert}</div>`
        : "";
      div.innerHTML =
        `<div><span style="display:inline-block;width:10px;height:10px;background:#ffd400;border:1px solid #b59b00;margin-right:4px"></span>${analyzed}</div>` +
        overlayRow +
        `<div style="margin-top:3px;color:#6b7280">${formatHa(areaHa, locale)}</div>`;
      return div;
    };
    legend.addTo(map);

    try {
      map.fitBounds(geoLayer.getBounds(), { padding: [30, 30] });
    } catch {
      map.setView([0, 0], 2);
    }
    mapInstance.current = map;

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [geometry, alertOverlay, areaHa, locale]);

  return (
    <div
      ref={mapRef}
      aria-label={locale === "en" ? "Map of the analyzed polygon" : "Mapa do polígono analisado"}
      className={`rounded-xl border border-border overflow-hidden ${className}`}
    />
  );
}
