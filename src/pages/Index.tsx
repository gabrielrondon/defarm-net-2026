import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PlatformSwitcher } from "@/components/PlatformSwitcher";
import { CTASection } from "@/components/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <PlatformSwitcher />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
