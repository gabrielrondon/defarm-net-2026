import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, LogIn, Play } from "lucide-react";
import {
  DEMO_NARRATIVE_ORDER,
  type DemoActor,
  clearDemoNarrativeState,
  getDemoActorById,
  writeDemoNarrativeState,
} from "@/lib/demo-narrative";

type NarrativeStep = {
  id: string;
  actor: DemoActor["id"];
  title: string;
  objective: string;
  highlights: string[];
  account: DemoActor;
};

const NARRATIVE_META: Record<DemoActor["id"], Omit<NarrativeStep, "id" | "actor" | "account">> = {
  producer: {
    title: "Etapa 1 - Produtor",
    objective: "A origem: o dono do rebanho e os animais que vão ganhar identidade.",
    highlights: [
      "Caderneta do rebanho e propriedades",
      "Cada animal com identidade tokenizada (DFID)",
      "A prova que se acumula no animal abre o mercado premium",
    ],
  },
  tracker: {
    title: "Etapa 2 - Rastreadora SISBOV",
    objective: "A identidade na cria: emitir os brincos tokenizados (Brinco Studio).",
    highlights: [
      "Cola números SISBOV em lote → cada um vira um DFID",
      "QR pronto pra imprimir e aplicar no animal",
      "Identidade única e permanente, ancorada on-chain (trust 80)",
    ],
  },
  certifier: {
    title: "Etapa 3 - Certificadora",
    objective: "Qualificar o atributo: emitir atestado on-chain (Certificate Studio).",
    highlights: [
      "Atesta o animal pelo DFID (raça, orgânico, EUDR...)",
      "Aparece no verificador com o nome da certificadora",
      "Falsificação criptograficamente impossível (trust 75)",
    ],
  },
  processor: {
    title: "Etapa 4 - Frigorífico",
    objective: "Pagar o prêmio: conceder o selo de bonificação (Selo Studio).",
    highlights: [
      "Concede selo a um animal pelo DFID",
      "Prova pública com o nome do frigorífico",
      "Vira o pagador da Camada 2 (trust 60)",
    ],
  },
  government: {
    title: "Etapa 5 - OESA / Órgão sanitário",
    objective: "Carimbar a GTA e ver fraude: OESA Studio + Painel.",
    highlights: [
      "Carimba a movimentação pela GTA (prova pública, trust 100)",
      "Painel com agregados + alertas de fraude",
      "GTA duplicada / movimentação simultânea do mesmo animal",
    ],
  },
  partner: {
    title: "Etapa 6 - Parceiro / Banco",
    objective: "Consumir a rede: score de crédito, verificação, ingestão via API.",
    highlights: [
      "Score de crédito por DFID (CPF/CCIR)",
      "Verificação pública do ativo",
      "Portal parceiro e ingestão de dados",
    ],
  },
  admin: {
    title: "Etapa 7 - Administração DeFarm",
    objective: "Encerrar com a governança da plataforma e operação central.",
    highlights: [
      "Gestão de usuários, workspaces e entitlements",
      "Tipo de workspace e controle de acesso",
      "Fila de jobs e observabilidade",
    ],
  },
};

export default function DemoNarrativa() {
  const { actorType } = useParams<{ actorType?: string }>();
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const steps = useMemo<NarrativeStep[]>(() => {
    return DEMO_NARRATIVE_ORDER.map((actorId, idx) => {
      const account = getDemoActorById(actorId)!;
      const meta = NARRATIVE_META[actorId];
      return {
        id: String(idx + 1),
        actor: actorId,
        account,
        ...meta,
      };
    });
  }, []);

  const filtered = useMemo(() => {
    if (!actorType) return steps;
    return steps.filter((step) => step.actor === actorType);
  }, [actorType, steps]);

  const loginStep = async (step: NarrativeStep) => {
    setLoadingId(step.id);
    try {
      const challenge = await login({ email: step.account.email, password: step.account.password });
      if (challenge?.requires_2fa) {
        toast({
          title: "2FA necessario",
          description: "Este usuario exige 2FA. Abra o login preenchido para concluir.",
          variant: "destructive",
        });
        navigate(
          `/login?demo_email=${encodeURIComponent(step.account.email)}&demo_password=${encodeURIComponent(step.account.password)}`
        );
        return;
      }
      navigate(step.account.defaultRoute);
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

  const startPresentationMode = async () => {
    const first = steps[0];
    if (!first) return;
    clearDemoNarrativeState();
    writeDemoNarrativeState({ enabled: true, index: 0 });
    await loginStep(first);
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
            <Badge variant="secondary">/_demo/narrativa/government</Badge>
            <Badge variant="secondary">/_demo/narrativa/admin</Badge>
          </div>
          <div className="mt-3">
            <Button onClick={startPresentationMode}>
              <Play className="h-4 w-4 mr-2" />
              Iniciar modo apresentacao (sequencial)
            </Button>
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
                  Conta: <span className="font-mono">{step.account.email}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => loginStep(step)} disabled={loadingId === step.id}>
                    <LogIn className="h-4 w-4 mr-2" />
                    Entrar nesta etapa
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={step.account.defaultRoute}>
                      Abrir tela-alvo
                    </Link>
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <Link
                      to={`/login?demo_email=${encodeURIComponent(step.account.email)}&demo_password=${encodeURIComponent(step.account.password)}`}
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
