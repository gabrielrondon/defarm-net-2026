import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnchorStatus } from "@/components/proof";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

// /cadastro (signup self-serve do produtor) — visual Ledger v2 (chunk 2).
// VISUAL do design; LÓGICA real preservada: useAuth().register(...) -> /app,
// checklist de requisitos de senha, toast de erro, workspace_type=producer.

function ProducerProof() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)]">
      <div className="mb-4 flex items-center justify-between border-b border-dashed border-border pb-4">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Seu rebanho, tokenizado
        </span>
        <span className="grid h-7 place-items-center rounded-md border border-border px-2 font-mono text-[11px] font-semibold tracking-[0.08em] text-primary">
          PRD
        </span>
      </div>
      <div className="mb-4 break-all font-mono text-[14px] font-medium tracking-tight">DFID-BEEF-BR-2026-001106-b0e4d7</div>
      <div className="space-y-2.5">
        {[["RST", "Brinco emitido"], ["OSA", "GTA carimbada"], ["FRG", "Selo · Bonificação A"], ["CRT", "Atestado"]].map(
          ([c, lbl]) => (
            <div key={c} className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 shrink-0 rounded-[2px] bg-primary" />
              <span className="flex-1 text-[13px]">{lbl}</span>
              <span className="font-mono text-[10.5px] text-muted-foreground">{c}</span>
            </div>
          ),
        )}
      </div>
      <div className="mt-4 border-t border-dashed border-border pt-4">
        <AnchorStatus status="confirmed" compact />
      </div>
    </div>
  );
}

export default function Cadastro() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const passwordRequirements = [
    { label: t("register.passwordReqs.length"), test: (p: string) => p.length >= 8 },
    { label: t("register.passwordReqs.uppercase"), test: (p: string) => /[A-Z]/.test(p) },
    { label: t("register.passwordReqs.lowercase"), test: (p: string) => /[a-z]/.test(p) },
    { label: t("register.passwordReqs.number"), test: (p: string) => /\d/.test(p) },
    { label: t("register.passwordReqs.special"), test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
  ];
  const passwordValid = passwordRequirements.every((req) => req.test(password));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordValid) {
      toast({
        title: t("register.invalidPassword"),
        description: t("register.invalidPasswordDesc"),
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      await register({
        email,
        password,
        full_name: fullName,
        workspace_slug: (workspaceName || fullName).toLowerCase().replace(/\s+/g, "-"),
        workspace_name: workspaceName || fullName,
        workspace_type: "producer",
      });
      navigate("/app");
    } catch (error) {
      toast({
        title: t("register.errorTitle"),
        description: error instanceof Error ? error.message : t("register.errorDescription"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* painel-prova (>= lg) */}
      <div className="relative hidden flex-col justify-center overflow-hidden border-r border-border bg-muted/50 p-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)/0.04) 1px,transparent 1px),linear-gradient(90deg,hsl(var(--foreground)/0.04) 1px,transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage: "radial-gradient(circle at 30% 40%, black, transparent 70%)",
            WebkitMaskImage: "radial-gradient(circle at 30% 40%, black, transparent 70%)",
          }}
        />
        <div className="relative max-w-sm">
          <Link to="/" className="flex items-center">
            <img src={logo} alt="DeFarm" className="h-8" />
          </Link>
          <h2 className="mt-8 text-[32px] font-bold leading-[1.05] tracking-tight" style={{ textWrap: "balance" }}>
            {t("signup.panel_title")}
          </h2>
          <p className="mt-4 text-[15.5px] leading-relaxed text-muted-foreground">{t("signup.panel_sub")}</p>
          <div className="mt-8">
            <ProducerProof />
          </div>
        </div>
      </div>

      {/* form */}
      <div className="relative flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="absolute left-6 top-5 sm:left-12">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-1.5 h-[15px] w-[15px]" />
            {t("pg.back")}
          </Button>
        </div>
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-[30px] font-bold tracking-tight">{t("signup.title")}</h1>
          <p className="mt-2 text-[15px] text-muted-foreground">{t("signup.sub")}</p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="name">{t("signup.f_name")}</Label>
              <Input id="name" placeholder={t("signup.ph_name")} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("signup.f_email")}</Label>
              <Input id="email" type="email" placeholder={t("signup.ph_email")} value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="farm">{t("signup.f_farm")}</Label>
              <Input id="farm" placeholder={t("signup.ph_farm")} value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} />
            </div>

            <div className="rounded-xl border border-border bg-muted/50 p-3.5 text-[12.5px] leading-relaxed text-muted-foreground">
              {t("signup.workspace_a")}
              <b className="font-semibold text-foreground">{t("signup.workspace_em")}</b>
              {t("signup.workspace_b")}
              <Link to="/contato" className="whitespace-nowrap font-medium text-primary hover:underline">
                {t("signup.workspace_link")}
              </Link>
              .
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">{t("signup.f_pass")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="toggle password"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password && (
                <div className="mt-3 space-y-1">
                  {passwordRequirements.map((req, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-center gap-2 text-xs transition-colors",
                        req.test(password) ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      <Check className={cn("h-3 w-3", req.test(password) ? "opacity-100" : "opacity-30")} />
                      {req.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" size="lg" className="mt-2 w-full" disabled={isLoading || !passwordValid}>
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {t("signup.submit")} <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-[13.5px] text-muted-foreground">
            {t("signup.has_account")}{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              {t("signup.signin")}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
