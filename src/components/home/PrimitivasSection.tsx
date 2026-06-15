import { Fingerprint, PenLine, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

// Seção "Como funciona" (#40): as 3 primitivas do modelo (identidade, evento
// assinado, verificação pública) — a base sobre a qual todas as personas operam.
const PRIMITIVES = [
  { key: "identidade", icon: Fingerprint },
  { key: "evento", icon: PenLine },
  { key: "verificacao", icon: ShieldCheck },
] as const;

export function PrimitivasSection() {
  const { t } = useTranslation();

  return (
    <section className="py-20 bg-muted/30">
      <div className="section-container">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <p className="text-sm font-medium text-primary mb-2">
            {t("home.primitivas.eyebrow")}
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {t("home.primitivas.headline")}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t("home.primitivas.description")}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {PRIMITIVES.map(({ key, icon: Icon }, i) => (
            <div key={key} className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-mono text-muted-foreground">
                  0{i + 1}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                {t(`home.primitivas.${key}.name`)}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t(`home.primitivas.${key}.desc`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
