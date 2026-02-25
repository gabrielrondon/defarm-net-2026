import { ReactNode, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  GitBranch,
  Package,
  Activity,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Shield,
  Camera,
  Landmark,
  ClipboardCheck,
  Compass,
  BarChart3,
  Users,
  Fingerprint,
  ListTodo,
  Handshake,
  Search,
  Key,
  Webhook,
  TerminalSquare,
  Code2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import logoIcon from "@/assets/logo-icon.png";
import { useQuery } from "@tanstack/react-query";
import { getMyJoinRequests, requestEmailVerification } from "@/lib/defarm-api";
import { useToast } from "@/hooks/use-toast";
import {
  clearDemoNarrativeState,
  getDemoStepByIndex,
  readDemoNarrativeState,
  writeDemoNarrativeState,
} from "@/lib/demo-narrative";

interface NavItem {
  icon: typeof BookOpen;
  label: string;
  href: string;
}
type WorkspaceType = "partner" | "producer" | "processor" | "certifier";

const navCatalog: NavItem[] = [
  { icon: BookOpen, label: "Minha Caderneta", href: "/app" },
  { icon: Handshake, label: "Portal Parceiro", href: "/app/parceiro" },
  { icon: Key, label: "API Keys", href: "/app/api-keys" },
  { icon: Webhook, label: "Webhooks", href: "/app/webhooks" },
  { icon: TerminalSquare, label: "CLI", href: "/app/cli" },
  { icon: Code2, label: "SDK", href: "/app/sdk" },
  { icon: Users, label: "Minhas Propriedades", href: "/app/claims" },
  { icon: Users, label: "Rebanho por Propriedade", href: "/app/propriedades/rebanho" },
  { icon: GitBranch, label: "Circuitos", href: "/app/circuitos" },
  { icon: Package, label: "Itens", href: "/app/itens" },
  { icon: Activity, label: "Eventos", href: "/app/eventos" },
  { icon: Compass, label: "Descobrir", href: "/app/descobrir" },
  { icon: Shield, label: "Auditoria", href: "/app/auditoria" },
  { icon: Camera, label: "Snapshots", href: "/app/snapshots" },
  { icon: Landmark, label: "DeFarm Finance", href: "/app/finance" },
  { icon: ClipboardCheck, label: "DeFarm Compliance", href: "/app/compliance" },
];

const navByWorkspace: Record<WorkspaceType, string[]> = {
  partner: ["/app/parceiro", "/app/api-keys", "/app/webhooks", "/app/cli", "/app/sdk"],
  producer: ["/app", "/app/claims", "/app/propriedades/rebanho", "/app/circuitos", "/app/itens", "/app/eventos", "/app/descobrir", "/app/snapshots", "/app/finance", "/app/compliance"],
  certifier: ["/app/claims", "/app/propriedades/rebanho", "/app/circuitos", "/app/itens", "/app/eventos", "/app/auditoria", "/app/compliance"],
  processor: ["/app/circuitos", "/app/itens", "/app/eventos", "/app/auditoria", "/app/finance", "/app/compliance"],
};

const adminNavItems: NavItem[] = [
  { icon: BarChart3, label: "Métricas", href: "/app/admin/metricas" },
  { icon: Search, label: "Search/Analytics", href: "/app/admin/search-analytics" },
  { icon: Users, label: "Usuários", href: "/app/admin/usuarios" },
  { icon: Fingerprint, label: "Identificadores", href: "/app/admin/identificadores" },
  { icon: ListTodo, label: "Fila de Jobs", href: "/app/admin/jobs" },
];

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, isAuthenticated, isLoading, logout, login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [demoSwitchLoading, setDemoSwitchLoading] = useState(false);
  const workspaceType = user?.workspace_type || "producer";
  const workspaceMenu = navByWorkspace[workspaceType as WorkspaceType] ?? navByWorkspace.producer;
  const visibleNavItems = user?.is_admin
    ? navCatalog
    : workspaceMenu
        .map((href) => navCatalog.find((item) => item.href === href))
        .filter((item): item is NavItem => !!item);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isLoading, isAuthenticated, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const { data: myApprovedJoinRequests = [] } = useQuery({
    queryKey: ["myJoinRequestsApproved"],
    queryFn: () => getMyJoinRequests("approved"),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const handleResendVerification = async () => {
    try {
      const res = await requestEmailVerification();
      toast({
        title: "Verificação enviada",
        description: res.message,
      });
    } catch (error) {
      toast({
        title: "Falha ao reenviar verificação",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const demoState = readDemoNarrativeState();
  const demoCurrentStep = demoState?.enabled ? getDemoStepByIndex(demoState.index) : undefined;
  const demoNextStep = demoState?.enabled ? getDemoStepByIndex(demoState.index + 1) : undefined;
  const isInDemoPresentation = !!demoCurrentStep && user?.email === demoCurrentStep.email;

  const handleDemoNextStep = async () => {
    if (!demoState || !demoCurrentStep || !demoNextStep) return;
    setDemoSwitchLoading(true);
    try {
      writeDemoNarrativeState({ enabled: true, index: demoState.index + 1 });
      await logout();
      const challenge = await login({
        email: demoNextStep.email,
        password: demoNextStep.password,
      });

      if (challenge?.requires_2fa) {
        toast({
          title: "2FA necessario",
          description: "A proxima conta exige 2FA. Complete no login.",
        });
        navigate(
          `/login?demo_email=${encodeURIComponent(demoNextStep.email)}&demo_password=${encodeURIComponent(demoNextStep.password)}`
        );
        return;
      }

      navigate(demoNextStep.defaultRoute);
    } catch (error) {
      writeDemoNarrativeState(demoState);
      toast({
        title: "Falha ao trocar para proxima etapa",
        description: error instanceof Error ? error.message : "Erro na troca de conta demo.",
        variant: "destructive",
      });
    } finally {
      setDemoSwitchLoading(false);
    }
  };

  const handleDemoFinish = () => {
    clearDemoNarrativeState();
    toast({
      title: "Narrativa encerrada",
      description: "Modo apresentacao finalizado.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-3">
          <img src={logoIcon} alt="DeFarm" className="h-10 w-10" />
          <span className="text-xl font-bold text-foreground">Carregando...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky lg:top-0 inset-y-0 left-0 z-50 w-64 h-screen bg-background border-r border-border flex flex-col transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <Link to="/app" className="flex items-center gap-3">
            <img src={logoIcon} alt="DeFarm" className="h-8 w-8" />
            <span className="text-lg font-bold text-foreground">DeFarm</span>
          </Link>
          <button
            className="lg:hidden p-2 hover:bg-muted rounded-lg"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== "/app" && location.pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
                {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
              </Link>
            );
          })}

          {/* Admin section - only visible to admin users */}
          {user?.is_admin && (
            <>
              <div className="pt-4 pb-1 px-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Admin
                </span>
              </div>
              {adminNavItems.map((item) => {
                const isActive = location.pathname === item.href ||
                  location.pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                    {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">
                {user?.username?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.username}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email} · {workspaceType}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start"
              onClick={() => navigate("/app/configuracoes")}
            >
              <Settings className="h-4 w-4 mr-2" />
              Config
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 border-b border-border flex items-center px-4 lg:px-6 gap-4">
          <button
            className="lg:hidden p-2 hover:bg-muted rounded-lg"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <div className="flex-1" />
          
          {/* You can add search, notifications, etc. here */}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {!user?.email_verified && (
            <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-center justify-between gap-3">
              <span>Seu email ainda não foi verificado. Verifique para aumentar a segurança da conta.</span>
              <Button variant="outline" size="sm" onClick={handleResendVerification}>
                Reenviar verificação
              </Button>
            </div>
          )}
          {myApprovedJoinRequests.length > 0 && (
            <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
              Você possui {myApprovedJoinRequests.length} solicitação(ões) de entrada aprovada(s). Acesse seus circuitos para conferir.
            </div>
          )}
          {demoState?.enabled && (
            <div className="mb-4 rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 text-sm text-blue-900 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold">
                  Modo apresentacao ativo
                </div>
                <div>
                  {isInDemoPresentation
                    ? `Ator atual: ${demoCurrentStep?.title}`
                    : "Usuario atual nao corresponde a etapa ativa da narrativa."}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {demoNextStep ? (
                  <Button size="sm" onClick={handleDemoNextStep} disabled={demoSwitchLoading}>
                    Proxima etapa
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={handleDemoFinish}>
                    Finalizar narrativa
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => navigate("/_demo/narrativa")}>
                  Ver roteiro
                </Button>
              </div>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
