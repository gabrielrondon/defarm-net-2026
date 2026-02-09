import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, ArrowRight, Percent, Calendar, DollarSign } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SimularTaxasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const taxasCPR = [
  { taxaMin: 11.5, taxaMax: 14.2, prazo: "12 meses", tendencia: "down" },
  { taxaMin: 10.8, taxaMax: 13.5, prazo: "6-12 meses", tendencia: "down" },
  { taxaMin: 12.0, taxaMax: 15.0, prazo: "6-12 meses", tendencia: "up" },
  { taxaMin: 13.5, taxaMax: 16.8, prazo: "12-18 meses", tendencia: "stable" },
];

export function SimularTaxasDialog({ open, onOpenChange }: SimularTaxasDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Percent className="h-6 w-6 text-primary" />
            {t("taxas.title")}
          </DialogTitle>
          <DialogDescription>
            {t("taxas.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {taxasCPR.map((taxa, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border"
            >
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">{t(`taxas.types.${idx}`)}</h4>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {taxa.prazo}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-lg font-bold text-foreground">
                      {taxa.taxaMin}% - {taxa.taxaMax}%
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{t("taxas.perYear")}</span>
                </div>
                {taxa.tendencia === "down" && (
                  <TrendingDown className="h-5 w-5 text-primary" />
                )}
                {taxa.tendencia === "up" && (
                  <TrendingUp className="h-5 w-5 text-destructive" />
                )}
                {taxa.tendencia === "stable" && (
                  <div className="h-5 w-5 flex items-center justify-center">
                    <div className="w-4 h-0.5 bg-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
          <p 
            className="text-sm text-muted-foreground mb-4"
            dangerouslySetInnerHTML={{ __html: t("taxas.promo") }}
          />
          <a href="https://cpr.defarm.net" target="_blank" rel="noopener noreferrer">
            <Button className="w-full btn-offset bg-primary hover:bg-primary text-primary-foreground font-semibold">
              {t("taxas.accessSpace")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </a>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          {t("taxas.source")}
        </p>
      </DialogContent>
    </Dialog>
  );
}
