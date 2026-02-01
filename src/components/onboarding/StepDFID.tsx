import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, CheckCircle2, Lock } from "lucide-react";
import { generateDFID } from "@/lib/fake-id-generator";

interface StepDFIDProps {
  identifier: string;
  dfid: string | null;
  onDFIDGenerated: (dfid: string) => void;
  onNext: () => void;
}

export function StepDFID({ identifier, dfid, onDFIDGenerated, onNext }: StepDFIDProps) {
  const [isAnimating, setIsAnimating] = useState(true);
  const [showDFID, setShowDFID] = useState(false);
  const [showCheck, setShowCheck] = useState(false);

  useEffect(() => {
    // Generate DFID if not already generated
    if (!dfid) {
      const newDFID = generateDFID();
      onDFIDGenerated(newDFID);
    }

    // Animation sequence
    const timer1 = setTimeout(() => {
      setShowDFID(true);
    }, 1000);

    const timer2 = setTimeout(() => {
      setShowCheck(true);
      setIsAnimating(false);
    }, 2000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [dfid, onDFIDGenerated]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      {/* Animation Container */}
      <div className="relative mb-10">
        {/* Shield icon with animation */}
        <div 
          className={`w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center
                      transition-all duration-700 ${isAnimating ? "scale-110 animate-pulse" : "scale-100"}`}
        >
          <Shield 
            className={`w-12 h-12 transition-colors duration-500 ${
              showCheck ? "text-primary" : "text-primary/50"
            }`} 
          />
        </div>

        {/* Check mark overlay */}
        {showCheck && (
          <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center animate-in zoom-in duration-300">
            <CheckCircle2 className="w-6 h-6 text-white" />
          </div>
        )}
      </div>

      {/* Title */}
      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
        {isAnimating ? "Registrando seu animal..." : "Animal registrado com sucesso!"}
      </h1>

      {/* Original identifier */}
      <div className="flex items-center gap-2 text-muted-foreground mb-6">
        <span className="font-mono bg-muted px-3 py-1 rounded text-sm">
          {identifier}
        </span>
      </div>

      {/* DFID Display */}
      {showDFID && dfid && (
        <div className="bg-card border border-border rounded-xl p-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Lock className="w-4 h-4" />
            <span>Registro Digital Seguro</span>
          </div>
          
          <div className="font-mono text-xl md:text-2xl font-bold text-primary tracking-wider">
            {dfid}
          </div>
          
          <p className="text-xs text-muted-foreground mt-3 max-w-sm">
            Este é o identificador único e imutável do seu animal na rede DeFarm
          </p>
        </div>
      )}

      {/* Benefits */}
      {showCheck && (
        <div className="flex flex-wrap justify-center gap-3 mb-10 animate-in fade-in duration-500 delay-300">
          <div className="flex items-center gap-2 bg-green-500/10 text-green-600 px-3 py-1.5 rounded-full text-sm">
            <CheckCircle2 className="w-4 h-4" />
            Rastreável
          </div>
          <div className="flex items-center gap-2 bg-green-500/10 text-green-600 px-3 py-1.5 rounded-full text-sm">
            <CheckCircle2 className="w-4 h-4" />
            Imutável
          </div>
          <div className="flex items-center gap-2 bg-green-500/10 text-green-600 px-3 py-1.5 rounded-full text-sm">
            <CheckCircle2 className="w-4 h-4" />
            Verificável
          </div>
        </div>
      )}

      {/* CTA */}
      <Button
        size="lg"
        onClick={onNext}
        disabled={isAnimating}
        className="px-8 py-6 text-lg font-semibold gap-2"
      >
        Ver meu portfolio
        <ArrowRight className="w-5 h-5" />
      </Button>
    </div>
  );
}
