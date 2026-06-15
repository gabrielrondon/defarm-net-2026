import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SurfaceHero } from "@/components/home/SurfaceHero";
import { PersonasSection } from "@/components/home/PersonasSection";
import { PrimitivasSection } from "@/components/home/PrimitivasSection";
import { VerificadorSection } from "@/components/home/VerificadorSection";
import { ProdutosSection } from "@/components/home/ProdutosSection";
import { PlatformSwitcher } from "@/components/PlatformSwitcher";
import { PartnersSection } from "@/components/PartnersSection";
import { CTASection } from "@/components/CTASection";

// Home da superfície (#40): tese do agro no topo (hero + personas + primitivas
// + verificador + produtos), e o PlatformSwitcher existente preservado como
// seção mais abaixo (plataformas: rastreio / financeiro / devs).
const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <SurfaceHero />
        <PersonasSection />
        <PrimitivasSection />
        <VerificadorSection />
        <ProdutosSection />
        <PlatformSwitcher />
        <PartnersSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
