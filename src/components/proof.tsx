import { useTranslation } from "react-i18next";

// Componentes de "prova" reutilizados entre telas (Score, EUDR) e home.
// Sem ícone decorativo: estado vira COR + texto (decisão anti-AI #55).

export type Band = "A" | "B" | "C" | "—";
export function bandOf(score: number): Band {
  return score >= 75 ? "A" : score >= 50 ? "B" : score > 0 ? "C" : "—";
}

const BAND_STYLE: Record<Band, { bg: string; fg: string; bd: string }> = {
  A: { bg: "hsl(var(--primary))", fg: "hsl(var(--primary-foreground))", bd: "transparent" },
  B: { bg: "hsl(var(--foreground))", fg: "hsl(var(--background))", bd: "transparent" },
  C: { bg: "hsl(var(--destructive) / 0.12)", fg: "hsl(var(--destructive))", bd: "hsl(var(--destructive) / 0.3)" },
  "—": { bg: "hsl(var(--muted))", fg: "hsl(var(--muted-foreground))", bd: "hsl(var(--border))" },
};

export function BandChip({ band, label, big = false }: { band: Band; label?: string; big?: boolean }) {
  const s = BAND_STYLE[band] ?? BAND_STYLE["—"];
  return (
    <div className="inline-flex items-center gap-2.5">
      <span
        className="grid place-items-center rounded-xl font-display font-bold"
        style={{
          background: s.bg,
          color: s.fg,
          border: `1px solid ${s.bd}`,
          width: big ? 56 : 38,
          height: big ? 56 : 38,
          fontSize: big ? 26 : 17,
        }}
      >
        {band}
      </span>
      {label ? <span className="text-[13px] font-medium text-muted-foreground">{label}</span> : null}
    </div>
  );
}

export type AnchorState = "confirmed" | "pending" | "failed";
// Normaliza qualquer status vindo da API pros 3 estados conhecidos.
export function anchorStateOf(status?: string | null): AnchorState {
  if (status === "confirmed") return "confirmed";
  if (status === "failed") return "failed";
  return "pending";
}

export function AnchorStatus({ status, compact = false }: { status: AnchorState; compact?: boolean }) {
  const { t } = useTranslation();
  const titles: Record<AnchorState, [string, string]> = {
    confirmed: [t("eudr.anchor_confirmed"), t("eudr.anchor_confirmed_d")],
    pending: [t("eudr.anchor_pending"), t("eudr.anchor_pending_d")],
    failed: [t("eudr.anchor_failed"), t("eudr.anchor_failed_d")],
  };
  const [title, desc] = titles[status] ?? titles.pending;
  const isGreen = status === "confirmed";
  const color = isGreen ? "hsl(var(--primary))" : status === "failed" ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))";
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-[5px] h-2 w-2 shrink-0 rounded-[2px]" style={{ background: color }} />
      <div className="min-w-0">
        <div className="text-[14px] font-semibold" style={{ color: isGreen ? "hsl(var(--primary-deep))" : "hsl(var(--foreground))" }}>
          {title}
        </div>
        {!compact && <div className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">{desc}</div>}
      </div>
    </div>
  );
}

// Polígono renderizado em SVG. Aceita um anel GeoJSON real (lng,lat); se ausente,
// usa um motivo ilustrativo. Em produção pode virar Leaflet (já no projeto).
const FALLBACK_POLY: [number, number][] = [
  [-54.08, -19.53], [-54.058, -19.52], [-54.04, -19.529], [-54.033, -19.551],
  [-54.047, -19.57], [-54.071, -19.567], [-54.086, -19.547], [-54.08, -19.53],
];
function project(ring: [number, number][], w: number, h: number, pad: number) {
  const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const sx = (w - pad * 2) / Math.max(1e-9, maxX - minX);
  const sy = (h - pad * 2) / Math.max(1e-9, maxY - minY);
  const s = Math.min(sx, sy);
  return ring.map(([lng, lat]) => [pad + (lng - minX) * s, h - pad - (lat - minY) * s] as [number, number]);
}
export function PolygonMap({
  ok = true,
  height = 220,
  ring,
}: {
  ok?: boolean;
  height?: number;
  ring?: [number, number][];
}) {
  const w = 360, pad = 26;
  const useRing = ring && ring.length >= 3 ? ring : FALLBACK_POLY;
  const pts = project(useRing, w, height, pad);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ") + " Z";
  const col = ok ? "var(--primary)" : "var(--destructive)";
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" preserveAspectRatio="xMidYMid meet" className="block rounded-xl" style={{ background: "hsl(var(--muted))" }} role="img" aria-label="Polygon">
      <defs>
        <pattern id="mgrid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0V24" fill="none" stroke="hsl(var(--foreground) / 0.05)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={w} height={height} fill="url(#mgrid)" />
      <path d={d} fill={`hsl(${col} / 0.14)`} stroke={`hsl(${col})`} strokeWidth="1.8" strokeLinejoin="round" />
      {pts.slice(0, -1).map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="2.4" fill={`hsl(${col})`} />
      ))}
      <g fontFamily="'IBM Plex Mono',monospace" fontSize="9" fill="hsl(var(--muted-foreground))">
        <text x={w - pad} y={16} textAnchor="end">SICAR</text>
      </g>
    </svg>
  );
}
