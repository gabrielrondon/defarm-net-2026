import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Mail, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

const Contato = () => {
  const { t } = useTranslation();

  const contactInfo = [
    {
      icon: Mail,
      title: t("contact.emailLabel"),
      value: "contact@defarm.net",
      href: "mailto:contact@defarm.net",
    },
    {
      icon: MapPin,
      title: t("contact.addressLabel"),
      value: "Av. Afonso Pena, 4785, Sala 701, Santa Fé\n79.031-010 Campo Grande, Mato Grosso do Sul\nBrazil",
      href: "#",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero */}
        <section className="pt-32 pb-16 bg-background">
          <div className="section-container">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
                {t("contact.title")} <span className="highlight-text">{t("contact.titleHighlight")}</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                {t("contact.subtitle")}
              </p>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="pb-20">
          <div className="section-container">
            <div className="max-w-xl mx-auto">
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-4">
                    {t("contact.infoTitle")}
                  </h2>
                  <p className="text-muted-foreground">
                    {t("contact.infoDescription")}
                  </p>
                </div>

                <div className="space-y-6">
                  {contactInfo.map((info) => (
                    <a
                      key={info.title}
                      href={info.href}
                      className="flex items-start gap-4 p-4 bg-secondary/30 rounded-xl hover:bg-secondary/50 transition-colors"
                    >
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <info.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {info.title}
                        </h3>
                        <p className="text-muted-foreground whitespace-pre-line">{info.value}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Contato;
