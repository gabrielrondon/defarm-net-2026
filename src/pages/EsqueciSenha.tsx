import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { forgotPassword } from "@/lib/defarm-api";
import logoIcon from "@/assets/logo-icon.png";

export default function EsqueciSenha() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await forgotPassword({ email });
      toast({
        title: "Solicitação registrada",
        description: res.message,
      });
      navigate("/login");
    } catch (error) {
      toast({
        title: "Erro ao solicitar recuperação",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex flex-1 bg-primary/5 items-center justify-center p-12">
        <div className="max-w-lg text-center">
          <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <img src={logoIcon} alt="DeFarm" className="h-14 w-14" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-4">Recupere sua senha</h2>
          <p className="text-lg text-muted-foreground">
            Enviaremos instruções para redefinir sua senha com segurança.
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-8">
        <button
          onClick={() => navigate(-1)}
          className="self-start inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-background border-2 border-foreground rounded-lg shadow-[3px_3px_0px_0px_hsl(var(--foreground))] hover:shadow-[1px_1px_0px_0px_hsl(var(--foreground))] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md">
            <Link to="/" className="inline-flex items-center gap-3 mb-12">
              <img src={logoIcon} alt="DeFarm" className="h-10 w-10" />
              <span className="text-2xl font-bold text-foreground">DeFarm</span>
            </Link>

            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Esqueci minha senha</h1>
              <p className="text-muted-foreground">Informe seu email para iniciar a recuperação.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="voce@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 btn-offset bg-primary hover:bg-primary text-primary-foreground font-semibold"
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Mail className="h-4 w-4 mr-2" />Enviar instruções</>}
              </Button>
            </form>

            <p className="text-center text-muted-foreground mt-6">
              Lembrou da senha? <Link to="/login" className="text-primary font-medium hover:underline">Entrar</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
