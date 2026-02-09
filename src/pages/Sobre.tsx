import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Target, Heart, Shield, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

const valueIcons = [Target, Heart, Shield, Users];

const Sobre = () => {
  const { t } = useTranslation();

  const stats = [0, 1, 2, 3].map(i => ({
    number: t(`about.stats.${i}.number`),
    label: t(`about.stats.${i}.label`),
  }));

  const values = [0, 1, 2, 3].map(i => ({
    icon: valueIcons[i],
    title: t(`about.values.${i}.title`),
    description: t(`about.values.${i}.description`),
  }));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero */}
        <section className="pt-32 pb-16 bg-background">
          <div className="section-container">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
                {t("about.title")} <span className="highlight-text">{t("about.titleHighlight")}</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                {t("about.subtitle")}
              </p>
            </div>
          </div>
        </section>

        {/* Story */}
        <section className="pb-20">
          <div className="section-container">
            <div className="max-w-4xl mx-auto">
              <div className="prose prose-lg">
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  {t("about.story1")}
                </p>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {t("about.story2")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-16 bg-primary">
          <div className="section-container">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-4xl sm:text-5xl font-bold text-primary-foreground mb-2">
                    {stat.number}
                  </p>
                  <p className="text-primary-foreground/80">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-20 bg-background">
          <div className="section-container">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                {t("about.valuesTitle")} <span className="highlight-text">{t("about.valuesHighlight")}</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map((value) => (
                <div
                  key={value.title}
                  className="bg-secondary/30 rounded-2xl p-8 text-center hover:shadow-md transition-shadow"
                >
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-6">
                    <value.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">
                    {value.title}
                  </h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Sobre;
