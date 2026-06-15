import { Link } from "react-router-dom";
import { Tag, BadgeCheck, Award, Truck, Sprout, Landmark, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

// Seção "Entre pela sua porta" (#40): as 6 personas da cadeia, cada uma com a
// sua porta de entrada. Reflete o épico #107 (landings /para/:persona). Produtor
// é self-serve (/cadastro); parceiro tem captura de interesse (sem landing).
const PERSONAS = [
  { key: "produtor", icon: Sprout, to: "/cadastro" },
  { key: "rastreador", icon: Tag, to: "/para/rastreadores" },
  { key: "certificadora", icon: BadgeCheck, to: "/para/certificadoras" },
  { key: "frigorifico", icon: Award, to: "/para/frigorificos" },
  { key: "oesa", icon: Truck, to: "/para/oesas" },
  { key: "parceiro", icon: Landmark, to: "/contato?perfil=parceiros" },
] as const;

export function PersonasSection() {
  const { t } = useTranslation();

  return (
    <section id="personas" className="py-20 scroll-mt-20">
      <div className="section-container">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <p className="text-sm font-medium text-primary mb-2">
            {t("home.personas.eyebrow")}
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {t("home.personas.headline")}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t("home.personas.description")}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {PERSONAS.map(({ key, icon: Icon, to }) => (
            <Link
              key={key}
              to={to}
              className="group rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/50 hover:bg-muted/30"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                {t(`home.personas.${key}.name`)}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t(`home.personas.${key}.desc`)}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
