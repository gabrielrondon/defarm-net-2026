import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Play } from "lucide-react";

const ROTATING_PHRASES = [
  { before: "Transforme seus dados de rastreabilidade em", highlight: "liquidez" },
  { before: "Organize seus ativos em uma", highlight: "caderneta digital" },
  { before: "Compartilhe seus certificados com", highlight: "quem quiser" },
  { before: "Transforme sua caderneta em", highlight: "oportunidades de crédito" },
];

export function HeroSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % ROTATING_PHRASES.length);
        setIsVisible(true);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const phrase = ROTATING_PHRASES[currentIndex];

  return (
    <section className="pt-32 pb-20 bg-background">
      <div className="section-container">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8">
            Rastreabilidade ponta a ponta
          </div>

          {/* Headline with rotating text */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6 min-h-[120px] sm:min-h-[144px] lg:min-h-[160px] flex items-center justify-center">
            <span
              className="transition-all duration-500 ease-out inline-block"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? "translateY(0)" : "translateY(12px)",
              }}
            >
              {phrase.before}{" "}
              <span className="highlight-text">{phrase.highlight}</span>
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Conectamos toda a cadeia produtiva com transparência, tecnologia blockchain e compliance EUDR. Do campo até a mesa do consumidor.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
            <Button
              size="lg"
              asChild
              className="btn-offset bg-primary hover:bg-primary text-primary-foreground font-semibold px-8 py-6 text-lg rounded-lg"
            >
              <Link to="/contato">
                Solicitar Demo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
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
          <div className="grid grid-cols-3 gap-8 pt-8 border-t border-border">
            <div>
              <p className="text-3xl sm:text-4xl font-bold text-foreground">20k+</p>
              <p className="text-muted-foreground mt-1">Animais rastreados</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-bold text-foreground">140+</p>
              <p className="text-muted-foreground mt-1">Produtores</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-bold text-foreground">5</p>
              <p className="text-muted-foreground mt-1">Parceiros integrados</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
