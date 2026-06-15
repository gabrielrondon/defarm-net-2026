import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Landmark, TreePine, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

// Seção "A prova vira produto" (#40): os produtos-API do #112 sobre a prova
// pública — Score de crédito (pro banco) e due diligence EUDR (pro auditor).
const PRODUCTS = [
  { key: "score", icon: Landmark, to: "/contato?perfil=parceiros" },
  { key: "eudr", icon: TreePine, to: "/contato?perfil=certificadoras" },
] as const;

export function ProdutosSection() {
  const { t } = useTranslation();

  return (
    <section className="py-20 bg-muted/30">
      <div className="section-container">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <p className="text-sm font-medium text-primary mb-2">
            {t("home.produtos.eyebrow")}
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {t("home.produtos.headline")}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t("home.produtos.description")}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          {PRODUCTS.map(({ key, icon: Icon, to }) => (
            <div
              key={key}
              className="flex flex-col rounded-2xl border border-border bg-card p-7"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {t(`home.produtos.${key}.name`)}
              </h3>
              <p className="text-sm text-muted-foreground mb-6 flex-1">
                {t(`home.produtos.${key}.desc`)}
              </p>
              <Button asChild variant="outline" className="self-start">
                <Link to={to}>
                  {t(`home.produtos.${key}.cta`)}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
