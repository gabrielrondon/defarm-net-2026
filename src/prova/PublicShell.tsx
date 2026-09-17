import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/ds";
import { copy } from "./copy";

/* Casca das páginas públicas (ui_kits/publico/PublicShell.jsx): sem conta, sem sidebar, header
   mínimo com a rota visível, rodapé de uma frase. O link "Verificar qualquer registro" entra
   quando `/v/` genérico existir (hoje só `/v/:dfid`). */
export function PublicShell({ route, kicker, children, maxWidth = 980, cta }: { route: string; kicker?: string; children: ReactNode; maxWidth?: number; cta?: ReactNode }) {
  return (
    <div className="df-root" style={{ display: "grid", gridTemplateRows: "auto 1fr auto" }}>
      <a href="#conteudo" className="df-skip">{copy.kit.verify.skip}</a>
      <header className="df-no-print" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--s-4)", padding: "var(--s-4) clamp(16px, 4vw, 40px)", background: "var(--surface-card)", borderBottom: "1px solid var(--border-hair)" }}>
        <Link to="/" style={{ display: "inline-flex", textDecoration: "none" }}><Logo size={30} /></Link>
        {kicker && <span style={{ font: "var(--fw-bold) var(--fs-sm)/1 var(--font-ui)", color: "var(--text-muted)" }}>{kicker}</span>}
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--s-3)", flexWrap: "wrap" }}>
          <span style={{ font: "var(--fw-medium) var(--fs-xs)/1 var(--font-mono)", color: "var(--text-faint)" }}>defarm.net{route}</span>
          {cta}
        </span>
      </header>
      <main id="conteudo" style={{ width: "100%", maxWidth, margin: "0 auto", padding: "clamp(20px, 4vw, 40px) clamp(16px, 4vw, 24px) var(--s-10)", boxSizing: "border-box", display: "grid", gap: "var(--s-6)", alignContent: "start" }}>
        {children}
      </main>
      <footer className="df-no-print" style={{ borderTop: "1px solid var(--border-hair)", padding: "var(--s-5) clamp(16px, 4vw, 40px)", display: "flex", flexWrap: "wrap", gap: "var(--s-4)", alignItems: "center", font: "var(--fw-medium) var(--fs-xs)/1.5 var(--font-ui)", color: "var(--text-muted)" }}>
        <span style={{ flex: "1 1 320px" }}>{copy.kit.verify.footer}</span>
        <Link to="/privacidade">{copy.kit.verify.privacy}</Link>
      </footer>
    </div>
  );
}
