import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Play } from "lucide-react";

export function HeroSection() {
  return (
    <section className="pt-32 pb-20 bg-background">
      <div className="section-container">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            Plataforma #1 em Rastreabilidade
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
            A plataforma de{" "}
            <span className="highlight-text">rastreabilidade agrícola</span>{" "}
            mais completa do Brasil
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Conectamos toda a cadeia produtiva com transparência, tecnologia blockchain e compliance EUDR. Do campo até a mesa do consumidor.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
            <Button
              size="lg"
              className="btn-offset bg-primary hover:bg-primary text-primary-foreground font-semibold px-8 py-6 text-lg rounded-lg"
            >
              Solicitar Demo
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              asChild
              className="btn-offset font-semibold px-8 py-6 text-lg border-2 rounded-lg"
            >
              <Link to="/solucoes">
                <Play className="mr-2 h-5 w-5" />
                Ver Soluções
              </Link>
            </Button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t border-border">
            <div>
              <p className="text-3xl sm:text-4xl font-bold text-foreground">20.000+</p>
              <p className="text-muted-foreground mt-1">Gados rastreados</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-bold text-foreground">143</p>
              <p className="text-muted-foreground mt-1">Produtores ativos</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-bold text-foreground">98%</p>
              <p className="text-muted-foreground mt-1">Satisfação</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-bold text-foreground">24/7</p>
              <p className="text-muted-foreground mt-1">Suporte dedicado</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
