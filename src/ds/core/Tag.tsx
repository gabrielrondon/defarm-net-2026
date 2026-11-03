import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

export interface TagProps extends HTMLAttributes<HTMLSpanElement> { mono?: boolean; onRemove?: () => void; icon?: ReactNode; style?: CSSProperties }

/** Removable metadata chip (SISBOV, GTA, lote ids). Monospace when `mono`. */
export function Tag({ mono, onRemove, icon, children, style, ...rest }: TagProps) {
  return (
    <span {...rest} style={{
      display: "inline-flex", alignItems: "center", gap: 6, height: 28, padding: "0 10px",
      borderRadius: "var(--r-xs)", background: "var(--surface-inset)",
      border: "1px solid var(--border-hair)", color: "var(--text-body)",
      font: mono ? "var(--text-code)" : "var(--fw-semibold) var(--fs-sm)/1 var(--font-ui)",
      ...style,
    }}>
      {icon}
      {children}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="Remover" style={{ all: "unset", cursor: "pointer", lineHeight: 0, color: "var(--text-faint)", padding: 2 }}>×</button>
      )}
    </span>
  );
}
