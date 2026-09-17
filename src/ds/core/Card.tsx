import { useState, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";

type Tone = "paper" | "sunken" | "brand" | "ink";
const TONES: Record<Tone, { background: string; border: string; depth: string }> = {
  paper: { background: "var(--surface-card)", border: "var(--border-tactile)", depth: "var(--border-tactile-deep)" },
  sunken: { background: "var(--surface-sunken)", border: "var(--border-tactile)", depth: "var(--border-tactile-deep)" },
  brand: { background: "var(--green-50)", border: "var(--green-200)", depth: "var(--green-300)" },
  ink: { background: "var(--surface-ink)", border: "transparent", depth: "#000" },
};

export interface CardProps extends HTMLAttributes<HTMLElement> {
  padding?: string; radius?: string; tone?: Tone; interactive?: boolean;
  header?: ReactNode; footer?: ReactNode; style?: CSSProperties;
}

/** Chunky paper card: 2px frame, 4px bottom edge, springs up on hover when interactive. */
export function Card({ padding = "var(--gutter-card)", radius = "var(--r-lg)", tone = "paper", interactive, header, footer, children, style, ...rest }: CardProps) {
  const [hover, setHover] = useState(false);
  const t = TONES[tone] || TONES.paper;
  const lifted = interactive && hover;
  return (
    <section
      {...rest}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        position: "relative", borderRadius: radius, padding, background: t.background,
        borderStyle: "solid", borderColor: t.border, borderWidth: "var(--border-tactile-w)",
        borderBottomColor: t.depth, borderBottomWidth: "var(--border-tactile-depth)",
        color: tone === "ink" ? "var(--text-on-ink)" : "var(--text-body)",
        transform: lifted ? "translateY(-3px)" : "none",
        boxShadow: lifted ? "0 12px 24px -16px rgba(17,24,39,.28)" : "none",
        transition: "var(--motion-lift)", cursor: interactive ? "pointer" : "default",
        boxSizing: "border-box", ...style,
      }}
    >
      {header && <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--s-4)", marginBottom: "var(--s-5)" }}>{header}</header>}
      {children}
      {footer && <footer style={{ marginTop: "var(--s-5)", paddingTop: "var(--s-4)", borderTop: "1px solid var(--border-hair)" }}>{footer}</footer>}
    </section>
  );
}
