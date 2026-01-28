import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  MapPin, 
  Shield, 
  Share2, 
  CheckCircle2, 
  Leaf, 
  FileCheck, 
  Globe,
  QrCode,
  Link2
} from "lucide-react";
import satelliteImage from "@/assets/satellite-farm-polygon.jpg";

interface ComoFuncionaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const steps = [
  {
    icon: MapPin,
    title: "1. Cadastre sua Propriedade",
    description: "Delimite o polígono da sua propriedade rural com coordenadas GPS precisas.",
  },
  {
    icon: QrCode,
    title: "2. Tokenize seus Itens",
    description: "Cada animal ou lote recebe um identificador único (DFID) registrado em blockchain.",
  },
  {
    icon: Link2,
    title: "3. Crie Circuitos",
    description: "Circuitos conectam diferentes participantes da cadeia com permissões controladas.",
  },
  {
    icon: Share2,
    title: "4. Compartilhe Verificações",
    description: "Gere links verificáveis para compradores, auditores e consumidores.",
  },
];

const checks = [
  { icon: Leaf, label: "Compliance Ambiental", description: "Verificação CAR, APP e Reserva Legal" },
  { icon: Shield, label: "Livre de Desmatamento", description: "Checagem automática via satélite" },
  { icon: FileCheck, label: "Documentação Sanitária", description: "GTA, vacinas e certificados" },
  { icon: Globe, label: "Compliance EUDR", description: "Rastreabilidade para exportação UE" },
];

export function ComoFuncionaDialog({ open, onOpenChange }: ComoFuncionaDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Como funciona a Rastreabilidade DeFarm
          </DialogTitle>
          <DialogDescription>
            Entenda como itens e circuitos garantem transparência do campo à mesa
          </DialogDescription>
        </DialogHeader>

        {/* Satellite Image */}
        <div className="relative rounded-lg overflow-hidden mt-4">
          <img 
            src={satelliteImage} 
            alt="Imagem de satélite com polígono de propriedade rural" 
            className="w-full h-48 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-sm text-foreground font-medium">
              Polígono georreferenciado de propriedade rural
            </p>
            <p className="text-xs text-muted-foreground">
              Coordenadas verificadas via satélite em tempo real
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="flex gap-3 p-4 bg-muted/50 rounded-lg border border-border"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <step.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-sm">{step.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Verification Checks */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Checagens Verificáveis e Compartilháveis
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {checks.map((check, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/10"
              >
                <check.icon className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{check.label}</p>
                  <p className="text-xs text-muted-foreground">{check.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
          <p className="text-sm text-muted-foreground mb-4">
            Pronto para garantir a rastreabilidade completa da sua cadeia produtiva?
          </p>
          <a href="https://circuits.defarm.net" target="_blank" rel="noopener noreferrer">
            <Button className="w-full btn-offset bg-primary hover:bg-primary text-primary-foreground font-semibold">
              Acessar Plataforma
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
