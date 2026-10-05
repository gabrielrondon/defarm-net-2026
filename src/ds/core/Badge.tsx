import type { CSSProperties, HTMLAttributes } from "react";

type Tone = "ok" | "anchor" | "staging" | "sealed" | "danger" | "neutral";
const TONES: Record<Tone, [string, string]> = {
  ok: ["var(--ok-soft)", "var(--green-700)"],
  anchor: ["var(--anchor-soft)", "var(--blue-700)"],
  staging: ["var(--staging-soft)", "var(--amber-700)"],
  sealed: ["var(--sealed-soft)", "var(--purple-700)"],
  danger: ["var(--danger-soft)", "var(--red-700)"],
  neutral: ["var(--paper-2)", "var(--gray-600)"],
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> { tone?: Tone; dot?: boolean; solid?: boolean; style?: CSSProperties }

/** Status pill. Optional leading dot for live states. */
export function Badge({ tone = "neutral", dot, solid, children, style, ...rest }: BadgeProps) {
  const [bg, fg] = TONES[tone] || TONES.neutral;
  return (
    <span {...rest} style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px",
      borderRadius: "var(--r-pill)", background: solid ? fg : bg, color: solid ? "#fff" : fg,
      font: "var(--fw-bold) var(--fs-xs)/1 var(--font-ui)", letterSpacing: "var(--ls-snug)",
      whiteSpace: "nowrap", ...style,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: "var(--r-pill)", background: solid ? "#fff" : fg }} />}
      {children}
    </span>
  );
}
