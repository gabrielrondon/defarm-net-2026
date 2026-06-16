import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

// "Entre pela sua porta" — 6 personas da cadeia.
// Originalidade: SEM ícone-lucide-em-chip. Cada persona é um CÓDIGO DE REGISTRO
// em mono (carimbo de cartório/passaporte) — coerente com a tese (tudo tem ID).
// Rotas reais do repo preservadas.
const PERSONAS = [
  { key: "produtor", code: "PRD", to: "/cadastro" },
  { key: "rastreador", code: "RST", to: "/para/rastreadores" },
  { key: "certificadora", code: "CRT", to: "/para/certificadoras" },
  { key: "frigorifico", code: "FRG", to: "/para/frigorificos" },
  { key: "oesa", code: "OSA", to: "/para/oesas" },
  { key: "parceiro", code: "BNC", to: "/contato?perfil=parceiros" },
] as const;

export function PersonasSection() {
  const { t } = useTranslation();
  return (
    <section id="personas" className="scroll-mt-20 py-20 sm:py-24">
      <div className="section-container">
        <div className="mb-12 max-w-2xl">
          <div className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <span className="text-primary">§ 03</span>
            <span className="h-px w-6 bg-border" />
            {t("home.personas.eyebrow")}
          </div>
          <h2 className="mt-3 text-[30px] font-bold tracking-tight sm:text-[38px]" style={{ textWrap: "balance" }}>
            {t("home.personas.headline")}
          </h2>
          <p className="mt-3 text-[16px] text-muted-foreground" style={{ textWrap: "pretty" }}>
            {t("home.personas.desc")}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PERSONAS.map(({ key, code, to }) => (
            <Link
              key={key}
              to={to}
              className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)]"
            >
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md border border-border font-mono text-[13px] font-semibold tracking-[0.08em] text-foreground/75 transition-colors group-hover:border-primary/50 group-hover:text-primary">
                  {code}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[17px] font-semibold">{t(`home.personas.${key}.name`)}</h3>
                    <span className="font-mono text-[14px] text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary">
                      &rarr;
                    </span>
                  </div>
                  <p className="mt-1 text-[14px] leading-snug text-muted-foreground">{t(`home.personas.${key}.desc`)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
