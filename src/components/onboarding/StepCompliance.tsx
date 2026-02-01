import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  ArrowRight, 
  Leaf, 
  Globe, 
  FileCheck, 
  CheckCircle2, 
  Loader2,
  AlertCircle 
} from "lucide-react";

interface ComplianceChecks {
  environmental: boolean | null;
  eudr: boolean | null;
  documentation: boolean | null;
}

interface StepComplianceProps {
  itemCount: number;
  checks: ComplianceChecks;
  onChecksComplete: (checks: ComplianceChecks) => void;
  onNext: () => void;
}

const checkConfig = [
  {
    key: "environmental" as const,
    icon: Leaf,
    label: "Verificação Ambiental",
    description: "Área sem desmatamento ilegal",
    delay: 500,
  },
  {
    key: "eudr" as const,
    icon: Globe,
    label: "Conformidade EUDR",
    description: "Elegível para mercado europeu",
    delay: 1500,
  },
  {
    key: "documentation" as const,
    icon: FileCheck,
    label: "Documentação",
    description: "Registros básicos verificados",
    delay: 2500,
  },
];

export function StepCompliance({ 
  itemCount, 
  checks, 
  onChecksComplete, 
  onNext 
}: StepComplianceProps) {
  const [currentChecks, setCurrentChecks] = useState<ComplianceChecks>({
    environmental: null,
    eudr: null,
    documentation: null,
  });
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Simulate progressive checks
    checkConfig.forEach(({ key, delay }) => {
      setTimeout(() => {
        setCurrentChecks(prev => {
          const updated = { ...prev, [key]: true };
          
          // Check if all are complete
          if (Object.values(updated).every(v => v === true)) {
            setTimeout(() => {
              setIsComplete(true);
              onChecksComplete(updated);
            }, 500);
          }
          
          return updated;
        });
      }, delay);
    });
  }, [onChecksComplete]);

  const renderCheckStatus = (status: boolean | null) => {
    if (status === null) {
      return <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />;
    }
    if (status) {
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    }
    return <AlertCircle className="w-5 h-5 text-amber-500" />;
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
          Verificando seus ativos
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Checando {itemCount} {itemCount === 1 ? "item" : "itens"} em tempo real
        </p>
      </div>

      {/* Checks */}
      <div className="flex-1 max-w-lg mx-auto w-full">
        <div className="space-y-4 mb-8">
          {checkConfig.map(({ key, icon: Icon, label, description }) => (
            <Card 
              key={key}
              className={`p-5 transition-all duration-500 ${
                currentChecks[key] === true 
                  ? "border-green-500/30 bg-green-500/5" 
                  : "border-border"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-500 ${
                  currentChecks[key] === true 
                    ? "bg-green-500/10" 
                    : "bg-muted"
                }`}>
                  <Icon className={`w-6 h-6 transition-colors duration-500 ${
                    currentChecks[key] === true 
                      ? "text-green-500" 
                      : "text-muted-foreground"
                  }`} />
                </div>
                
                <div className="flex-1">
                  <div className="font-medium text-foreground">{label}</div>
                  <div className="text-sm text-muted-foreground">{description}</div>
                </div>
                
                {renderCheckStatus(currentChecks[key])}
              </div>
            </Card>
          ))}
        </div>

        {/* Result summary */}
        {isComplete && (
          <Card className="p-6 bg-green-500/5 border-green-500/30 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Tudo verificado!
            </h3>
            <p className="text-sm text-muted-foreground">
              Seus ativos estão prontos para acessar oportunidades financeiras premium
            </p>
          </Card>
        )}
      </div>

      {/* CTA */}
      <div className="mt-8 text-center">
        <Button
          size="lg"
          onClick={onNext}
          disabled={!isComplete}
          className="px-8 py-6 text-lg font-semibold gap-2"
        >
          Ver oportunidades
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
