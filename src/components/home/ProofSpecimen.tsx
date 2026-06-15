import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

// Espécime de prova — o objeto-produto recorrente (DFID + âncora + selo EUDR).
// Usado no hero e reaproveitável no verificador. Tokens-only: nenhuma cor fora
// do sistema. Os rótulos são i18n (a home é bilíngue); DFID/SISBOV/BR são dado.
export function ProofSpecimen() {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)]">
      <div className="mb-4 flex items-center justify-between border-b border-dashed border-border pb-4">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {t("home.specimen.label")}
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          {t("home.specimen.network")}: 4
        </span>
      </div>

      <div className="mb-2 flex items-center gap-2">
        <Badge variant="outline">{t("home.specimen.cattle")}</Badge>
        <Badge variant="outline">BR</Badge>
        <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          {t("home.specimen.active")}
        </span>
      </div>

      <div className="mb-1 break-all font-mono text-[15px] font-medium tracking-tight sm:text-[17px]">
        DFID-BEEF-BR-2026-001106-b0e4d7
      </div>
      <div className="mb-4 font-mono text-[12px] text-muted-foreground">SISBOV: 076000000099004</div>

      <div className="mb-4 flex items-center justify-between rounded-xl bg-muted p-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-[5px] h-2 w-2 shrink-0 rounded-[2px] bg-primary" />
          <div>
            <div className="text-[14px] font-semibold text-primary">{t("home.specimen.verified")}</div>
            <div className="font-mono text-[11px] text-muted-foreground">{t("home.specimen.anchor")}</div>
          </div>
        </div>
        <Badge className="border-transparent bg-primary/10 text-primary">EUDR ready</Badge>
      </div>
    </div>
  );
}
