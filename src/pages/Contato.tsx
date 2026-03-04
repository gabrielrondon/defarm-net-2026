import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Mail, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { GATEWAY_BASE } from "@/lib/api/client";

const Contato = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    message: "",
  });

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

  const onChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const submitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome, e-mail e mensagem.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${GATEWAY_BASE}/auth/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          company: form.company.trim() || null,
          role: form.role.trim() || null,
          message: form.message.trim(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.message || `Falha no envio (${res.status})`);
      }

      toast({
        title: "Mensagem enviada",
        description: "Recebemos seu contato. Vamos responder em breve.",
      });
      setForm({ name: "", email: "", company: "", role: "", message: "" });
    } catch (err) {
      toast({
        title: "Falha ao enviar",
        description: err instanceof Error ? err.message : "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
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

              <div className="rounded-xl border border-border/70 bg-card p-6">
                <h3 className="text-xl font-bold text-foreground mb-2">Fale com a DeFarm</h3>
                <p className="text-sm text-muted-foreground mb-5">
                  Para onboarding de parceiros, integrações ERP/agregadores e dúvidas comerciais.
                </p>
                <form className="space-y-4" onSubmit={submitContact}>
                  <div className="space-y-2">
                    <Label htmlFor="contact-name">Nome *</Label>
                    <Input
                      id="contact-name"
                      value={form.name}
                      onChange={(e) => onChange("name", e.target.value)}
                      placeholder="Seu nome completo"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-email">E-mail *</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => onChange("email", e.target.value)}
                      placeholder="voce@empresa.com"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact-company">Empresa</Label>
                      <Input
                        id="contact-company"
                        value={form.company}
                        onChange={(e) => onChange("company", e.target.value)}
                        placeholder="Nome da empresa"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-role">Perfil</Label>
                      <Input
                        id="contact-role"
                        value={form.role}
                        onChange={(e) => onChange("role", e.target.value)}
                        placeholder="ERP, parceiro, certificador..."
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-message">Mensagem *</Label>
                    <Textarea
                      id="contact-message"
                      value={form.message}
                      onChange={(e) => onChange("message", e.target.value)}
                      placeholder="Descreva sua necessidade e contexto de integração."
                      rows={6}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Enviando..." : "Enviar mensagem"}
                  </Button>
                </form>
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
