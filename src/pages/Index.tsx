import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SurfaceHero } from "@/components/home/SurfaceHero";
import { PrimitivesSection } from "@/components/home/PrimitivesSection";
import { PersonasSection } from "@/components/home/PersonasSection";
import { VerifierBand } from "@/components/home/VerifierBand";
import { ProductSection } from "@/components/home/ProductSection";
import { PartnersSection } from "@/components/PartnersSection";
import { FinalCta } from "@/components/home/FinalCta";

// Home da superfície (redesign "Ledger", #40). Ordem do Claude Design:
// hero → primitivas → personas → verificador (faixa dark) → produtos → CTA.
// PartnersSection ("trusted by", logos) mantida antes do CTA (decisão do Gabriel).
const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <SurfaceHero />
        <PrimitivesSection />
        <PersonasSection />
        <VerifierBand />
        <ProductSection />
        <PartnersSection />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
