import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

export function CTASection() {
  const { t } = useTranslation();

  return (
    <section className="py-20 bg-primary">
      <div className="section-container">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-4">
            {t("cta.headline")}
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-8">
            {t("cta.description")}
          </p>
          <div className="flex justify-center">
            <Link to="/onboarding">
              <Button
                size="lg"
                className="btn-offset bg-background text-foreground hover:bg-background font-semibold px-8 py-6 text-lg rounded-lg"
              >
                {t("cta.primary")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
