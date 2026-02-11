import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Scan, Shield, Coins, QrCode, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const solutionIcons = [Scan, Shield, Coins, QrCode];

const solutionAccents = [
  { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-600", dot: "bg-emerald-500" },
  { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-600", dot: "bg-blue-500" },
  { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-600", dot: "bg-amber-500" },
  { bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-600", dot: "bg-violet-500" },
];

const Solucoes = () => {
  const { t } = useTranslation();

  const solutions = [0, 1, 2, 3].map(i => ({
    icon: solutionIcons[i],
    accent: solutionAccents[i],
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
            <div className="space-y-24">
              {solutions.map((solution, index) => (
                <div
                  key={index}
                  className={`flex flex-col lg:flex-row gap-12 items-center ${
                    index % 2 === 1 ? "lg:flex-row-reverse" : ""
                  }`}
                >
                  {/* Content */}
                  <div className="flex-1 space-y-6">
                    <div className={`w-14 h-14 ${solution.accent.bg} rounded-xl flex items-center justify-center`}>
                      <solution.icon className={`h-7 w-7 ${solution.accent.text}`} />
                    </div>
                    <h2 className="text-3xl font-bold text-foreground">
                      {solution.title}
                    </h2>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      {solution.description}
                    </p>
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold mt-4">
                      {t("solutions.learnMore")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>

                  {/* Feature card instead of placeholder */}
                  <div className="flex-1 w-full">
                    <div className={`rounded-2xl border ${solution.accent.border} bg-card p-8 space-y-4`}>
                      {solution.features.map((feature) => (
                        <div
                          key={feature}
                          className="flex items-start gap-4 p-4 rounded-xl bg-background border border-border"
                        >
                          <div className={`w-8 h-8 ${solution.accent.bg} rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}>
                            <Check className={`h-4 w-4 ${solution.accent.text}`} />
                          </div>
                          <span className="text-foreground font-medium">{feature}</span>
                        </div>
                      ))}
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
