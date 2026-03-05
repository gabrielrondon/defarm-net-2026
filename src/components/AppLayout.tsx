import { ReactNode, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Database,
  ScrollText,
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

interface NavSection {
  title?: string;
  items: NavItem[];
}

type WorkspaceType = "partner" | "producer" | "processor" | "certifier";

const partnerSections: NavSection[] = [
  {
    items: [
      { icon: Handshake, label: "Portal Parceiro", href: "/app/parceiro" },
    ],
  },
  {
    title: "Operação",
    items: [
      { icon: ScrollText, label: "Logs", href: "/app/parceiro/logs" },
      { icon: Key, label: "API Keys", href: "/app/api-keys" },
      { icon: Webhook, label: "Webhooks", href: "/app/webhooks" },
    ],
  },
  {
    title: "Desenvolvimento",
    items: [
      { icon: Database, label: "SDK", href: "/app/sdk" },
      { icon: ScrollText, label: "CLI", href: "/app/cli" },
      { icon: BookOpen, label: "Documentação", href: "/app/docs" },
    ],
  },
];

const producerSections: NavSection[] = [
  {
    items: [
      { icon: BookOpen, label: "Minha Caderneta", href: "/app" },
    ],
  },
  {
    title: "Rastreio",
    items: [
      { icon: Users, label: "Minhas Propriedades", href: "/app/claims" },
      { icon: GitBranch, label: "Circuitos", href: "/app/circuitos" },
      { icon: Package, label: "Itens", href: "/app/itens" },
      { icon: Activity, label: "Eventos", href: "/app/eventos" },
    ],
  },
  {
    title: "Serviços",
    items: [
      { icon: Landmark, label: "Finance", href: "/app/finance" },
      { icon: ClipboardCheck, label: "Compliance", href: "/app/compliance" },
    ],
  },
];

const certifierSections: NavSection[] = [
  {
    title: "Rastreio",
    items: [
      { icon: Users, label: "Propriedades", href: "/app/claims" },
      { icon: Users, label: "Rebanho", href: "/app/propriedades/rebanho" },
      { icon: GitBranch, label: "Circuitos", href: "/app/circuitos" },
      { icon: Package, label: "Itens", href: "/app/itens" },
      { icon: Activity, label: "Eventos", href: "/app/eventos" },
    ],
  },
  {
    title: "Verificação",
    items: [
      { icon: Shield, label: "Auditoria", href: "/app/auditoria" },
      { icon: ClipboardCheck, label: "Compliance", href: "/app/compliance" },
    ],
  },
];

const processorSections: NavSection[] = [
  {
    title: "Rastreio",
    items: [
      { icon: GitBranch, label: "Circuitos", href: "/app/circuitos" },
      { icon: Package, label: "Itens", href: "/app/itens" },
      { icon: Activity, label: "Eventos", href: "/app/eventos" },
    ],
  },
  {
    title: "Verificação & Serviços",
    items: [
      { icon: Shield, label: "Auditoria", href: "/app/auditoria" },
      { icon: Landmark, label: "Finance", href: "/app/finance" },
      { icon: ClipboardCheck, label: "Compliance", href: "/app/compliance" },
    ],
  },
];

const adminSections: NavSection[] = [
  {
    items: [
      { icon: BookOpen, label: "Minha Caderneta", href: "/app" },
      { icon: Handshake, label: "Portal Parceiro", href: "/app/parceiro" },
    ],
  },
  {
    title: "Parceiro",
    items: [
      { icon: ScrollText, label: "Logs", href: "/app/parceiro/logs" },
      { icon: Key, label: "API Keys", href: "/app/api-keys" },
      { icon: Webhook, label: "Webhooks", href: "/app/webhooks" },
      { icon: Database, label: "SDK", href: "/app/sdk" },
      { icon: ScrollText, label: "CLI", href: "/app/cli" },
    ],
  },
  {
    title: "Rastreio",
    items: [
      { icon: Users, label: "Propriedades", href: "/app/claims" },
      { icon: GitBranch, label: "Circuitos", href: "/app/circuitos" },
      { icon: Package, label: "Itens", href: "/app/itens" },
      { icon: Activity, label: "Eventos", href: "/app/eventos" },
      { icon: Compass, label: "Descobrir", href: "/app/descobrir" },
      { icon: Shield, label: "Auditoria", href: "/app/auditoria" },
      { icon: Camera, label: "Snapshots", href: "/app/snapshots" },
    ],
  },
  {
    title: "Serviços",
    items: [
      { icon: Landmark, label: "Finance", href: "/app/finance" },
      { icon: ClipboardCheck, label: "Compliance", href: "/app/compliance" },
    ],
  },
];

const adminNavItems: NavItem[] = [
  { icon: BarChart3, label: "Métricas", href: "/app/admin/metricas" },
  { icon: Search, label: "Search/Analytics", href: "/app/admin/search-analytics" },
  { icon: Users, label: "Usuários", href: "/app/admin/usuarios" },
  { icon: Fingerprint, label: "Identificadores", href: "/app/admin/identificadores" },
  { icon: Database, label: "Payloads Parceiros", href: "/app/admin/payloads-parceiros" },
  { icon: ListTodo, label: "Fila de Jobs", href: "/app/admin/jobs" },
];

const sectionsByWorkspace: Record<WorkspaceType, NavSection[]> = {
  partner: partnerSections,
  producer: producerSections,
  certifier: certifierSections,
  processor: processorSections,
};

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
  const [showProducerHint, setShowProducerHint] = useState(false);
  const workspaceType = user?.workspace_type || "producer";
  
  const sections = user?.is_admin
    ? adminSections
    : sectionsByWorkspace[workspaceType as WorkspaceType] ?? producerSections;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated || isLoading || !user) return;
    if (user.is_admin) return;
    if (workspaceType !== "producer") return;
    setShowProducerHint(true);
  }, [isAuthenticated, isLoading, user, workspaceType]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const dismissProducerHint = () => setShowProducerHint(false);

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
          "fixed lg:sticky lg:top-0 inset-y-0 left-0 z-50 w-56 h-screen bg-background border-r border-border flex flex-col transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-border">
          <Link to="/app" className="flex items-center gap-2.5">
            <img src={logoIcon} alt="DeFarm" className="h-7 w-7" />
            <span className="text-base font-bold text-foreground">DeFarm</span>
          </Link>
          <button
            className="lg:hidden p-2 hover:bg-muted rounded-lg"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {sections.map((section, sectionIdx) => (
            <div key={sectionIdx} className={sectionIdx > 0 ? "mt-5" : ""}>
              {section.title && (
                <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/60">
                  {section.title}
                </p>
              )}
              {section.items.map((item) => {
                const isActive = location.pathname === item.href || 
                  (item.href !== "/app" && location.pathname.startsWith(item.href));
                
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}

          {/* Admin section */}
          {user?.is_admin && (
            <div className="mt-5">
              <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/60">
                Admin
              </p>
              {adminNavItems.map((item) => {
                const isActive = location.pathname === item.href ||
                  location.pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-xs font-semibold text-primary">
                {user?.username?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate">
                {user?.username}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {workspaceType}
              </p>
            </div>
          </div>
          
          <div className="flex gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start h-8 text-xs"
              onClick={() => navigate("/app/configuracoes")}
            >
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Config
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-border flex items-center px-4 lg:px-6 gap-4">
          <button
            className="lg:hidden p-2 hover:bg-muted rounded-lg"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <div className="flex-1" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Dialog open={showProducerHint} onOpenChange={setShowProducerHint}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Bem-vindo à DeFarm</DialogTitle>
                <DialogDescription>
                  Seus dados aparecem aqui conforme integrações de parceiros e validações forem acontecendo.
                </DialogDescription>
              </DialogHeader>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  Se você ainda não vê itens, circuitos ou eventos, normalmente significa que o seu cadastro ainda
                  não foi vinculado a dados enviados por integrações ativas.
                </p>
                <p>
                  Quando houver vínculo confirmado (por propriedade/identificador), o portfólio passa a aparecer
                  automaticamente.
                </p>
                <p>
                  Você pode enviar agora uma solicitação de vínculo de propriedade (claim). Ela entra na fila de
                  validação do admin.
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowProducerHint(false);
                    navigate("/app/claims");
                  }}
                >
                  Solicitar vínculo de propriedade
                </Button>
                <Button onClick={dismissProducerHint}>Entendi</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
