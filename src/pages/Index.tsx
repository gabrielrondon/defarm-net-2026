import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SurfaceHero } from "@/components/home/SurfaceHero";
import { IntegrationsStrip } from "@/components/home/IntegrationsStrip";
import { PrimitivesSection } from "@/components/home/PrimitivesSection";
import { TrustModel } from "@/components/home/TrustModel";
import { PersonasSection } from "@/components/home/PersonasSection";
import { VerifierBand } from "@/components/home/VerifierBand";
import { ProductSection } from "@/components/home/ProductSection";
import { PartnersSection } from "@/components/PartnersSection";
import { FinalCta } from "@/components/home/FinalCta";

// Home da superfície (redesign "Ledger" v2). Ordem do Claude Design:
// hero (2-col com espécime rotativo) → integrações → §01 primitivas →
// §02 modelo de confiança → §03 personas → §04 verificador (dark) →
// §05 produtos → parceiros (logos, decisão do Gabriel) → CTA final.
const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <SurfaceHero />
        <IntegrationsStrip />
        <PrimitivesSection />
        <TrustModel />
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
