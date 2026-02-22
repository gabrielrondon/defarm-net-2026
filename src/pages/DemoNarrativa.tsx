import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, LogIn } from "lucide-react";

type Step = {
  id: string;
  actor: "producer" | "partner" | "certifier" | "processor" | "admin";
  title: string;
  objective: string;
  email: string;
  password: string;
  landingRoute: string;
  highlights: string[];
};

const steps: Step[] = [
  {
    id: "1",
    actor: "producer",
    title: "Etapa 1 - Produtor",
    objective: "Mostrar origem da operacao, propriedades, rebanho e circuitos.",
    email: "qa.producer.1771760943@defarm.net",
    password: "QaProducer#2026!",
    landingRoute: "/app/claims",
    highlights: [
      "Claims de propriedade (CAR/CPF/CNPJ)",
      "Rebanho por propriedade",
      "Circuitos e itens para rastreabilidade",
    ],
  },
  {
    id: "2",
    actor: "partner",
    title: "Etapa 2 - Parceiro de Dados",
    objective: "Demonstrar ingestao e monitoramento de dados operacionais.",
    email: "qa.partner.2026@defarm.net",
    password: "DeFarmQA#2026!",
    landingRoute: "/app/parceiro",
    highlights: [
      "Portal parceiro",
      "Fluxo de ingestao e validacao",
      "Eventos operacionais por circuito",
    ],
  },
  {
    id: "3",
    actor: "certifier",
    title: "Etapa 3 - OESA / Certificadora",
    objective: "Reforcar governanca, validacao e trilha de conformidade.",
    email: "qa.certifier.2026@defarm.net",
    password: "DeFarmQA#2026!",
    landingRoute: "/app/auditoria",
    highlights: [
      "Claims e validacao",
      "Auditoria e eventos",
      "Rastreabilidade por item e circuito",
    ],
  },
  {
    id: "4",
    actor: "processor",
    title: "Etapa 4 - Frigorifico / Processador",
    objective: "Mostrar consumo operacional de dados e rastreio de lotes.",
    email: "qa.processor.2026@defarm.net",
    password: "DeFarmQA#2026!",
    landingRoute: "/app/eventos",
    highlights: [
      "Eventos de movimentacao",
      "Itens e lote operacional",
      "Circuitos compartilhados",
    ],
  },
  {
    id: "5",
    actor: "admin",
    title: "Etapa 5 - Administracao DeFarm",
    objective: "Encerrar com governanca da plataforma e operacao central.",
    email: "qa.admin.2026@defarm.net",
    password: "DeFarmQA#2026!",
    landingRoute: "/app/admin/usuarios",
    highlights: [
      "Gestao de usuarios e workspaces",
      "Tipo de workspace e controle de acesso",
      "Fila de jobs e observabilidade",
    ],
  },
];

export default function DemoNarrativa() {
  const { actorType } = useParams<{ actorType?: string }>();
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!actorType) return steps;
    return steps.filter((step) => step.actor === actorType);
  }, [actorType]);

  const handleLogin = async (step: Step) => {
    setLoadingId(step.id);
    try {
      const challenge = await login({ email: step.email, password: step.password });
      if (challenge?.requires_2fa) {
        toast({
          title: "2FA necessario",
          description: "Este usuario exige 2FA. Abra o login preenchido para concluir.",
          variant: "destructive",
        });
        navigate(`/login?demo_email=${encodeURIComponent(step.email)}&demo_password=${encodeURIComponent(step.password)}`);
        return;
      }
      navigate(step.landingRoute);
    } catch (error) {
      toast({
        title: "Falha ao entrar na etapa",
        description: error instanceof Error ? error.message : "Erro no login da conta demo.",
        variant: "destructive",
      });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/_demo/acessos">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para painel demo
          </Link>
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Rota de Narrativa (Demo)</h1>
          <p className="text-muted-foreground mt-2">
            Sequencia pronta para apresentacao do valor por ator, com login imediato por etapa.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="secondary">/_demo/narrativa</Badge>
            <Badge variant="secondary">/_demo/narrativa/producer</Badge>
            <Badge variant="secondary">/_demo/narrativa/partner</Badge>
            <Badge variant="secondary">/_demo/narrativa/certifier</Badge>
            <Badge variant="secondary">/_demo/narrativa/processor</Badge>
            <Badge variant="secondary">/_demo/narrativa/admin</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((step, index) => (
            <Card key={step.id} className="border-border/70">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                    <CardDescription className="mt-1">{step.objective}</CardDescription>
                  </div>
                  <Badge variant="outline">{step.actor}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  {step.highlights.map((highlight) => (
                    <div key={highlight} className="text-sm text-muted-foreground">
                      • {highlight}
                    </div>
                  ))}
                </div>

                <div className="text-xs text-muted-foreground">
                  Conta: <span className="font-mono">{step.email}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => handleLogin(step)} disabled={loadingId === step.id}>
                    <LogIn className="h-4 w-4 mr-2" />
                    Entrar nesta etapa
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={step.landingRoute}>
                      Abrir tela-alvo
                    </Link>
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <Link
                      to={`/login?demo_email=${encodeURIComponent(step.email)}&demo_password=${encodeURIComponent(step.password)}`}
                    >
                      Login preenchido
                    </Link>
                  </Button>
                  {index < filtered.length - 1 && (
                    <Button size="sm" variant="ghost" asChild>
                      <Link to={`/_demo/narrativa/${filtered[index + 1].actor}`}>
                        Proxima etapa
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
