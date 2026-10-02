import type { CSSProperties, ReactNode } from "react";
import { Icon } from "../core/Icon";

const LEVELS: Record<1 | 2 | 3, { label: string; short: string; icon: string; bg: string; fg: string; edge: string; bd: string; note: string }> = {
  1: {
    label: "Chave criada", short: "Chave", icon: "user",
    bg: "var(--surface-inset)", fg: "var(--gray-600)", edge: "var(--border-tactile-deep)", bd: "var(--border-tactile)",
    note: "Sua chave vive no seu aparelho. Já lê pedidos e emite provas públicas.",
  },
  2: {
    label: "Identidade vinculada", short: "Vinculada", icon: "shield-check",
    bg: "var(--green-100)", fg: "var(--green-700)", edge: "var(--green-300)", bd: "var(--green-200)",
    note: "Seu e-CPF ou e-CNPJ assinou uma vez que a chave é sua. Bancos e frigoríficos aceitam.",
  },
  3: {
    label: "Titularidade comprovada", short: "Titularidade", icon: "landmark",
    bg: "var(--anchor-soft)", fg: "var(--blue-700)", edge: "var(--blue-300)", bd: "var(--blue-100)",
    note: "Rebanho e estabelecimento corroborados por registros oficiais.",
  },
};

export interface IdentityLevelProps { level?: 1 | 2 | 3; variant?: "pill" | "card"; action?: ReactNode; style?: CSSProperties }

/** The identity level of an account, shown on every proof so recipients can judge it. */
export function IdentityLevel({ level = 1, variant = "pill", action, style }: IdentityLevelProps) {
  const l = LEVELS[level] || LEVELS[1];
  if (variant === "pill") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 12px 5px 10px",
        borderRadius: "var(--r-pill)", background: l.bg, color: l.fg,
        border: `1.5px solid ${l.bd}`, borderBottom: `3px solid ${l.edge}`,
        font: "var(--fw-bold) var(--fs-xs)/1 var(--font-ui)", whiteSpace: "nowrap", ...style,
      }}>
        <Icon name={l.icon} size={14} />
        Nível {level} · {l.short}
      </span>
    );
  }
  return (
    <div style={{
      display: "grid", gap: "var(--s-3)", padding: "var(--s-5)", borderRadius: "var(--r-md)",
      background: l.bg, borderStyle: "solid", borderWidth: 2, borderColor: l.bd,
      borderBottomColor: l.edge, borderBottomWidth: 4, boxSizing: "border-box", ...style,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--s-3)" }}>
        <span style={{ width: 38, height: 38, flex: "0 0 auto", display: "grid", placeItems: "center", borderRadius: "var(--r-sm)", background: "rgba(255,255,255,.7)", color: l.fg }}><Icon name={l.icon} size={19} /></span>
        <div style={{ display: "grid", gap: 2, flex: "1 1 auto", minWidth: 0 }}>
          <span style={{ font: "var(--fw-bold) var(--fs-micro)/1 var(--font-ui)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase", color: l.fg, opacity: .8 }}>Nível {level} de 3</span>
          <strong style={{ font: "var(--fw-bold) var(--fs-body)/1.2 var(--font-display)", color: "var(--text-strong)" }}>{l.label}</strong>
        </div>
        <span style={{ display: "flex", gap: 4, flex: "0 0 auto" }}>
          {[1, 2, 3].map((n) => <span key={n} style={{ width: 20, height: 6, borderRadius: "var(--r-pill)", background: n <= level ? l.fg : "rgba(17,24,39,.12)" }} />)}
        </span>
      </div>
      <span style={{ font: "var(--fw-medium) var(--fs-sm)/1.45 var(--font-ui)", color: "var(--text-body)" }}>{l.note}</span>
      {action}
    </div>
  );
}
