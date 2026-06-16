import { useTranslation } from "react-i18next";

// Faixa de integrações — credibilidade pra público técnico (banco/auditor).
// São os sistemas REAIS que a DeFarm conecta, como wordmarks sóbrios (não logo
// falso de cliente). Em produção, trocar os <span> por <img> dos logos oficiais
// quando houver assets. Decisão de marca: mostrar como logo é ok; evitar ficar
// CITANDO a tecnologia ("Stellar/registro imutável") repetidamente na copy.
const SYSTEMS = ["SISBOV", "GTA", "SICAR / SIGEF", "EUDR", "Stellar"];

export function IntegrationsStrip() {
  const { t } = useTranslation();
  return (
    <section className="border-b border-border bg-muted/40">
      <div className="section-container py-8">
        <div className="flex flex-col items-center gap-5 text-center">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {t("integ.label")}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-3">
            {SYSTEMS.map((n, i) => (
              <span key={n} className="contents">
                {i > 0 && <span className="h-1 w-1 rounded-full bg-border" />}
                <span className="font-display text-[16px] font-bold tracking-tight text-foreground/50">{n}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
