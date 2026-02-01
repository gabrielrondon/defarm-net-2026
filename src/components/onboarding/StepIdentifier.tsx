import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Tag } from "lucide-react";
import { generateFakeId, detectIdType, type GeneratedId } from "@/lib/fake-id-generator";

interface StepIdentifierProps {
  value: string;
  onChange: (value: string, isFake: boolean) => void;
  onNext: () => void;
}

export function StepIdentifier({ value, onChange, onNext }: StepIdentifierProps) {
  const [isFake, setIsFake] = useState(false);
  const [detectedType, setDetectedType] = useState<string | null>(null);

  useEffect(() => {
    if (value) {
      const type = detectIdType(value);
      setDetectedType(type);
    } else {
      setDetectedType(null);
    }
  }, [value]);

  const handleGenerateFake = () => {
    const generated: GeneratedId = generateFakeId();
    onChange(generated.value, true);
    setIsFake(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value, false);
    setIsFake(false);
  };

  const canProceed = value.trim().length >= 3;

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-8">
        <Tag className="w-10 h-10 text-primary" />
      </div>

      {/* Title */}
      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
        Qual o número do seu animal?
      </h1>
      
      <p className="text-muted-foreground mb-10 max-w-md">
        SISBOV, brinco, lote, GTA... qualquer identificador que você já usa
      </p>

      {/* Big Input */}
      <div className="w-full max-w-lg mb-6">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder="Digite aqui..."
          autoFocus
          className="w-full text-3xl md:text-4xl font-bold text-center 
                     border-b-4 border-primary/30 bg-transparent py-4
                     focus:outline-none focus:border-primary
                     placeholder:text-muted-foreground/30
                     transition-colors"
        />
        
        {/* Detected type badge */}
        {detectedType && (
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Parece ser um {detectedType.toUpperCase()}
          </div>
        )}

        {/* Fake ID indicator */}
        {isFake && (
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-sm">
            <Sparkles className="w-3 h-3" />
            Número de exemplo gerado
          </div>
        )}
      </div>

      {/* Generate fake button */}
      <button
        onClick={handleGenerateFake}
        className="text-sm text-muted-foreground hover:text-primary transition-colors mb-10 underline underline-offset-4"
      >
        Não tenho um número? Gerar exemplo
      </button>

      {/* CTA */}
      <Button
        size="lg"
        onClick={onNext}
        disabled={!canProceed}
        className="px-8 py-6 text-lg font-semibold gap-2"
      >
        Continuar
        <ArrowRight className="w-5 h-5" />
      </Button>
    </div>
  );
}
