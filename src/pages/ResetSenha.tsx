import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { resetPassword } from "@/lib/defarm-api";
import logoIcon from "@/assets/logo-icon.png";

export default function ResetSenha() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();
  const [tokenInput, setTokenInput] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const tokenFromQuery = params.get("token") || "";
  const token = useMemo(() => tokenFromQuery || tokenInput.trim(), [tokenFromQuery, tokenInput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast({
        title: "Token obrigatório",
        description: "Informe o token de recuperação para continuar.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await resetPassword({ token, new_password: password });
      toast({
        title: "Senha redefinida",
        description: res.message,
      });
      navigate("/login");
    } catch (error) {
      toast({
        title: "Falha ao redefinir senha",
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
          <h2 className="text-3xl font-bold text-foreground mb-4">Defina uma nova senha</h2>
          <p className="text-lg text-muted-foreground">
            Use uma senha forte com pelo menos 8 caracteres.
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
              <h1 className="text-3xl font-bold text-foreground mb-2">Redefinir senha</h1>
              <p className="text-muted-foreground">Informe o token e a nova senha.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {!tokenFromQuery && (
                <div className="space-y-2">
                  <Label htmlFor="token">Token de recuperação</Label>
                  <Input
                    id="token"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Cole seu token"
                    required
                    className="h-12"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    className="h-12 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 btn-offset bg-primary hover:bg-primary text-primary-foreground font-semibold"
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><KeyRound className="h-4 w-4 mr-2" />Atualizar senha</>}
              </Button>
            </form>

            <p className="text-center text-muted-foreground mt-6">
              <Link to="/login" className="text-primary font-medium hover:underline">Voltar para login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
