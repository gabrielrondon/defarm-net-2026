import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, LogIn, ExternalLink } from "lucide-react";
import { DEMO_ACTORS, type DemoActor } from "@/lib/demo-narrative";

function ActorCard({ actor }: { actor: DemoActor }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState(actor.email);
  const [password, setPassword] = useState(actor.password);
  const [loading, setLoading] = useState(false);

  const loginNow = async () => {
    setLoading(true);
    try {
      const challenge = await login({ email, password });
      if (challenge?.requires_2fa) {
        toast({
          title: "2FA necessario",
          description: "Este usuario exige 2FA. Use a tela de login para concluir.",
          variant: "destructive",
        });
        navigate(`/login?demo_email=${encodeURIComponent(email)}&demo_password=${encodeURIComponent(password)}`);
        return;
      }
      navigate(actor.defaultRoute);
    } catch (error) {
      toast({
        title: "Falha no login demo",
        description: error instanceof Error ? error.message : "Erro ao autenticar conta demo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{actor.title}</CardTitle>
            <CardDescription className="mt-1">{actor.description}</CardDescription>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <Badge variant="outline">{actor.workspaceType}</Badge>
            {actor.isAdmin && <Badge>admin</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2">
          <Label htmlFor={`${actor.id}-email`}>Email</Label>
          <Input
            id={`${actor.id}-email`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${actor.id}-password`}>Senha</Label>
          <Input
            id={`${actor.id}-password`}
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" onClick={loginNow} disabled={loading}>
            <LogIn className="h-4 w-4 mr-2" />
            Entrar agora
          </Button>
          <Button
            size="sm"
            variant="outline"
            asChild
          >
            <Link to={`/login?demo_email=${encodeURIComponent(email)}&demo_password=${encodeURIComponent(password)}`}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir login preenchido
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DemoAcessos() {
  const { actorType } = useParams<{ actorType?: string }>();
  const selected = useMemo(() => {
    if (!actorType) return DEMO_ACTORS;
    return DEMO_ACTORS.filter((actor) => actor.id === actorType || actor.workspaceType === actorType);
  }, [actorType]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold">Painel Demo DeFarm</h1>
          <p className="text-muted-foreground mt-2">
            Acesso rapido por ator. Rota discreta para demonstracao e teste de fluxos.
          </p>
          <div className="mt-3">
            <Button size="sm" variant="outline" asChild>
              <Link to="/_demo/narrativa">Abrir rota de narrativa</Link>
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="secondary">/_demo/acessos</Badge>
            <Badge variant="secondary">/_demo/acessos/producer</Badge>
            <Badge variant="secondary">/_demo/acessos/partner</Badge>
            <Badge variant="secondary">/_demo/acessos/certifier</Badge>
            <Badge variant="secondary">/_demo/acessos/processor</Badge>
            <Badge variant="secondary">/_demo/acessos/admin</Badge>
          </div>
        </div>

        {selected.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Nenhum ator encontrado</CardTitle>
              <CardDescription>Use um tipo valido: producer, partner, certifier, processor ou admin.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {selected.map((actor) => (
              <ActorCard key={actor.id} actor={actor} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
