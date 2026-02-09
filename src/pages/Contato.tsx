import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { useTranslation } from "react-i18next";

const Contato = () => {
  const { t } = useTranslation();

  const contactInfo = [
    {
      icon: Mail,
      title: t("contact.emailLabel"),
      value: "contato@defarm.net",
      href: "mailto:contato@defarm.net",
    },
    {
      icon: Phone,
      title: t("contact.phoneLabel"),
      value: "+55 (11) 99999-9999",
      href: "tel:+5511999999999",
    },
    {
      icon: MapPin,
      title: t("contact.addressLabel"),
      value: "São Paulo, SP - Brasil",
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              {/* Form */}
              <div className="bg-background border border-border rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  {t("contact.formTitle")}
                </h2>
                <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t("contact.name")}</Label>
                      <Input
                        id="name"
                        placeholder={t("contact.namePlaceholder")}
                        className="border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">{t("contact.email")}</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder={t("contact.emailPlaceholder")}
                        className="border-border"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">{t("contact.subject")}</Label>
                    <Input
                      id="subject"
                      placeholder={t("contact.subjectPlaceholder")}
                      className="border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">{t("contact.message")}</Label>
                    <Textarea
                      id="message"
                      placeholder={t("contact.messagePlaceholder")}
                      rows={6}
                      className="border-border resize-none"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6"
                  >
                    {t("contact.send")}
                    <Send className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </div>

              {/* Contact Info */}
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
                        <p className="text-muted-foreground">{info.value}</p>
                      </div>
                    </a>
                  ))}
                </div>

                {/* Map placeholder */}
                <div className="aspect-video bg-gradient-to-br from-primary/5 to-primary/20 rounded-2xl flex items-center justify-center">
                  <MapPin className="h-16 w-16 text-primary/30" />
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
