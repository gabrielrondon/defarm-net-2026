import { useTranslation } from "react-i18next";
import esalqtecLogo from "@/assets/partners/esalqtec.png";
import stellarLogo from "@/assets/partners/stellar.png";
import rbbLogo from "@/assets/partners/rbb.png";
import cowproLogo from "@/assets/partners/cowpro.png";
import gerbovLogo from "@/assets/partners/gerbov.png";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const partners = [
  { name: "EsalqTec", logo: esalqtecLogo, relationKey: "esalqtec" as const, url: "https://esalqtec.com.br/incubadas-e-associadas/", height: "h-9" },
  { name: "Stellar Development Foundation", logo: stellarLogo, relationKey: "stellar" as const, url: undefined, height: "h-10" },
  { name: "Rede Blockchain Brasil", logo: rbbLogo, relationKey: "rbb" as const, url: "https://rbb.defarm.net", height: "h-8" },
  { name: "Cow Pro", logo: cowproLogo, relationKey: "cowpro" as const, url: undefined, height: "h-8" },
  { name: "Gerbov", logo: gerbovLogo, relationKey: "gerbov" as const, url: "https://gerbov.com.br", height: "h-9" },
];

export function PartnersSection() {
  const { t, i18n } = useTranslation();
  const isEn = !i18n.language?.startsWith("pt");

  return (
    <section className="py-12 border-t border-border bg-background">
      <div className="section-container">
        <p className="text-center text-sm font-medium text-muted-foreground mb-8 uppercase tracking-wider">
          {isEn ? "Trusted by" : "Parceiros"}
        </p>
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center justify-center gap-16 flex-wrap">
            {partners.map((partner) => {
              const relation = t(`partners.${partner.relationKey}`);
              const inner = (
                <div
                  className="flex items-center justify-center grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-pointer"
                >
                  <img
                    src={partner.logo}
                    alt={partner.name}
                    className="h-10 w-auto object-contain max-w-[180px]"
                  />
                </div>
              );

              return (
                <Tooltip key={partner.name}>
                  <TooltipTrigger asChild>
                    {partner.url ? (
                      <a href={partner.url} target="_blank" rel="noopener noreferrer">
                        {inner}
                      </a>
                    ) : (
                      <div>{inner}</div>
                    )}
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs font-medium">{relation}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </div>
    </section>
  );
}
