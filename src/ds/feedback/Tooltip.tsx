import { useState, type CSSProperties, type ReactNode } from "react";

export interface TooltipProps { content: ReactNode; placement?: "top" | "bottom" | "right"; children?: ReactNode; style?: CSSProperties }

/** Graphite tooltip for jargon (DFID, commitment, BLAKE3). */
export function Tooltip({ content, placement = "top", children, style }: TooltipProps) {
  const [show, setShow] = useState(false);
  const pos: CSSProperties = {
    top: { bottom: "calc(100% + 10px)", left: "50%", transform: "translateX(-50%)" },
    bottom: { top: "calc(100% + 10px)", left: "50%", transform: "translateX(-50%)" },
    right: { left: "calc(100% + 10px)", top: "50%", transform: "translateY(-50%)" },
  }[placement] as CSSProperties;
  return (
    <span
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)} onBlur={() => setShow(false)}
      style={{ position: "relative", display: "inline-flex", ...style }}
    >
      {children}
      <span role="tooltip" style={{
        position: "absolute", zIndex: 80, ...pos, pointerEvents: "none",
        padding: "8px 12px", borderRadius: "var(--r-sm)", background: "var(--surface-ink)",
        color: "var(--text-on-ink)", font: "var(--fw-semibold) var(--fs-xs)/1.4 var(--font-ui)",
        width: "max-content", maxWidth: 240, boxShadow: "var(--elev-overlay)",
        opacity: show ? 1 : 0, transition: "opacity var(--dur-fast) linear",
      }}>{content}</span>
    </span>
  );
}
