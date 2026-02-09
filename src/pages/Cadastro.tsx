import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, ArrowLeft, Loader2, Eye, EyeOff, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import logoIcon from "@/assets/logo-icon.png";
import { cn } from "@/lib/utils";

export default function Cadastro() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

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
        workspace_slug: workspaceSlug || fullName.toLowerCase().replace(/\s+/g, "-"),
        workspace_name: workspaceName || fullName,
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
    <div className="min-h-screen bg-background flex">
      {/* Left side - Visual */}
      <div className="hidden lg:flex flex-1 bg-primary/5 items-center justify-center p-12">
        <div className="max-w-lg text-center">
          <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <img src={logoIcon} alt="DeFarm" className="h-14 w-14" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-4">
            {t("register.sideTitle")}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t("register.sideDescription")}
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col p-8">
        {/* Back button */}
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
              {t("register.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("register.subtitle")}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">{t("register.fullName")}</Label>
              <Input
                id="name"
                type="text"
                placeholder={t("register.fullNamePlaceholder")}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("register.email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("register.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="workspace">{t("register.workspace")}</Label>
              <Input
                id="workspace"
                type="text"
                placeholder={t("register.workspacePlaceholder")}
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("register.password")}</Label>
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
              
              {/* Password requirements */}
              {password && (
                <div className="mt-3 space-y-1">
                  {passwordRequirements.map((req, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-center gap-2 text-xs transition-colors",
                        req.test(password) ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      <Check className={cn(
                        "h-3 w-3",
                        req.test(password) ? "opacity-100" : "opacity-30"
                      )} />
                      {req.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading || !passwordValid}
              className="w-full h-12 btn-offset bg-primary hover:bg-primary text-primary-foreground font-semibold text-lg mt-6"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {t("register.createAccount")}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          {/* Login link */}
          <p className="text-center text-muted-foreground mt-8">
            {t("register.hasAccount")}{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              {t("register.signIn")}
            </Link>
          </p>
          </div>
        </div>
      </div>
    </div>
  );
}
