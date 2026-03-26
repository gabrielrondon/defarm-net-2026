import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  Network,
  Database,
  Scale,
  Landmark,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import logoIcon from "@/assets/logo-icon.png";
import { LanguageToggle } from "@/components/LanguageToggle";

const PENDING_2FA_KEY = "defarm_pending_2fa";
const PENDING_2FA_FALLBACK_KEY = "defarm_pending_2fa_fallback";

type Pending2FA = {
  token: string;
  email: string;
  created_at: number;
};

interface LoginProps {
  forcedMode?: "default" | "partner" | "government";
}

export default function Login({ forcedMode = "default" }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useTranslation();

  const isPartnerHost =
    typeof window !== "undefined" &&
    window.location.hostname.toLowerCase() === "partners.defarm.net";
  const isGovHost =
    typeof window !== "undefined" &&
    window.location.hostname.toLowerCase() === "gov.defarm.net";
  const isPartnerMode = useMemo(() => {
    if (forcedMode === "partner") return true;
    if (isPartnerHost) return true;
    const mode = (searchParams.get("mode") || "").toLowerCase();
    const workspace = (searchParams.get("workspace") || "").toLowerCase();
    return mode === "partner" || workspace === "partner";
  }, [forcedMode, isPartnerHost, searchParams]);
  const isGovernmentMode = useMemo(() => {
    if (forcedMode === "government") return true;
    if (isGovHost) return true;
    const mode = (searchParams.get("mode") || "").toLowerCase();
    const workspace = (searchParams.get("workspace") || "").toLowerCase();
    return mode === "government" || workspace === "government";
  }, [forcedMode, isGovHost, searchParams]);

  useEffect(() => {
    const demoEmail = searchParams.get("demo_email");
    const demoPassword = searchParams.get("demo_password");
    if (demoEmail) setEmail(demoEmail);
    if (demoPassword) setPassword(demoPassword);
  }, [searchParams]);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) return;
    const redirectTo = searchParams.get("redirect");
    if (redirectTo && redirectTo.startsWith("/")) {
      navigate(redirectTo, { replace: true });
      return;
    }
    const destination =
      user?.workspace_type === "partner"
        ? "/app/parceiro"
        : user?.workspace_type === "government"
        ? "/app/governo/docs"
        : user?.workspace_type === "certifier"
        ? "/app/claims"
        : user?.workspace_type === "processor"
        ? "/app/eventos"
        : isPartnerMode
        ? "/app/parceiro"
        : isGovernmentMode
        ? "/app/governo/docs"
        : "/app";
    navigate(destination, { replace: true });
  }, [isAuthLoading, isAuthenticated, user?.workspace_type, isPartnerMode, isGovernmentMode, navigate, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const challenge = await login({ email, password });
      if (challenge?.requires_2fa) {
        const payload: Pending2FA = {
          token: challenge.twofa_token,
          email: email.trim(),
          created_at: Date.now(),
        };
        sessionStorage.setItem(PENDING_2FA_KEY, JSON.stringify(payload));
        localStorage.setItem(PENDING_2FA_FALLBACK_KEY, JSON.stringify(payload));
        navigate(
          isPartnerMode
            ? "/login/2fa?mode=partner"
            : isGovernmentMode
            ? "/login/2fa?mode=government"
            : "/login/2fa"
        );
        return;
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

  const loginForm = (
    <form onSubmit={handleSubmit} className="space-y-6" autoComplete="on">
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
          <Link to="/esqueci-senha" className="text-sm text-primary hover:underline">
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

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full h-12 btn-offset bg-primary hover:bg-primary text-primary-foreground font-semibold text-lg"
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            {t("login.signIn")}
            <ArrowRight className="ml-2 h-5 w-5" />
          </>
        )}
      </Button>
    </form>
  );

  if (isGovernmentMode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-background to-background">
        <section className="border-b border-border/60 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.18),transparent_58%)]">
          <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
            <div className="mb-8 flex items-center justify-between gap-4">
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-background border-2 border-foreground rounded-lg shadow-[3px_3px_0px_0px_hsl(var(--foreground))] hover:shadow-[1px_1px_0px_0px_hsl(var(--foreground))] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("nav.back")}
              </button>
              <LanguageToggle />
            </div>

            <div className="grid gap-8 lg:grid-cols-[1.2fr,0.8fr] lg:items-start">
              <div>
                <Link to="/" className="mb-8 inline-flex items-center gap-3">
                  <img src={logoIcon} alt="DeFarm" className="h-10 w-10" />
                  <span className="text-2xl font-bold text-foreground">DeFarm</span>
                </Link>
                <p className="mb-3 inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                  {t("login.gov.badge")}
                </p>
                <h1 className="max-w-2xl text-4xl font-bold leading-tight text-foreground md:text-5xl">
                  {t("login.gov.title")}
                </h1>
                <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
                  {t("login.gov.subtitle")}
                </p>
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-emerald-200/70 bg-white/80 p-4">
                    <p className="text-sm font-semibold text-foreground">{t("login.gov.kpiOneTitle")}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("login.gov.kpiOneDesc")}
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-200/70 bg-white/80 p-4">
                    <p className="text-sm font-semibold text-foreground">{t("login.gov.kpiTwoTitle")}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("login.gov.kpiTwoDesc")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background/95 p-6 shadow-sm backdrop-blur">
                <h2 className="text-2xl font-bold text-foreground">{t("login.gov.accessTitle")}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("login.gov.accessDesc")}
                </p>
                <div className="mt-6">{loginForm}</div>
                <p className="mt-6 text-sm text-muted-foreground">
                  {t("login.gov.contactPrompt")}{" "}
                  <Link to="/contato?profile=governo_agencia" className="font-medium text-primary hover:underline">
                    {t("login.gov.contactCta")}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-14 md:py-16">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <article className="rounded-2xl border bg-card p-6">
              <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-2 text-primary">
                <Landmark className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{t("login.gov.cards.pnibTitle")}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("login.gov.cards.pnibDesc")}
              </p>
            </article>
            <article className="rounded-2xl border bg-card p-6">
              <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-2 text-primary">
                <Database className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{t("login.gov.cards.enrichmentTitle")}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("login.gov.cards.enrichmentDesc")}
              </p>
            </article>
            <article className="rounded-2xl border bg-card p-6">
              <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-2 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{t("login.gov.cards.privacyTitle")}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("login.gov.cards.privacyDesc")}
              </p>
            </article>
            <article className="rounded-2xl border bg-card p-6">
              <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-2 text-primary">
                <Network className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{t("login.gov.cards.sharingTitle")}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("login.gov.cards.sharingDesc")}
              </p>
            </article>
            <article className="rounded-2xl border bg-card p-6">
              <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-2 text-primary">
                <Scale className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{t("login.gov.cards.complianceTitle")}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("login.gov.cards.complianceDesc")}
              </p>
            </article>
            <article className="rounded-2xl border bg-card p-6">
              <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-2 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{t("login.gov.cards.whyTitle")}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("login.gov.cards.whyDesc")}
              </p>
            </article>
          </div>
        </section>
      </div>
    );
  }

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
                {isPartnerMode
                  ? "Portal de Parceiros"
                  : isGovernmentMode
                  ? "Portal Governo"
                  : t("login.welcome")}
              </h1>
              <p className="text-muted-foreground">
                {isPartnerMode
                  ? "Acesse com sua conta de parceiro para enviar dados e acompanhar integrações."
                  : isGovernmentMode
                  ? "Acesse com sua conta governamental para leitura e contribuição oficial."
                  : t("login.subtitle")}
              </p>
            </div>

            {loginForm}

            {/* Sign up link */}
            <p className="text-center text-muted-foreground mt-6">
              {t("login.noAccount")}{" "}
              <Link to="/cadastro" className="text-primary font-medium hover:underline">
                {t("login.createAccount")}
              </Link>
            </p>
            {!isPartnerMode && !isGovernmentMode && (
              <p className="text-center text-muted-foreground mt-2 text-sm">
                É parceiro?{" "}
                <Link to="/partner-login" className="text-primary font-medium hover:underline">
                  Entrar no portal parceiro
                </Link>
              </p>
            )}
            {!isPartnerMode && !isGovernmentMode && (
              <p className="text-center text-muted-foreground mt-1 text-sm">
                É agência/governo?{" "}
                <Link to="/gov-login" className="text-primary font-medium hover:underline">
                  Entrar no portal gov
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
