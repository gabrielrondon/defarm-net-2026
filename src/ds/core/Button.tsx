import { useState, type CSSProperties, type ReactNode } from "react";
import { feedback } from "./feedback";

type Variant = "primary" | "secondary" | "ghost" | "ink" | "danger" | "anchor" | "sealed";
type Size = "sm" | "md" | "lg";

const SURFACES: Record<Variant, { background: string; color: string; border: string; depth: string }> = {
  primary: { background: "var(--brand)", color: "var(--text-on-brand)", border: "transparent", depth: "var(--brand-deep)" },
  secondary: { background: "var(--surface-card)", color: "var(--text-strong)", border: "var(--border-tactile)", depth: "var(--border-tactile-deep)" },
  ghost: { background: "transparent", color: "var(--text-body)", border: "transparent", depth: "transparent" },
  ink: { background: "var(--surface-ink)", color: "var(--text-on-ink)", border: "transparent", depth: "#000" },
  danger: { background: "var(--danger)", color: "#fff", border: "transparent", depth: "var(--danger-deep)" },
  anchor: { background: "var(--anchor)", color: "#fff", border: "transparent", depth: "var(--anchor-deep)" },
  sealed: { background: "var(--sealed)", color: "#fff", border: "transparent", depth: "var(--sealed-deep)" },
};
const SIZES: Record<Size, { padding: string; height: number; fontSize: string; radius: string }> = {
  sm: { padding: "0 14px", height: 38, fontSize: "var(--fs-sm)", radius: "var(--r-md)" },
  md: { padding: "0 20px", height: 46, fontSize: "var(--fs-body)", radius: "var(--r-lg)" },
  lg: { padding: "0 28px", height: 56, fontSize: "var(--fs-lead)", radius: "var(--r-lg)" },
};

export interface ButtonProps {
  variant?: Variant; size?: Size; iconLeft?: ReactNode; iconRight?: ReactNode; fullWidth?: boolean;
  disabled?: boolean; loading?: boolean; as?: "button" | "a"; children?: ReactNode; style?: CSSProperties;
  [rest: string]: unknown;
}

/** Tactile button: 2px frame with a 4px bottom edge that compresses to 2px on press. */
export function Button({ variant = "primary", size = "md", iconLeft, iconRight, fullWidth, disabled, loading, as = "button", children, style, ...rest }: ButtonProps) {
  const [down, setDown] = useState(false);
  const s = SURFACES[variant] || SURFACES.primary;
  const z = SIZES[size] || SIZES.md;
  const El = as as "button";
  const off = disabled || loading;
  const flat = variant === "ghost";
  return (
    <El
      {...(rest as object)}
      disabled={El === "button" ? off : undefined}
      onPointerDown={() => { if (!off) { setDown(true); feedback("tap"); } }}
      onPointerUp={() => setDown(false)}
      onPointerLeave={() => setDown(false)}
      style={{
        appearance: "none", cursor: off ? "not-allowed" : "pointer",
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "var(--s-2)",
        width: fullWidth ? "100%" : "auto", minHeight: z.height, padding: z.padding,
        borderRadius: z.radius, background: s.background, color: s.color,
        borderStyle: "solid", borderColor: flat ? "transparent" : s.border,
        borderWidth: flat ? 0 : "var(--border-tactile-w)",
        borderBottomColor: flat ? "transparent" : s.depth,
        borderBottomWidth: flat ? 0 : down ? "var(--border-tactile-w)" : "var(--border-tactile-depth)",
        font: `var(--fw-bold) ${z.fontSize}/1 var(--font-ui)`, letterSpacing: "var(--ls-snug)",
        transform: down ? "translateY(2px)" : "none",
        transition: "transform var(--dur-tap) var(--ease-out), border-bottom-width var(--dur-tap) var(--ease-out)",
        opacity: off ? 0.5 : 1, whiteSpace: "nowrap", boxSizing: "border-box", textDecoration: "none",
        ...style,
      }}
    >
      {loading ? <Spinner /> : iconLeft}
      {children}
      {iconRight}
    </El>
  );
}

function Spinner() {
  return <span style={{ width: 15, height: 15, borderRadius: "var(--r-pill)", border: "2px solid currentColor", borderTopColor: "transparent", animation: "df-spin .7s linear infinite" }} />;
}
