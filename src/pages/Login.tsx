import { useCallback, useEffect, useMemo, useState } from "react";
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

const PENDING_2FA_KEY = "defarm_pending_2fa";
const PENDING_2FA_FALLBACK_KEY = "defarm_pending_2fa_fallback";
const PENDING_2FA_TTL_MS = 10 * 60 * 1000;

type Pending2FA = {
  token: string;
  email: string;
  created_at: number;
};

const isValidTwofaInput = (code: string): boolean => {
  const normalized = code.trim().replace(/\s+/g, "");
  return /^\d{6}$/.test(normalized) || /^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/.test(normalized);
};

export default function Login({ forcedMode = "default" }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [twofaToken, setTwofaToken] = useState<string | null>(null);
  const [isTwofaStep, setIsTwofaStep] = useState(false);
  const [twofaCode, setTwofaCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, verifyLogin2FA, isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
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

  const restorePendingTwofa = useCallback(() => {
    // Recover pending 2FA challenge to avoid falling back to credentials on reload/remount.
    try {
      const raw =
        sessionStorage.getItem(PENDING_2FA_KEY) ||
        localStorage.getItem(PENDING_2FA_FALLBACK_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as Pending2FA;
      if (!parsed?.token || !parsed?.created_at) {
        sessionStorage.removeItem(PENDING_2FA_KEY);
        localStorage.removeItem(PENDING_2FA_FALLBACK_KEY);
        return false;
      }
      if (Date.now() - parsed.created_at > PENDING_2FA_TTL_MS) {
        sessionStorage.removeItem(PENDING_2FA_KEY);
        localStorage.removeItem(PENDING_2FA_FALLBACK_KEY);
        return false;
      }
      setTwofaToken(parsed.token);
      setIsTwofaStep(true);
      if (parsed.email) setEmail(parsed.email);
      return true;
    } catch {
      sessionStorage.removeItem(PENDING_2FA_KEY);
      localStorage.removeItem(PENDING_2FA_FALLBACK_KEY);
      return false;
    }
  }, []);

  useEffect(() => {
    restorePendingTwofa();
  }, [restorePendingTwofa]);

  useEffect(() => {
    // Some password managers may transiently reset UI state without full reload.
    // Re-hydrate 2FA step on focus/visibility.
    const rehydrate = () => {
      if (!isTwofaStep) restorePendingTwofa();
    };
    window.addEventListener("focus", rehydrate);
    document.addEventListener("visibilitychange", rehydrate);
    return () => {
      window.removeEventListener("focus", rehydrate);
      document.removeEventListener("visibilitychange", rehydrate);
    };
  }, [isTwofaStep, restorePendingTwofa]);

  const getPendingTwofaToken = (): string | null => {
    if (twofaToken?.trim()) return twofaToken.trim();
    try {
      const raw =
        sessionStorage.getItem(PENDING_2FA_KEY) ||
        localStorage.getItem(PENDING_2FA_FALLBACK_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Pending2FA;
      if (!parsed?.token || !parsed?.created_at) return null;
      if (Date.now() - parsed.created_at > PENDING_2FA_TTL_MS) return null;
      return parsed.token;
    } catch {
      return null;
    }
  };

  const hasPendingTwofa = !!getPendingTwofaToken();
  const showTwofaStep = isTwofaStep || hasPendingTwofa;
  const normalizedTwofaCode = twofaCode.trim().replace(/\s+/g, "");
  const canSubmitTwofa = isValidTwofaInput(normalizedTwofaCode);

  useEffect(() => {
    if (!isTwofaStep && hasPendingTwofa) {
      setIsTwofaStep(true);
    }
  }, [isTwofaStep, hasPendingTwofa]);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) return;
    const destination =
      user?.workspace_type === "partner"
        ? "/app/parceiro"
        : user?.workspace_type === "certifier"
        ? "/app/claims"
        : user?.workspace_type === "processor"
        ? "/app/eventos"
        : isPartnerMode
        ? "/app/parceiro"
        : "/app";
    navigate(destination, { replace: true });
  }, [isAuthLoading, isAuthenticated, user?.workspace_type, isPartnerMode, navigate]);

  const persistPending2FA = (token: string, accountEmail: string) => {
    const payload: Pending2FA = {
      token,
      email: accountEmail,
      created_at: Date.now(),
    };
    sessionStorage.setItem(PENDING_2FA_KEY, JSON.stringify(payload));
    localStorage.setItem(PENDING_2FA_FALLBACK_KEY, JSON.stringify(payload));
  };

  const clearPending2FA = () => {
    sessionStorage.removeItem(PENDING_2FA_KEY);
    localStorage.removeItem(PENDING_2FA_FALLBACK_KEY);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (showTwofaStep) {
        const effectiveToken = getPendingTwofaToken();
        if (!effectiveToken) {
          throw new Error("Desafio 2FA expirou. Entre novamente com email e senha.");
        }
        if (!canSubmitTwofa) {
          throw new Error("Informe um código 2FA válido (6 dígitos) ou recovery code (XXXX-XXXX).");
        }
        const normalizedCode = normalizedTwofaCode;
        await verifyLogin2FA(effectiveToken, normalizedCode);
        clearPending2FA();
        setIsTwofaStep(false);
      } else {
        const challenge = await login({ email, password });
        if (challenge?.requires_2fa) {
          setTwofaToken(challenge.twofa_token);
          setIsTwofaStep(true);
          setTwofaCode("");
          persistPending2FA(challenge.twofa_token, email.trim());
          toast({
            title: "2FA necessário",
            description: "Digite o código do seu app autenticador para continuar.",
          });
          return;
        }
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
              {showTwofaStep
                ? "Verificação em duas etapas"
                : isPartnerMode
                ? "Portal de Parceiros"
                : t("login.welcome")}
            </h1>
            <p className="text-muted-foreground">
              {showTwofaStep
                ? "Informe o código de 6 dígitos do autenticador ou um recovery code."
                : isPartnerMode
                ? "Acesse com sua conta de parceiro para enviar dados e acompanhar integrações."
                : t("login.subtitle")}
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
            autoComplete={showTwofaStep ? "off" : "on"}
          >
            {!showTwofaStep ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">{t("login.email")}</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
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
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
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
                  <Label htmlFor="twofa-account">Conta</Label>
                  <Input
                    id="twofa-account"
                    name="username"
                    type="email"
                    value={email}
                    autoComplete="username"
                    readOnly
                    data-1p-ignore="true"
                    className="h-11 bg-muted/40"
                  />
                  <input
                    type="email"
                    name="username"
                    autoComplete="username"
                    value={email}
                    readOnly
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twofa">Código 2FA</Label>
                  <Input
                    id="twofa"
                    name="one-time-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    enterKeyHint="done"
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
                      clearPending2FA();
                      setTwofaToken(null);
                      setIsTwofaStep(false);
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
              disabled={isLoading || (showTwofaStep ? !canSubmitTwofa : false)}
              className="w-full h-12 btn-offset bg-primary hover:bg-primary text-primary-foreground font-semibold text-lg"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {showTwofaStep ? "Validar 2FA" : t("login.signIn")}
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
