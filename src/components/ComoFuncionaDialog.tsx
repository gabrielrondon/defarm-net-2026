import { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  ArrowLeft,
  MapPin, 
  QrCode,
  Link2,
  Share2,
  CheckCircle2,
  Leaf,
  Shield,
  FileCheck,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";
import satelliteImage from "@/assets/satellite-farm-polygon.jpg";

interface ComoFuncionaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const steps = [
  {
    id: 1,
    icon: MapPin,
    title: "Cadastre sua Propriedade",
    subtitle: "Georreferenciamento preciso",
    description: "Delimite o polígono da sua propriedade rural com coordenadas GPS.",
    visual: "satellite",
    color: "from-primary/20 to-primary/5",
  },
  {
    id: 2,
    icon: QrCode,
    title: "Tokenize seus Itens",
    subtitle: "Identificador único blockchain",
    description: "Cada animal ou lote recebe um DFID registrado em blockchain imutável.",
    visual: "token",
    color: "from-primary/20 to-primary/5",
  },
  {
    id: 3,
    icon: Link2,
    title: "Crie Circuitos",
    subtitle: "Conecte a cadeia produtiva",
    description: "Circuitos conectam participantes com permissões controladas.",
    visual: "circuit",
    color: "from-primary/20 to-primary/5",
  },
  {
    id: 4,
    icon: Share2,
    title: "Compartilhe Verificações",
    subtitle: "Transparência total",
    description: "Gere links verificáveis para compradores, auditores e consumidores.",
    visual: "share",
    color: "from-primary/20 to-primary/5",
  },
  {
    id: 5,
    icon: CheckCircle2,
    title: "Checagens Verificáveis",
    subtitle: "Compliance automático",
    description: "Todas as checagens socioambientais em um só lugar.",
    visual: "checks",
    color: "from-primary/20 to-primary/5",
  },
];

const checks = [
  { icon: Leaf, label: "Compliance Ambiental" },
  { icon: Shield, label: "Livre de Desmatamento" },
  { icon: FileCheck, label: "Documentação Sanitária" },
  { icon: Globe, label: "Compliance EUDR" },
];

// Visual illustrations for each step
function StepVisual({ type }: { type: string }) {
  if (type === "satellite") {
    return (
      <div className="relative rounded-2xl overflow-hidden">
        <img 
          src={satelliteImage} 
          alt="Propriedade rural" 
          className="w-full h-40 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
        <div className="absolute bottom-3 left-3 flex items-center gap-2 text-xs text-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full">
          <MapPin className="h-3 w-3 text-primary" />
          Polígono verificado
        </div>
      </div>
    );
  }

  if (type === "token") {
    return (
      <div className="flex items-center justify-center h-40 bg-gradient-to-br from-muted/50 to-muted rounded-2xl">
        <div className="relative">
          <div className="w-24 h-24 bg-background rounded-2xl shadow-lg flex items-center justify-center border border-border">
            <QrCode className="h-12 w-12 text-primary" />
          </div>
          <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">
            DFID
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full border border-border">
            #A7B2C4
          </div>
        </div>
      </div>
    );
  }

  if (type === "circuit") {
    return (
      <div className="flex items-center justify-center h-40 bg-gradient-to-br from-muted/50 to-muted rounded-2xl px-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-background rounded-xl shadow flex items-center justify-center border border-border">
            <span className="text-lg">🐄</span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="w-8 h-0.5 bg-primary rounded-full" />
            <div className="w-8 h-0.5 bg-primary/50 rounded-full" />
          </div>
          <div className="w-12 h-12 bg-background rounded-xl shadow flex items-center justify-center border border-border">
            <span className="text-lg">🏭</span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="w-8 h-0.5 bg-primary rounded-full" />
            <div className="w-8 h-0.5 bg-primary/50 rounded-full" />
          </div>
          <div className="w-12 h-12 bg-background rounded-xl shadow flex items-center justify-center border border-border">
            <span className="text-lg">🛒</span>
          </div>
        </div>
      </div>
    );
  }

  if (type === "share") {
    return (
      <div className="flex items-center justify-center h-40 bg-gradient-to-br from-muted/50 to-muted rounded-2xl">
        <div className="relative">
          <div className="w-48 bg-background rounded-xl shadow-lg p-3 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs font-medium text-foreground">Link Verificável</span>
            </div>
            <div className="bg-muted rounded-lg p-2 text-xs text-muted-foreground font-mono truncate">
              defarm.net/v/a7b2c4
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === "checks") {
    return (
      <div className="grid grid-cols-2 gap-2 h-40">
        {checks.map((check, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 bg-background rounded-xl p-3 border border-border shadow-sm"
          >
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <check.icon className="h-4 w-4 text-primary" />
            </div>
            <span className="text-xs font-medium text-foreground leading-tight">{check.label}</span>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

export function ComoFuncionaDialog({ open, onOpenChange }: ComoFuncionaDialogProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  const handleNext = () => {
    if (isLast) {
      window.open("https://circuits.defarm.net", "_blank");
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setCurrentStep(0);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-6 pb-4">
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                idx === currentStep 
                  ? "w-6 bg-primary" 
                  : idx < currentStep 
                    ? "bg-primary/50" 
                    : "bg-muted-foreground/20"
              )}
            />
          ))}
        </div>

        {/* Card content */}
        <div className="px-6 pb-6">
          {/* Step header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <step.icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                Passo {step.id} de {steps.length}
              </p>
              <h3 className="text-lg font-bold text-foreground">{step.title}</h3>
            </div>
          </div>

          {/* Visual */}
          <div className="mb-4">
            <StepVisual type={step.visual} />
          </div>

          {/* Description */}
          <p className="text-muted-foreground text-sm mb-6">
            {step.description}
          </p>

          {/* Navigation */}
          <div className="flex gap-3">
            {!isFirst && (
              <Button
                variant="outline"
                onClick={handlePrev}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            )}
            <Button
              onClick={handleNext}
              className={cn(
                "flex-1 btn-offset bg-primary hover:bg-primary text-primary-foreground",
                isFirst && "w-full"
              )}
            >
              {isLast ? "Acessar Plataforma" : "Próximo"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
