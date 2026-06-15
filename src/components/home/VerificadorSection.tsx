import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

// Seção do verificador público (#40): a vitrine do moat. Um campo onde qualquer
// um cola um DFID e cai na página pública de prova (/i/:dfid).
export function VerificadorSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [dfid, setDfid] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = dfid.trim();
    if (v) navigate(`/i/${encodeURIComponent(v)}`);
  };

  return (
    <section id="verificar" className="py-20 scroll-mt-20">
      <div className="section-container">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-primary mb-3">
            <ShieldCheck className="h-4 w-4" />
            {t("home.verificador.eyebrow")}
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {t("home.verificador.headline")}
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            {t("home.verificador.description")}
          </p>

          <form
            onSubmit={submit}
            className="flex flex-col sm:flex-row items-stretch gap-3 max-w-xl mx-auto"
          >
            <Input
              value={dfid}
              onChange={(e) => setDfid(e.target.value)}
              placeholder={t("home.verificador.placeholder")}
              className="h-12 text-base"
              aria-label="DFID"
            />
            <Button type="submit" size="lg" disabled={!dfid.trim()} className="h-12">
              {t("home.verificador.button")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-4">
            {t("home.verificador.hint")}
          </p>
        </div>
      </div>
    </section>
  );
}
