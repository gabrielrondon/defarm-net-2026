import { ReactNode, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  Trees,
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
  Database,
  Layers,
  ScrollText,
  ExternalLink,
  Building2,
  Mail,
  Coins,
  Upload,
  Route,
  PackageOpen,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import logoIcon from "@/assets/logo-icon.png";
import { useQuery } from "@tanstack/react-query";
import { ProducerGate } from "@/components/ProducerGate";
import { getMyCapabilities } from "@/lib/api/capabilities";
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
  /** Chave i18n opcional — itens do parceiro traduzem; sem chave, cai no label PT. */
  labelKey?: string;
  href: string;
  external?: boolean;
}
type WorkspaceType = "partner" | "producer" | "processor" | "certifier" | "government";

const navCatalog: NavItem[] = [
  { icon: BookOpen, label: "Minha Caderneta", href: "/app" },
  { icon: Handshake, label: "Portal Parceiro", href: "/app/parceiro", labelKey: "nav.items.portal" },
  { icon: Upload, label: "Enviar dados", href: "/app/parceiro/ingestao", labelKey: "nav.items.send" },
  { icon: Route, label: "Roteamento", href: "/app/parceiro/roteamento", labelKey: "nav.items.routing" },
  { icon: BookOpen, label: "Docs", href: "https://docs.defarm.net/docs/getting-started", external: true, labelKey: "nav.items.docs" },
  { icon: ScrollText, label: "Central de Envios", href: "/app/parceiro/logs", labelKey: "nav.items.logs" },
  { icon: Key, label: "API Keys", href: "/app/api-keys" },
  { icon: Webhook, label: "Webhooks", href: "/app/webhooks" },
  { icon: TerminalSquare, label: "CLI", href: "/app/cli" },
  { icon: Code2, label: "SDK", href: "/app/sdk" },
  { icon: PackageOpen, label: "Kit", href: "/app/parceiro/kit", labelKey: "nav.items.kit" },
  { icon: Share2, label: "Link de Visualização", href: "/app/parceiro/embed", labelKey: "nav.items.embed" },
  { icon: Shield, label: "Verificar DFID", href: "/app/verificar", labelKey: "nav.items.verify" },
  { icon: Building2, label: "Docs Governo", href: "/app/governo/docs" },
  { icon: Users, label: "Minhas Propriedades", href: "/app/claims" },
  { icon: Users, label: "Rebanho por Propriedade", href: "/app/propriedades/rebanho" },
  { icon: GitBranch, label: "Circuitos", href: "/app/circuitos" },
  { icon: GitBranch, label: "Meus Circuitos", href: "/app/meus-circuitos", labelKey: "nav.items.myCircuits" },
  { icon: Package, label: "Itens", href: "/app/itens", labelKey: "nav.items.items" },
  { icon: Activity, label: "Eventos", href: "/app/eventos" },
  { icon: Compass, label: "Descobrir", href: "/app/descobrir" },
  { icon: Shield, label: "Auditoria", href: "/app/auditoria" },
  { icon: Camera, label: "Snapshots", href: "/app/snapshots" },
  { icon: Landmark, label: "DeFarm Finance", href: "/app/finance" },
  { icon: ClipboardCheck, label: "DeFarm Compliance", href: "/app/compliance" },
  { icon: Trees, label: "EUDR — Polígono", href: "/app/eudr/poligono" },
];

const navByWorkspace: Record<WorkspaceType, string[]> = {
  partner: ["/app/parceiro", "/app/parceiro/ingestao", "/app/parceiro/roteamento", "/app/parceiro/logs", "/app/meus-circuitos", "/app/itens", "/app/parceiro/kit", "/app/parceiro/embed", "/app/cli", "/app/sdk", "https://docs.defarm.net/docs/getting-started", "/app/api-keys", "/app/webhooks"],
  producer: ["/app", "/app/claims", "/app/circuitos", "/app/itens", "/app/eventos", "/app/finance", "/app/compliance", "/app/eudr/poligono"],
  certifier: ["/app/claims", "/app/propriedades/rebanho", "/app/circuitos", "/app/itens", "/app/eventos", "/app/auditoria", "/app/compliance", "/app/eudr/poligono"],
  processor: ["/app/circuitos", "/app/itens", "/app/eventos", "/app/auditoria", "/app/finance", "/app/compliance", "/app/eudr/poligono"],
  government: ["/app/governo/docs", "/app/circuitos", "/app/itens", "/app/eventos", "/app/auditoria", "/app/compliance", "/app/eudr/poligono"],
};

// Menu lateral agrupado por seção (hoje só o parceiro). Onda A: dissolvemos as abas
// do Portal e demos a cada capacidade um lar coerente no menu, em vez do split
// arbitrário aba-vs-sidebar. Workspaces sem grupo caem no render liso (1 grupo sem
// label = lista plana, comportamento idêntico ao anterior).
type NavGroup = { label?: string; labelKey?: string; hrefs: string[]; collapsible?: boolean };
const navGroupsByWorkspace: Partial<Record<WorkspaceType, NavGroup[]>> = {
  // Fase 1 do redesign parceiro: menu enxuto — só o essencial visível (5 itens);
  // todo o resto vive em "Avançado" (colapsado, abre sozinho se a rota ativa
  // estiver lá dentro). Nenhuma rota mudou — só a navegação.
  partner: [
    { hrefs: ["/app/parceiro"] },
    { label: "Operar", labelKey: "nav.groups.operate", hrefs: ["/app/parceiro/ingestao", "/app/parceiro/logs"] },
    { label: "Catálogo", labelKey: "nav.groups.catalog", hrefs: ["/app/meus-circuitos", "/app/itens"] },
    {
      label: "Avançado",
      labelKey: "nav.groups.advanced",
      collapsible: true,
      hrefs: [
        "/app/parceiro/roteamento",
        "/app/parceiro/kit",
        "/app/parceiro/embed",
        "/app/cli",
        "/app/sdk",
        "https://docs.defarm.net/docs/getting-started",
        "/app/api-keys",
        "/app/webhooks",
        "/app/verificar",
      ],
    },
  ],
};

// Presentation for the role-based action menu (engines #119, decision D12). The
// backend (/me/capabilities) is the source of truth for WHICH sections a role
// has; the frontend owns label/icon/route here. Sections without an explicit
// route point to the Studio stub (#111).
// `route` ausente = ação ainda sem tela própria → NÃO exibimos (não oferecemos
// stub "em construção", #21). `personas` restringe um studio persona-específico
// (ex: emit.movement abre o OESA Studio, que só faz sentido pra government — #19).
const capabilityPresentation: Record<
  string,
  { label: string; icon: typeof BookOpen; route?: string; personas?: string[] }
> = {
  "emit.identity": { label: "Emitir brincos", icon: Fingerprint, route: "/app/studios/brinco" },
  "emit.termination": { label: "Registrar baixa", icon: Activity },
  "emit.attestation": { label: "Emitir atestado", icon: ClipboardCheck, route: "/app/studios/certificate" },
  "emit.seal": { label: "Conceder selo", icon: Shield, route: "/app/studios/selo" },
  "emit.slaughter": { label: "Registrar abate", icon: Activity },
  "emit.movement": { label: "Registrar movimentação", icon: Compass, route: "/app/studios/oesa", personas: ["government"] },
  "emit.husbandry": { label: "Registrar manejo", icon: Activity },
  "emit.transfer": { label: "Transferir posse", icon: GitBranch },
  "read.my_items": { label: "Meus itens", icon: Package, route: "/app/itens" },
  "read.my_attestations": { label: "Meus certificados", icon: ClipboardCheck },
  "read.prospect": { label: "Prospectar fornecedores", icon: Search },
  "read.dashboard": { label: "Painel", icon: BarChart3, route: "/app/oesa/dashboard" },
  // Score de crédito ainda não é funcional → não exibimos ao parceiro (route ausente =
  // não mostramos, mesmo padrão dos stubs). Visível só pro admin via adminNavItems.
  "read.score": { label: "Score de crédito", icon: Coins },
  "read.verify": { label: "Verificar DFID", icon: Shield, route: "/app/verificar" },
  "read.settings": { label: "Configurações", icon: Settings, route: "/app/configuracoes" },
};

const adminNavItems: NavItem[] = [
  { icon: Trees, label: "EUDR — Polígono", href: "/app/eudr/poligono" },
  { icon: BarChart3, label: "Métricas", href: "/app/admin/metricas" },
  { icon: GitBranch, label: "Circuitos", href: "/app/admin/circuitos" },
  { icon: ClipboardCheck, label: "Verificação de Claims", href: "/app/claims" },
  { icon: Search, label: "Busca/Analytics", href: "/app/admin/search-analytics" },
  { icon: Users, label: "Usuários", href: "/app/admin/usuarios" },
  { icon: Fingerprint, label: "Identificadores", href: "/app/admin/identificadores" },
  { icon: Layers, label: "Cadeias de Valor", href: "/app/admin/cadeias-valor" },
  { icon: Mail, label: "Leads de Contato", href: "/app/admin/leads-contato" },
  { icon: Database, label: "Payloads Parceiros", href: "/app/admin/payloads-parceiros" },
  { icon: Shield, label: "Higiene de Dados", href: "/app/admin/data-hygiene" },
  { icon: Coins, label: "Entitlements", href: "/app/admin/entitlements" },
  { icon: ListTodo, label: "Fila de Jobs", href: "/app/admin/jobs" },
  // Score de crédito: feature ainda não-funcional, escondida do parceiro; só admin vê
  // (pra trabalhar nela) até virar real.
  { icon: Coins, label: "Score de crédito", href: "/score" },
];

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading, logout, login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [demoSwitchLoading, setDemoSwitchLoading] = useState(false);
  // Grupos colapsáveis do menu (ex.: "Avançado" do parceiro). Sem entrada aqui,
  // o grupo abre sozinho quando a rota ativa mora dentro dele.
  const [openNavGroups, setOpenNavGroups] = useState<Record<string, boolean>>({});
  const workspaceType = user?.workspace_type || "producer";
  const workspaceMenu = navByWorkspace[workspaceType as WorkspaceType] ?? navByWorkspace.producer;
  const resolveNavItems = (hrefs: string[]) =>
    hrefs
      .map((href) => navCatalog.find((item) => item.href === href))
      .filter((item): item is NavItem => !!item);
  // Render agrupado quando o workspace tem seções (parceiro); senão, 1 grupo sem
  // label = lista plana (idêntico ao comportamento anterior).
  const navGroups: { label?: string; labelKey?: string; items: NavItem[]; collapsible?: boolean }[] = user?.is_admin
    ? []
    : (navGroupsByWorkspace[workspaceType as WorkspaceType] ?? [{ hrefs: workspaceMenu }]).map((g) => ({
        label: g.label,
        collapsible: g.collapsible,
        items: resolveNavItems(g.hrefs),
      }));
  // Item ativo = href interno mais específico (longest prefix) que casa com a rota
  // atual. Evita destaque duplo agora que sub-rotas do parceiro (ingestao/roteamento)
  // são itens próprios ao lado de "/app/parceiro".
  const activeHref = navGroups
    .flatMap((g) => g.items)
    .filter((item) => !item.external)
    .map((item) => item.href)
    .filter((href) => location.pathname === href || (href !== "/app" && location.pathname.startsWith(href + "/")))
    .sort((a, b) => b.length - a.length)[0];

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

  // Persona action menu (engines #119, D12): backend-driven, role-aware.
  const { data: capabilities } = useQuery({
    queryKey: ["my-capabilities"],
    queryFn: getMyCapabilities,
    enabled: isAuthenticated,
    staleTime: 300_000,
  });
  const actionSections = (capabilities?.sections ?? [])
    .map((s) => ({ key: s.key, ...capabilityPresentation[s.key] }))
    .filter(
      (
        s
      ): s is { key: string; label: string; icon: typeof BookOpen; route: string; personas?: string[] } =>
        // só exibe ações já com tela (route) e adequadas à persona atual.
        // 'read.settings' fica de fora: Configurações já tem entrada fixa no rodapé (evita duplicata).
        // 'read.verify' no parceiro fica de fora: Verificar DFID mora no grupo
        // Avançado do menu (redesign parceiro) — evita duplicata na seção Ações.
        s.key !== "read.settings" &&
        !(workspaceType === "partner" && s.key === "read.verify") &&
        Boolean(s.label) &&
        Boolean(s.route) &&
        (!s.personas || s.personas.includes(workspaceType))
    );

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

  // Gate do produtor (decisão Gabriel): produtor ainda não acessa o dashboard.
  // Recebe um popup bloqueante que só captura o CAR (claim + e-mail) — protege a
  // UX da concorrência e captura o lead. Admin e demais papéis seguem normais.
  // Para liberar o dashboard depois, basta remover este early-return.
  if (!user?.is_admin && workspaceType === "producer") {
    return (
      <ProducerGate
        userName={user?.full_name || user?.username || ""}
        userEmail={user?.email || ""}
        onLogout={handleLogout}
      />
    );
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
          {navGroups.map((group, gi) => {
            const containsActive = group.items.some(
              (item) => !item.external && item.href === activeHref
            );
            // Colapsável fechado por padrão; abre por clique ou quando a rota
            // ativa está dentro dele (pra nunca esconder o item destacado).
            const isOpen = !group.collapsible || (openNavGroups[group.label ?? ""] ?? containsActive);
            return (
            <div key={group.label ?? `group-${gi}`} className={cn("space-y-1", gi > 0 && "pt-3")}>
              {group.label ? (
                group.collapsible ? (
                  <button
                    type="button"
                    onClick={() =>
                      setOpenNavGroups((prev) => ({ ...prev, [group.label!]: !isOpen }))
                    }
                    className="w-full flex items-center justify-between pb-1 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {group.labelKey ? t(group.labelKey, { defaultValue: group.label }) : group.label}
                    </span>
                    <ChevronRight
                      className={cn(
                        "h-3.5 w-3.5 text-muted-foreground transition-transform",
                        isOpen && "rotate-90"
                      )}
                    />
                  </button>
                ) : (
                  <div className="pb-1 px-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {group.labelKey ? t(group.labelKey, { defaultValue: group.label }) : group.label}
                    </span>
                  </div>
                )
              ) : null}
              {isOpen && group.items.map((item) => {
                const isActive = !item.external && item.href === activeHref;

                if (item.external) {
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <item.icon className="h-5 w-5" />
                      {item.labelKey ? t(item.labelKey, { defaultValue: item.label }) : item.label}
                      <ExternalLink className="h-4 w-4 ml-auto" />
                    </a>
                  );
                }

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
                    {item.labelKey ? t(item.labelKey, { defaultValue: item.label }) : item.label}
                    {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                  </Link>
                );
              })}
            </div>
            );
          })}

          {/* Ações da persona — backend-driven (capabilities, #119) */}
          {!user?.is_admin && actionSections.length > 0 && (
            <>
              <div className="pt-4 pb-1 px-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("nav.groups.actions", { defaultValue: "Ações" })}
                </span>
              </div>
              {actionSections.map((item) => {
                const href = item.route;
                const isActive = location.pathname === href;
                return (
                  <Link
                    key={item.key}
                    to={href}
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
                  </Link>
                );
              })}
            </>
          )}

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
                    {item.labelKey ? t(item.labelKey, { defaultValue: item.label }) : item.label}
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
                {user?.email} · {user?.is_admin ? `admin · ${workspaceType}` : workspaceType}
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
              {t("nav.items.settings", { defaultValue: "Configurações" })}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
              aria-label={t("nav.logout", { defaultValue: "Sair" })}
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
              <span>{t("nav.emailBanner.text", { defaultValue: "Seu email ainda não foi verificado. Verifique para aumentar a segurança da conta." })}</span>
              <Button variant="outline" size="sm" onClick={handleResendVerification}>
                {t("nav.emailBanner.cta", { defaultValue: "Reenviar verificação" })}
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
