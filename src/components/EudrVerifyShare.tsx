import { QRCodeSVG } from "qrcode.react";
import { Link2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// QR + link de partilha da verificação pública da DDS. O QR/URL apontam pra
// /eudr/v/:dfid — qualquer um (importador/auditor) confere por DFID, sem login.
// Usado na DDS emitida (logado) e na própria página pública (pra partilhar/imprimir).
export function EudrVerifyShare({ dfid }: { dfid: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const url = `https://defarm.net/eudr/v/${encodeURIComponent(dfid)}`;

  const copy = () => {
    navigator.clipboard
      ?.writeText(url)
      .then(() => toast({ title: t("eudrv.link_copied") }))
      .catch(() => {});
  };

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/40 p-4">
      <span className="shrink-0 rounded-lg bg-white p-1.5">
        <QRCodeSVG value={url} size={84} level="M" fgColor="#1e6b46" bgColor="#ffffff" />
      </span>
      <div className="min-w-0">
        <div className="text-[13px] font-semibold">{t("eudrv.share_t")}</div>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">{t("eudrv.share_d")}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={copy}>
          <Link2 className="mr-1.5 h-3.5 w-3.5" />
          {t("eudrv.copy_link")}
        </Button>
      </div>
    </div>
  );
}
