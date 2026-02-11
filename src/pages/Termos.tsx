import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useTranslation } from "react-i18next";

const Termos = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-20">
        <div className="section-container">
          <div className="max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
            <h1 className="text-3xl font-bold text-foreground mb-8">{t("footer.terms")}</h1>

            <p className="text-muted-foreground mb-6">{t("terms.lastUpdated")}</p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">{t("terms.sections.acceptance.title")}</h2>
            <p className="text-muted-foreground mb-4">{t("terms.sections.acceptance.content")}</p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">{t("terms.sections.services.title")}</h2>
            <p className="text-muted-foreground mb-4">{t("terms.sections.services.content")}</p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">{t("terms.sections.accounts.title")}</h2>
            <p className="text-muted-foreground mb-4">{t("terms.sections.accounts.content")}</p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">{t("terms.sections.ip.title")}</h2>
            <p className="text-muted-foreground mb-4">{t("terms.sections.ip.content")}</p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">{t("terms.sections.liability.title")}</h2>
            <p className="text-muted-foreground mb-4">{t("terms.sections.liability.content")}</p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">{t("terms.sections.termination.title")}</h2>
            <p className="text-muted-foreground mb-4">{t("terms.sections.termination.content")}</p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">{t("terms.sections.law.title")}</h2>
            <p className="text-muted-foreground mb-4">{t("terms.sections.law.content")}</p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">{t("terms.sections.contact.title")}</h2>
            <p className="text-muted-foreground mb-4">{t("terms.sections.contact.content")}</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Termos;
