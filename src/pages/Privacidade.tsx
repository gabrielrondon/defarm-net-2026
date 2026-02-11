import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useTranslation } from "react-i18next";

const Privacidade = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-20">
        <div className="section-container">
          <div className="max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
            <h1 className="text-3xl font-bold text-foreground mb-8">{t("footer.privacy")}</h1>

            <p className="text-muted-foreground mb-6">{t("privacy.lastUpdated")}</p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">{t("privacy.sections.intro.title")}</h2>
            <p className="text-muted-foreground mb-4">{t("privacy.sections.intro.content")}</p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">{t("privacy.sections.dataCollected.title")}</h2>
            <p className="text-muted-foreground mb-4">{t("privacy.sections.dataCollected.content")}</p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">{t("privacy.sections.usage.title")}</h2>
            <p className="text-muted-foreground mb-4">{t("privacy.sections.usage.content")}</p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">{t("privacy.sections.sharing.title")}</h2>
            <p className="text-muted-foreground mb-4">{t("privacy.sections.sharing.content")}</p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">{t("privacy.sections.security.title")}</h2>
            <p className="text-muted-foreground mb-4">{t("privacy.sections.security.content")}</p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">{t("privacy.sections.rights.title")}</h2>
            <p className="text-muted-foreground mb-4">{t("privacy.sections.rights.content")}</p>

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">{t("privacy.sections.contact.title")}</h2>
            <p className="text-muted-foreground mb-4">{t("privacy.sections.contact.content")}</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacidade;
