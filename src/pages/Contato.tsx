import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { GATEWAY_BASE } from "@/lib/api/client";

// /contato (captura de interesse) — visual Ledger v2 (chunk 2).
// VISUAL do design; LÓGICA real preservada: POST /auth/contact + honeypot +
// validação + toast. Melhoria: lê ?perfil (das portas de persona) e pré-seleciona.

const PROFILE_KEYS = ["produtores", "rastreadores", "certificadoras", "frigorificos", "oesas", "parceiros", "outro"] as const;

export default function Contato() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const perfil = params.get("perfil") || "";
  const preselected = PROFILE_KEYS.includes(perfil as never) ? perfil : "";

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    role: preselected,
    website: "", // honeypot
    message: "",
  });

  const onChange = (field: keyof typeof form, value: string) => setForm((p) => ({ ...p, [field]: value }));
  const profileLabel = (k: string) => t(`contact.profile.${k}`);

  const submitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast({ title: "Campos obrigatórios", description: "Preencha nome, e-mail e mensagem.", variant: "destructive" });
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
          website: form.website.trim() || null,
          message: form.message.trim(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || `Falha no envio (${res.status})`);
      setSubmitted(true);
      setForm({ name: "", email: "", company: "", role: preselected, website: "", message: "" });
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
      <main className="py-14 sm:py-20">
        <div className="section-container max-w-5xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <div className="inline-flex items-center gap-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-primary">
              <span className="h-px w-5 bg-primary/40" />
              {t("contact.eyebrow")}
              <span className="h-px w-5 bg-primary/40" />
            </div>
            <h1 className="mt-4 text-[34px] font-bold tracking-[-0.03em] sm:text-[44px]" style={{ textWrap: "balance" }}>
              {t("contact.title_a")}
              <span className="text-primary">{t("contact.title_em")}</span>
            </h1>
            <p className="mt-3 text-[17px] text-muted-foreground" style={{ textWrap: "pretty" }}>
              {t("contact.sub")}
            </p>
          </div>

          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            {/* info */}
            <div>
              <h2 className="text-[18px] font-semibold">{t("contact.info_title")}</h2>
              <p className="mt-2 max-w-xs text-[14.5px] leading-relaxed text-muted-foreground">{t("contact.info_sub")}</p>
              <div className="mt-7 space-y-px overflow-hidden rounded-2xl border border-border bg-border">
                <a href="mailto:contact@defarm.net" className="block bg-card p-4 transition-colors hover:bg-muted/40">
                  <div className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {t("contact.email_label")}
                  </div>
                  <div className="mt-1 font-mono text-[14px]">contact@defarm.net</div>
                </a>
                <div className="bg-card p-4">
                  <div className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {t("contact.addr_label")}
                  </div>
                  <div className="mt-1 text-[14px] leading-snug">{t("contact.addr_value")}</div>
                </div>
              </div>
            </div>

            {/* form */}
            <div className="rounded-2xl border border-border bg-card p-7">
              <h2 className="text-[18px] font-semibold">{t("contact.form_title")}</h2>
              <p className="mt-1.5 text-[14px] text-muted-foreground">{t("contact.form_sub")}</p>

              {preselected && (
                <div
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 text-[12.5px]"
                  style={{ color: "hsl(var(--primary-deep))" }}
                >
                  <span className="font-mono text-[10.5px] uppercase tracking-wider">{t("contact.prefill")}</span>
                  <b className="font-semibold">{profileLabel(preselected)}</b>
                </div>
              )}

              {submitted ? (
                <div className="mt-6 rounded-xl border border-border bg-muted/50 p-8 text-center">
                  <div className="text-[16px] font-semibold">{t("contact.success_t")}</div>
                  <div className="mt-1 text-[13.5px] text-muted-foreground">{t("contact.success_d")}</div>
                </div>
              ) : (
                <form className="mt-6 space-y-4" onSubmit={submitContact}>
                  {/* honeypot */}
                  <div className="hidden" aria-hidden="true">
                    <Label htmlFor="contact-website">Website</Label>
                    <Input id="contact-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => onChange("website", e.target.value)} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-name">{t("contact.f_name")} *</Label>
                      <Input id="contact-name" placeholder={t("contact.ph_name")} value={form.name} onChange={(e) => onChange("name", e.target.value)} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-email">{t("contact.f_email")} *</Label>
                      <Input id="contact-email" type="email" placeholder={t("contact.ph_email")} value={form.email} onChange={(e) => onChange("email", e.target.value)} required />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-company">{t("contact.f_company")}</Label>
                      <Input id="contact-company" placeholder={t("contact.ph_company")} value={form.company} onChange={(e) => onChange("company", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-role">{t("contact.f_profile")}</Label>
                      <Select value={form.role || undefined} onValueChange={(v) => onChange("role", v)}>
                        <SelectTrigger id="contact-role">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROFILE_KEYS.map((k) => (
                            <SelectItem key={k} value={k}>
                              {profileLabel(k)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-message">{t("contact.f_message")} *</Label>
                    <Textarea id="contact-message" rows={4} placeholder={t("contact.ph_message")} value={form.message} onChange={(e) => onChange("message", e.target.value)} required />
                  </div>
                  <Button type="submit" size="lg" className="w-full" disabled={loading}>
                    {loading ? "..." : t("contact.submit")} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
