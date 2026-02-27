import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoIcon from "@/assets/logo-icon.png";

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

function readPending2FA(): Pending2FA | null {
  try {
    const raw =
      sessionStorage.getItem(PENDING_2FA_KEY) ||
      localStorage.getItem(PENDING_2FA_FALLBACK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Pending2FA;
    if (!parsed?.token || !parsed?.created_at) return null;
    if (Date.now() - parsed.created_at > PENDING_2FA_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearPending2FA() {
  sessionStorage.removeItem(PENDING_2FA_KEY);
  localStorage.removeItem(PENDING_2FA_FALLBACK_KEY);
}

export default function Login2FA() {
  const [twofaCode, setTwofaCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pending, setPending] = useState<Pending2FA | null>(null);
  const { verifyLogin2FA, isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const isPartnerHost =
    typeof window !== "undefined" &&
    window.location.hostname.toLowerCase() === "partners.defarm.net";
  const isPartnerMode = useMemo(() => {
    if (isPartnerHost) return true;
    return (searchParams.get("mode") || "").toLowerCase() === "partner";
  }, [isPartnerHost, searchParams]);

  const backHref = isPartnerMode ? "/partner-login" : "/login";

  // Redirect to login if no valid pending 2FA challenge
  useEffect(() => {
    const p = readPending2FA();
    if (!p) {
      navigate(backHref, { replace: true });
      return;
    }
    setPending(p);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect after successful authentication
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

  const normalizedCode = twofaCode.trim().replace(/\s+/g, "");
  const canSubmit = isValidTwofaInput(normalizedCode) && !!pending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending || !canSubmit) return;
    setIsLoading(true);
    try {
      await verifyLogin2FA(pending.token, normalizedCode);
      clearPending2FA();
    } catch (error) {
      toast({
        title: "Erro na verificação",
        description: error instanceof Error ? error.message : "Código inválido ou expirado.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!pending) return null;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col p-8">
        <button
          onClick={() => {
            clearPending2FA();
            navigate(backHref);
          }}
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
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Verificação em duas etapas
              </h1>
              <p className="text-muted-foreground">
                Informe o código de 6 dígitos do autenticador ou um recovery code.
              </p>
            </div>

            {/*
              Formulário isolado: apenas o campo OTP.
              Sem campos de email/senha — evita que o 1Password injete credenciais
              e dispare um submit inesperado que reseta o estado de login.
            */}
            <form
              onSubmit={handleSubmit}
              className="space-y-6"
              autoComplete="off"
              data-form-type="other"
            >
              {/*
                Campo oculto de username para ancorar o contexto no gerenciador
                de senhas sem expor um campo editável de email.
              */}
              <input
                type="text"
                name="username"
                autoComplete="username"
                value={pending.email}
                readOnly
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
              />

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Conta</Label>
                <p className="text-sm font-medium text-foreground px-1">{pending.email}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="twofa-code">Código 2FA</Label>
                <Input
                  id="twofa-code"
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
                <p className="text-xs text-muted-foreground">
                  Abra o seu app autenticador e insira o código de 6 dígitos.
                </p>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !canSubmit}
                className="w-full h-12 btn-offset bg-primary hover:bg-primary text-primary-foreground font-semibold text-lg"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Validar 2FA
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
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
            Autenticação segura
          </h2>
          <p className="text-lg text-muted-foreground">
            A verificação em duas etapas protege sua conta mesmo se sua senha for comprometida.
          </p>
        </div>
      </div>
    </div>
  );
}
