import { useTranslation } from "react-i18next";
import esalqtecLogo from "@/assets/partners/esalqtec.png";
import stellarLogo from "@/assets/partners/stellar.png";

const partners = [
  { name: "EsalqTec", logo: esalqtecLogo },
  { name: "Stellar Development Foundation", logo: stellarLogo },
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
        <div className="flex items-center justify-center gap-16 flex-wrap">
          {partners.map((partner) => (
            <div
              key={partner.name}
              className="flex items-center justify-center grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
            >
              <img
                src={partner.logo}
                alt={partner.name}
                className="h-10 w-auto object-contain max-w-[180px]"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
