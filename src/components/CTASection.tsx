import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-20 bg-primary">
      <div className="section-container">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-4">
            Pronto para transformar sua cadeia produtiva?
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-8">
            Junte-se a centenas de produtores que já estão usando a DeFarm para garantir rastreabilidade e compliance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-background text-foreground hover:bg-background/90 font-semibold px-8 py-6 text-lg"
            >
              Começar Agora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-2 border-primary-foreground text-primary-foreground bg-transparent hover:bg-primary-foreground/10 font-semibold px-8 py-6 text-lg"
            >
              Falar com Especialista
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
