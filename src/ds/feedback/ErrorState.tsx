import type { CSSProperties, ReactNode } from "react";
import { Icon } from "../core/Icon";
import { Button } from "../core/Button";

export type ErrorKind = "network" | "server" | "forbidden" | "notfound" | "session" | "integrity";

/* Copy de guidelines/copy-deck.md → state.* */
const KINDS: Record<ErrorKind, { icon: string; title: string; body: string; action: string }> = {
  network: { icon: "wifi-off", title: "Sem conexão", body: "Nada foi perdido. Assim que a rede voltar, continuamos de onde parou.", action: "Tentar de novo" },
  server: { icon: "server-crash", title: "A DeFarm não respondeu", body: "O problema é nosso, não seu. Já fomos avisados. Tente de novo em instantes.", action: "Tentar de novo" },
  forbidden: { icon: "lock", title: "Você não tem acesso a isto", body: "Esta prova pertence a outra conta ou o acesso foi cortado.", action: "Voltar ao início" },
  notfound: { icon: "search-x", title: "Não encontramos", body: "O link pode ter expirado ou o acesso foi cortado por quem emitiu.", action: "Voltar ao início" },
  session: { icon: "key-round", title: "Sua sessão expirou", body: "Por segurança, você precisa se identificar de novo. Seus pedidos continuam onde estavam.", action: "Entrar de novo" },
  integrity: { icon: "shield-alert", title: "Integridade em conferência", body: "Um commitment não conferiu com a rede. Nenhuma prova nova sai até resolvermos — as existentes seguem válidas.", action: "Ver detalhe" },
};

export interface ErrorStateProps {
  kind?: ErrorKind; title?: string; body?: string | null; actionLabel?: string; onAction?: () => void;
  secondary?: ReactNode; inline?: boolean; code?: string; style?: CSSProperties;
}

/** Full-panel error. Plain language, one action, no stack trace. `inline` renders a compact strip. */
export function ErrorState({ kind = "server", title, body, actionLabel, onAction, secondary, inline, code, style }: ErrorStateProps) {
  const k = KINDS[kind] || KINDS.server;
  const danger = kind === "integrity" || kind === "forbidden";
  const tone = danger ? { bg: "var(--danger-soft)", fg: "var(--red-700)", bd: "var(--red-100)", edge: "var(--red-400)" }
    : { bg: "var(--staging-soft)", fg: "var(--amber-700)", bd: "var(--amber-300)", edge: "var(--staging-deep)" };
  if (inline) {
    return (
      <div role="alert" style={{ display: "flex", alignItems: "center", gap: "var(--s-3)", padding: "var(--s-3) var(--s-4)", borderRadius: "var(--r-md)", background: tone.bg, border: `2px solid ${tone.bd}`, borderBottom: `4px solid ${tone.edge}`, ...style }}>
        <span style={{ display: "inline-flex", color: tone.fg }}><Icon name={k.icon} size={18} /></span>
        <span style={{ flex: "1 1 auto", minWidth: 0, font: "var(--fw-semibold) var(--fs-sm)/1.35 var(--font-ui)", color: "var(--text-strong)" }}>
          {title || k.title}{body !== null && <span style={{ color: "var(--text-muted)", fontWeight: 500 }}> · {body || k.body}</span>}
        </span>
        {onAction && <Button size="sm" variant="secondary" onClick={onAction}>{actionLabel || k.action}</Button>}
      </div>
    );
  }
  return (
    <div role="alert" style={{ display: "grid", gap: "var(--s-5)", justifyItems: "center", textAlign: "center", padding: "var(--s-9) var(--s-6)", borderRadius: "var(--r-xl)", background: "var(--surface-card)", border: "2px solid var(--border-tactile)", borderBottom: "4px solid var(--border-tactile-deep)", ...style }}>
      <span style={{ width: 72, height: 72, display: "grid", placeItems: "center", borderRadius: "var(--r-lg)", background: tone.bg, color: tone.fg, borderBottom: `4px solid ${tone.edge}`, animation: "df-pop var(--dur-base) var(--ease-spring-big) both" }}><Icon name={k.icon} size={32} /></span>
      <div style={{ display: "grid", gap: "var(--s-2)", maxWidth: 440 }}>
        <h3 style={{ font: "var(--fw-bold) var(--fs-h2)/1.15 var(--font-display)", letterSpacing: "var(--ls-tight)" }}>{title || k.title}</h3>
        <p style={{ margin: 0, font: "var(--fw-medium) var(--fs-body)/1.55 var(--font-ui)", color: "var(--text-muted)" }}>{body || k.body}</p>
      </div>
      {(onAction || secondary) && (
        <div style={{ display: "flex", gap: "var(--s-3)", flexWrap: "wrap", justifyContent: "center" }}>
          {onAction && <Button onClick={onAction}>{actionLabel || k.action}</Button>}
          {secondary}
        </div>
      )}
      {code && <code style={{ font: "var(--text-code)", fontSize: "var(--fs-micro)", color: "var(--text-faint)" }}>{code}</code>}
    </div>
  );
}
