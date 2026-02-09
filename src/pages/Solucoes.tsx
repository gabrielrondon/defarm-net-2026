import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Scan, Shield, Coins, QrCode, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const solutionIcons = [Scan, Shield, Coins, QrCode];

const Solucoes = () => {
  const { t } = useTranslation();

  const solutions = [0, 1, 2, 3].map(i => ({
    icon: solutionIcons[i],
    title: t(`solutions.items.${i}.title`),
    description: t(`solutions.items.${i}.description`),
    features: (t(`solutions.items.${i}.features`, { returnObjects: true }) as string[]),
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
                {t("solutions.title")} <span className="highlight-text">{t("solutions.titleHighlight")}</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                {t("solutions.subtitle")}
              </p>
            </div>
          </div>
        </section>

        {/* Solutions Grid */}
        <section className="pb-20">
          <div className="section-container">
            <div className="space-y-16">
              {solutions.map((solution, index) => (
                <div
                  key={index}
                  className={`flex flex-col lg:flex-row gap-12 items-center ${
                    index % 2 === 1 ? "lg:flex-row-reverse" : ""
                  }`}
                >
                  {/* Content */}
                  <div className="flex-1 space-y-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <solution.icon className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-3xl font-bold text-foreground">
                      {solution.title}
                    </h2>
                    <p className="text-lg text-muted-foreground">
                      {solution.description}
                    </p>
                    <ul className="space-y-3">
                      {solution.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-3">
                          <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <div className="w-2 h-2 bg-primary rounded-full" />
                          </div>
                          <span className="text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold mt-4">
                      {t("solutions.learnMore")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>

                  {/* Visual placeholder */}
                  <div className="flex-1 w-full">
                    <div className="aspect-video bg-gradient-to-br from-primary/5 to-primary/20 rounded-2xl flex items-center justify-center">
                      <solution.icon className="h-24 w-24 text-primary/30" />
                    </div>
                  </div>
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

export default Solucoes;
