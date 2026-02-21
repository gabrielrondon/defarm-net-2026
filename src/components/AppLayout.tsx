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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import logoIcon from "@/assets/logo-icon.png";
import { useQuery } from "@tanstack/react-query";
import { getMyJoinRequests, requestEmailVerification } from "@/lib/defarm-api";
import { useToast } from "@/hooks/use-toast";

interface NavItem {
  icon: typeof BookOpen;
  label: string;
  href: string;
  workspaceTypes?: Array<"partner" | "producer" | "processor" | "certifier">;
}

const navItems: NavItem[] = [
  { icon: BookOpen, label: "Minha Caderneta", href: "/app" },
  
  { icon: GitBranch, label: "Circuitos", href: "/app/circuitos" },
  { icon: Compass, label: "Descobrir", href: "/app/descobrir" },
  { icon: Package, label: "Itens", href: "/app/itens" },
  { icon: Users, label: "Minhas Propriedades", href: "/app/claims", workspaceTypes: ["producer", "certifier"] },
  { icon: Users, label: "Rebanho por Propriedade", href: "/app/propriedades/rebanho", workspaceTypes: ["producer", "certifier"] },
  { icon: Activity, label: "Eventos", href: "/app/eventos" },
  { icon: Shield, label: "Auditoria", href: "/app/auditoria" },
  { icon: Camera, label: "Snapshots", href: "/app/snapshots" },
  { icon: Landmark, label: "DeFarm Finance", href: "/app/finance" },
  { icon: ClipboardCheck, label: "DeFarm Compliance", href: "/app/compliance" },
];

const partnerNavItem: NavItem = {
  icon: Handshake,
  label: "Portal Parceiro",
  href: "/app/parceiro",
};

const adminNavItems: NavItem[] = [
  { icon: BarChart3, label: "Métricas", href: "/app/admin/metricas" },
  { icon: Users, label: "Usuários", href: "/app/admin/usuarios" },
  { icon: Fingerprint, label: "Identificadores", href: "/app/admin/identificadores" },
  { icon: ListTodo, label: "Fila de Jobs", href: "/app/admin/jobs" },
];

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const workspaceType = user?.workspace_type || "producer";

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
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-background border-r border-border flex flex-col transition-transform duration-300 lg:translate-x-0",
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
          {navItems
            .filter((item) => user?.is_admin || !item.workspaceTypes || item.workspaceTypes.includes(workspaceType))
            .map((item) => {
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

          {/* Partner Portal - visible to admin and workspace type partner */}
          {(user?.is_admin || workspaceType === "partner") && (() => {
            const isActive = location.pathname.startsWith(partnerNavItem.href);
            return (
              <>
                <div className="pt-4 pb-1 px-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Parceiro
                  </span>
                </div>
                <Link
                  to={partnerNavItem.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <partnerNavItem.icon className="h-5 w-5" />
                  {partnerNavItem.label}
                  {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                </Link>
              </>
            );
          })()}

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
          {children}
        </main>
      </div>
    </div>
  );
}
