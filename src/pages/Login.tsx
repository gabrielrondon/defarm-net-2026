import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { register as apiRegister, storeAuth } from "@/lib/defarm-api";
import { useTranslation } from "react-i18next";
import logoIcon from "@/assets/logo-icon.png";

interface LoginProps {
  forcedMode?: "default" | "partner";
}

export default function Login({ forcedMode = "default" }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [twofaToken, setTwofaToken] = useState<string | null>(null);
  const [twofaCode, setTwofaCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, verifyLogin2FA } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useTranslation();
  const isPartnerHost =
    typeof window !== "undefined" &&
    window.location.hostname.toLowerCase() === "partners.defarm.net";
  const isPartnerMode = useMemo(() => {
    if (forcedMode === "partner") return true;
    if (isPartnerHost) return true;
    const mode = (searchParams.get("mode") || "").toLowerCase();
    const workspace = (searchParams.get("workspace") || "").toLowerCase();
    return mode === "partner" || workspace === "partner";
  }, [forcedMode, isPartnerHost, searchParams]);

  useEffect(() => {
    const demoEmail = searchParams.get("demo_email");
    const demoPassword = searchParams.get("demo_password");
    if (demoEmail) setEmail(demoEmail);
    if (demoPassword) setPassword(demoPassword);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (twofaToken) {
        await verifyLogin2FA(twofaToken, twofaCode);
        navigate(isPartnerMode ? "/app/parceiro" : "/app");
      } else {
        const challenge = await login({ email, password });
        if (challenge?.requires_2fa) {
          setTwofaToken(challenge.twofa_token);
          toast({
            title: "2FA necessário",
            description: "Digite o código do seu app autenticador para continuar.",
          });
          return;
        }
        navigate(isPartnerMode ? "/app/parceiro" : "/app");
      }
    } catch (error) {
      toast({
        title: t("login.errorTitle"),
        description: error instanceof Error ? error.message : t("login.errorDescription"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col p-8">
        {/* Back button - top left */}
        <button
          onClick={() => navigate(-1)}
          className="self-start inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-background border-2 border-foreground rounded-lg shadow-[3px_3px_0px_0px_hsl(var(--foreground))] hover:shadow-[1px_1px_0px_0px_hsl(var(--foreground))] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("nav.back")}
        </button>

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md">
            {/* Logo */}
            <Link to="/" className="inline-flex items-center gap-3 mb-12">
              <img src={logoIcon} alt="DeFarm" className="h-10 w-10" />
              <span className="text-2xl font-bold text-foreground">DeFarm</span>
            </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {twofaToken
                ? "Verificação em duas etapas"
                : isPartnerMode
                ? "Portal de Parceiros"
                : t("login.welcome")}
            </h1>
            <p className="text-muted-foreground">
              {twofaToken
                ? "Informe o código de 6 dígitos do autenticador ou um recovery code."
                : isPartnerMode
                ? "Acesse com sua conta de parceiro para enviar dados e acompanhar integrações."
                : t("login.subtitle")}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {!twofaToken ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">{t("login.email")}</Label>
                  <Input
                    id="email"
                    type="text"
                    placeholder={t("register.emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">{t("login.password")}</Label>
                    <Link 
                      to="/esqueci-senha" 
                      className="text-sm text-primary hover:underline"
                    >
                      {t("login.forgotPassword")}
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
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
              </>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="twofa">Código 2FA</Label>
                  <Input
                    id="twofa"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    placeholder="123456 ou XXXX-XXXX"
                    value={twofaCode}
                    onChange={(e) => setTwofaCode(e.target.value)}
                    required
                    className="h-12 text-center text-lg tracking-widest font-mono"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Abra o seu app autenticador e insira o código de 6 dígitos.
                </p>
                <div className="pt-2 border-t border-border">
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => {
                      setTwofaToken(null);
                      setTwofaCode("");
                    }}
                  >
                    ← Voltar para login e senha
                  </button>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || (twofaToken ? !twofaCode.trim() : false)}
              className="w-full h-12 btn-offset bg-primary hover:bg-primary text-primary-foreground font-semibold text-lg"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {twofaToken ? "Validar 2FA" : t("login.signIn")}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          {/* Sign up link */}
          <p className="text-center text-muted-foreground mt-6">
            {t("login.noAccount")}{" "}
            <Link to="/cadastro" className="text-primary font-medium hover:underline">
              {t("login.createAccount")}
            </Link>
          </p>
          {!isPartnerMode && (
            <p className="text-center text-muted-foreground mt-2 text-sm">
              É parceiro?{" "}
              <Link to="/partner-login" className="text-primary font-medium hover:underline">
                Entrar no portal parceiro
              </Link>
            </p>
          )}
          </div>
        </div>
      </div>
      {/* Right side - Visual */}
      <div className="hidden lg:flex flex-1 bg-primary/5 items-center justify-center p-12">
        <div className="max-w-lg text-center">
          <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <img src={logoIcon} alt="DeFarm" className="h-14 w-14" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-4">
            {t("login.sideTitle")}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t("login.sideDescription")}
          </p>
        </div>
      </div>
    </div>
  );
}
