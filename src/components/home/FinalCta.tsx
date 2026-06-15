import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

// CTA final — motivo de grade sutil (satélite/ledger), sem gradiente berrante.
export function FinalCta() {
  const { t } = useTranslation();
  return (
    <section className="py-20 sm:py-28">
      <div className="section-container">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-10 text-center sm:p-14">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--foreground)/0.04) 1px,transparent 1px),linear-gradient(90deg,hsl(var(--foreground)/0.04) 1px,transparent 1px)",
              backgroundSize: "28px 28px",
              maskImage: "radial-gradient(circle at 50% 0%, black, transparent 70%)",
              WebkitMaskImage: "radial-gradient(circle at 50% 0%, black, transparent 70%)",
            }}
          />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-[30px] font-bold tracking-tight sm:text-[42px]" style={{ textWrap: "balance" }}>
              {t("home.cta.headline")}
            </h2>
            <p className="mt-4 text-[16px] text-muted-foreground" style={{ textWrap: "pretty" }}>
              {t("home.cta.desc")}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <a href="#personas">
                  {t("home.cta.primary")} <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link to="/contato">{t("home.cta.secondary")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
