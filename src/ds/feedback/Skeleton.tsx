import type { CSSProperties } from "react";

export interface SkeletonProps { variant?: "text" | "metric" | "row" | "circle" | "card"; width?: number | string; height?: number | string; lines?: number; style?: CSSProperties }

/** Loading placeholder that keeps the tactile silhouette (radius + bottom edge) so the page does not jump when content arrives. */
export function Skeleton({ variant = "text", width, height, lines = 3, style }: SkeletonProps) {
  const bar = (w: number | string, h: number | string, r: number): CSSProperties => ({
    width: w, height: h, borderRadius: r,
    background: "linear-gradient(90deg,var(--paper-2) 0%,var(--paper-3) 40%,var(--paper-2) 80%)",
    backgroundSize: "200% 100%", animation: "df-shimmer 1.6s linear infinite",
  });
  if (variant === "text") {
    return (
      <span aria-hidden="true" style={{ display: "grid", gap: 8, width: width || "100%", ...style }}>
        {Array.from({ length: lines }).map((_, i) => <span key={i} style={bar(i === lines - 1 && lines > 1 ? "62%" : "100%", height || 12, 6)} />)}
      </span>
    );
  }
  if (variant === "metric") {
    return (
      <div aria-hidden="true" style={{ padding: "var(--s-6)", borderRadius: "var(--r-xl)", background: "var(--surface-card)", border: "2px solid var(--border-tactile)", borderBottom: "4px solid var(--border-tactile-deep)", display: "grid", gap: "var(--s-4)", ...style }}>
        <span style={bar(96, 10, 5)} /><span style={bar(140, 40, 10)} /><span style={bar(72, 10, 5)} />
      </div>
    );
  }
  if (variant === "row") {
    return (
      <div aria-hidden="true" style={{ display: "grid", gap: "var(--s-2)", ...style }}>
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "var(--s-4)", padding: "14px 16px", borderRadius: "var(--r-md)", background: "var(--surface-card)", border: "1px solid var(--border-hair)", borderBottom: "3px solid var(--paper-3)" }}>
            <span style={bar(10, 10, 99)} />
            <span style={{ display: "grid", gap: 6, flex: 1 }}><span style={bar("55%", 12, 6)} /><span style={bar("35%", 10, 5)} /></span>
            <span style={bar(92, 24, 8)} /><span style={bar(64, 20, 99)} />
          </div>
        ))}
      </div>
    );
  }
  if (variant === "circle") {
    const s = width || 44;
    return <span aria-hidden="true" style={{ display: "inline-block", ...bar(s, s, 99), ...style }} />;
  }
  return (
    <div aria-hidden="true" style={{ padding: "var(--s-6)", borderRadius: "var(--r-xl)", background: "var(--surface-card)", border: "2px solid var(--border-tactile)", borderBottom: "4px solid var(--border-tactile-deep)", display: "grid", gap: "var(--s-4)", width, minHeight: height, ...style }}>
      <span style={{ display: "flex", gap: "var(--s-3)", alignItems: "center" }}>
        <span style={bar(46, 46, 12)} />
        <span style={{ display: "grid", gap: 8, flex: 1 }}><span style={bar("48%", 14, 7)} /><span style={bar("30%", 10, 5)} /></span>
      </span>
      <span style={bar("100%", 12, 6)} /><span style={bar("80%", 12, 6)} />
    </div>
  );
}
