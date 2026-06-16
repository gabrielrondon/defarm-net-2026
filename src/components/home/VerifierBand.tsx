import { Search, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Faixa do verificador — sempre dark (gravidade institucional), independente do
// tema. O `.dark` no wrapper faz os tokens virarem; verde pop sobre preto.
export function VerifierBand() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [dfid, setDfid] = useState("");

  const go = () => {
    const v = dfid.trim();
    if (v) navigate(`/i/${encodeURIComponent(v)}`);
  };

  return (
    <section id="verificar" className="dark scroll-mt-20" style={{ background: "hsl(0 0% 5%)" }}>
      <div className="section-container py-20 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              <span className="text-primary">§ 04</span>
              <span className="h-px w-6 bg-border" />
              {t("home.verif.eyebrow")}
            </div>
            <h2 className="mt-3 text-[30px] font-bold tracking-tight text-foreground sm:text-[40px]" style={{ textWrap: "balance" }}>
              {t("home.verif.headline")}
            </h2>
            <p className="mt-4 max-w-md text-[16px] leading-relaxed text-muted-foreground" style={{ textWrap: "pretty" }}>
              {t("home.verif.desc")}
            </p>
          </div>
          <div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={dfid}
                  onChange={(e) => setDfid(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && go()}
                  className="h-12 pl-11 font-mono text-[13px]"
                  placeholder={t("home.verif.placeholder")}
                />
              </div>
              <Button size="lg" disabled={!dfid.trim()} onClick={go}>
                {t("home.verif.cta")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <p className="mt-3 font-mono text-[11px] text-muted-foreground">{t("home.verif.note")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
