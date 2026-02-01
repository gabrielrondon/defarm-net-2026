import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  ArrowRight, 
  FileText, 
  Landmark, 
  TrendingUp, 
  CheckCircle2,
  Lock,
  Sparkles
} from "lucide-react";

interface StepFinanceProps {
  itemCount: number;
  onSave: () => void;
}

const opportunities = [
  {
    id: "cpr",
    icon: FileText,
    title: "CPR Digital",
    description: "Emita uma Cédula de Produto Rural com seus ativos como garantia",
    requirements: [
      { label: "Ativos registrados", met: true },
      { label: "Compliance verificado", met: true },
      { label: "Dados da propriedade", met: false },
    ],
    highlight: "Taxa a partir de 1.2% a.m.",
    available: true,
  },
  {
    id: "finance",
    icon: Landmark,
    title: "Financiamento Rural",
    description: "Acesse crédito com taxas diferenciadas usando seu portfolio",
    requirements: [
      { label: "Ativos registrados", met: true },
      { label: "Compliance verificado", met: true },
      { label: "Histórico de produção", met: false },
    ],
    highlight: "Até R$ 500 mil",
    available: true,
  },
  {
    id: "premium",
    icon: TrendingUp,
    title: "Mercado Premium",
    description: "Venda direta para frigoríficos e exportadores premium",
    requirements: [
      { label: "Ativos registrados", met: true },
      { label: "EUDR compliant", met: true },
      { label: "Certificações extras", met: false },
    ],
    highlight: "+15% no preço",
    available: true,
  },
];

export function StepFinance({ itemCount, onSave }: StepFinanceProps) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          Desbloqueado
        </div>
        
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
          Suas oportunidades
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Com {itemCount} {itemCount === 1 ? "ativo verificado" : "ativos verificados"}, você pode acessar:
        </p>
      </div>

      {/* Opportunities */}
      <div className="flex-1 max-w-lg mx-auto w-full">
        <div className="space-y-4 mb-8">
          {opportunities.map((opp, index) => (
            <Card 
              key={opp.id}
              className="p-5 hover:border-primary/50 transition-all cursor-pointer animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <opp.icon className="w-6 h-6 text-primary" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{opp.title}</h3>
                    <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full">
                      {opp.highlight}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{opp.description}</p>
                  
                  <div className="flex flex-wrap gap-2">
                    {opp.requirements.map((req, i) => (
                      <div 
                        key={i}
                        className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
                          req.met 
                            ? "bg-green-500/10 text-green-600" 
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {req.met ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <Lock className="w-3 h-3" />
                        )}
                        {req.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* CTA Card */}
        <Card className="p-6 bg-primary/5 border-primary/20 text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Pronto para começar?
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Crie sua conta para salvar seu portfolio e acessar todas as oportunidades
          </p>
          
          <Button
            size="lg"
            onClick={onSave}
            className="px-8 py-6 text-lg font-semibold gap-2 w-full sm:w-auto"
          >
            Salvar meu portfolio
            <ArrowRight className="w-5 h-5" />
          </Button>
        </Card>
      </div>
    </div>
  );
}
