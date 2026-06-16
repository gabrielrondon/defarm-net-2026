import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BandChip } from "@/components/proof";

// "A prova vira produto" — teasers do Score e do EUDR.
// A MARCA de cada card é o artefato real (banda B·61 / selo EUDR), não um ícone.
export function ProductSection() {
  const { t } = useTranslation();
  return (
    <section className="bg-muted/50 py-20 sm:py-24">
      <div className="section-container">
        <div className="mb-12 max-w-2xl">
          <div className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <span className="text-primary">§ 05</span>
            <span className="h-px w-6 bg-border" />
            {t("home.prod.eyebrow")}
          </div>
          <h2 className="mt-3 text-[30px] font-bold tracking-tight sm:text-[38px]" style={{ textWrap: "balance" }}>
            {t("home.prod.headline")}
          </h2>
          <p className="mt-3 text-[16px] text-muted-foreground" style={{ textWrap: "pretty" }}>
            {t("home.prod.desc")}
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Score */}
          <div className="flex flex-col rounded-2xl border border-border bg-card p-8">
            <div className="mb-6 flex min-h-[2rem] items-center justify-end gap-2">
              <BandChip band="B" />
              <span className="font-mono text-[12px] text-muted-foreground">61/100</span>
            </div>
            <h3 className="mb-2 text-[22px] font-bold tracking-tight">{t("home.prod.score_t")}</h3>
            <p className="mb-7 text-[15px] leading-relaxed text-muted-foreground" style={{ textWrap: "pretty" }}>
              {t("home.prod.score_d")}
            </p>
            <div className="mt-auto">
              <Button asChild variant="outline">
                <Link to="/score">
                  {t("home.prod.score_cta")} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* EUDR */}
          <div className="flex flex-col rounded-2xl border border-border bg-card p-8">
            <div className="mb-6 flex min-h-[2rem] items-center justify-end">
              <Badge className="border-transparent bg-primary/10 text-primary">{t("eudr.ready")}</Badge>
            </div>
            <h3 className="mb-2 text-[22px] font-bold tracking-tight">{t("home.prod.eudr_t")}</h3>
            <p className="mb-7 text-[15px] leading-relaxed text-muted-foreground" style={{ textWrap: "pretty" }}>
              {t("home.prod.eudr_d")}
            </p>
            <div className="mt-auto">
              <Button asChild variant="outline">
                <Link to="/eudr">
                  {t("home.prod.eudr_cta")} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
