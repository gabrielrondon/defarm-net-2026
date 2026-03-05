import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";

// Public pages
import Index from "./pages/Index";
import Onboarding from "./pages/Onboarding";
import Solucoes from "./pages/Solucoes";
import Sobre from "./pages/Sobre";
import Contato from "./pages/Contato";
import Privacidade from "./pages/Privacidade";
import Termos from "./pages/Termos";
import LogoPack from "./pages/LogoPack";
import Login from "./pages/Login";
import Login2FA from "./pages/Login2FA";
import Cadastro from "./pages/Cadastro";
import EsqueciSenha from "./pages/EsqueciSenha";
import ResetSenha from "./pages/ResetSenha";
import VerificarEmail from "./pages/VerificarEmail";
import NotFound from "./pages/NotFound";
import DemoAcessos from "./pages/DemoAcessos";
import DemoNarrativa from "./pages/DemoNarrativa";
import StellarOverview from "./pages/StellarOverview";
import StellarTranche1 from "./pages/StellarTranche1";
import StellarTranche2 from "./pages/StellarTranche2";

// App pages

import Caderneta from "./pages/app/Caderneta";
import CircuitosList from "./pages/app/CircuitosList";
import CircuitoDetail from "./pages/app/CircuitoDetail";
import NovoCircuito from "./pages/app/NovoCircuito";
import EditarCircuito from "./pages/app/EditarCircuito";
import ItensList from "./pages/app/ItensList";
import ItemDetail from "./pages/app/ItemDetail";
import NovoItem from "./pages/app/NovoItem";
import EventosList from "./pages/app/EventosList";
import AuditTrail from "./pages/app/AuditTrail";
import SnapshotsList from "./pages/app/SnapshotsList";
import MerkleTreesList from "./pages/app/MerkleTreesList";
import ApiKeys from "./pages/app/ApiKeys";
import Configuracoes from "./pages/app/Configuracoes";
import FinanceDashboard from "./pages/app/FinanceDashboard";
import FinanceCreditLines from "./pages/app/FinanceCreditLines";
import FinanceSimulador from "./pages/app/FinanceSimulador";
import FinanceAnalise from "./pages/app/FinanceAnalise";
import ComplianceCheck from "./pages/app/ComplianceCheck";
import CircuitDiscovery from "./pages/app/CircuitDiscovery";
import JoinRequestsAdmin from "./pages/app/JoinRequestsAdmin";
import PublicCircuit from "./pages/PublicCircuit";
import PublicItem from "./pages/PublicItem";
import EmbedPortfolio from "./pages/EmbedPortfolio";
import AdminMetrics from "./pages/app/AdminMetrics";
import AdminUsers from "./pages/app/AdminUsers";
import AdminCanonicalIdentifiers from "./pages/app/AdminCanonicalIdentifiers";
import AdminJobs from "./pages/app/AdminJobs";
import AdminSearchAnalytics from "./pages/app/AdminSearchAnalytics";
import AdminPartnerPayloads from "./pages/app/AdminPartnerPayloads";
import PartnerPortal from "./pages/app/PartnerPortal";
import WebhooksPage from "./pages/app/Webhooks";
import PartnerCliPage from "./pages/app/PartnerCli";
import PartnerSdkPage from "./pages/app/PartnerSdk";
import PartnerDocs from "./pages/app/PartnerDocs";
import PartnerLogs from "./pages/app/PartnerLogs";
import OwnershipClaims from "./pages/app/OwnershipClaims";
import PropertyHerd from "./pages/app/PropertyHerd";

const queryClient = new QueryClient(); // init
type WorkspaceType = "partner" | "producer" | "processor" | "certifier";

function TokenAwareIndex() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const resetToken = params.get("reset_token");
    const verifyToken = params.get("verify_token");
    const emailChangeToken = params.get("email_change_token");

    if (resetToken) {
      navigate(`/reset-senha?token=${encodeURIComponent(resetToken)}`, { replace: true });
      return;
    }

    if (verifyToken) {
      navigate(`/verificar-email?token=${encodeURIComponent(verifyToken)}`, { replace: true });
      return;
    }

    if (emailChangeToken) {
      navigate(`/verificar-email?email_change_token=${encodeURIComponent(emailChangeToken)}`, { replace: true });
      return;
    }

    const isPartnerHost =
      typeof window !== "undefined" &&
      window.location.hostname.toLowerCase() === "partners.defarm.net";
    if (isPartnerHost) {
      navigate("/partner-login", { replace: true });
    }
  }, [location.search, navigate]);

  return <Index />;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.is_admin) return <Navigate to="/app" replace />;
  return children;
}

function RequireWorkspaceAccess({
  children,
  allowed,
}: {
  children: ReactNode;
  allowed: WorkspaceType[];
}) {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.is_admin && !allowed.includes((user?.workspace_type || "producer") as WorkspaceType)) {
    return <Navigate to="/app" replace />;
  }
  return children;
}

function WorkspaceHome() {
  const { isLoading, isAuthenticated, user } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.is_admin) {
    if (user?.workspace_type === "partner") return <Navigate to="/app/parceiro" replace />;
    if (user?.workspace_type === "certifier") return <Navigate to="/app/claims" replace />;
    if (user?.workspace_type === "processor") return <Navigate to="/app/eventos" replace />;
  }
  return <Caderneta />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<TokenAwareIndex />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/solucoes" element={<Solucoes />} />
            <Route path="/sobre" element={<Sobre />} />
            <Route path="/contato" element={<Contato />} />
            <Route path="/privacidade" element={<Privacidade />} />
            <Route path="/termos" element={<Termos />} />
            <Route path="/logo-pack" element={<LogoPack />} />
            <Route path="/c/:id" element={<PublicCircuit />} />
            <Route path="/i/:dfid" element={<PublicItem />} />
            <Route path="/embed/portfolio" element={<EmbedPortfolio />} />
            <Route path="/login" element={<Login />} />
            <Route path="/login/2fa" element={<Login2FA />} />
            <Route path="/entrar" element={<Navigate to="/login" replace />} />
            <Route path="/partner-login" element={<Login forcedMode="partner" />} />
            <Route path="/parceiros/login" element={<Login forcedMode="partner" />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/reset-senha" element={<ResetSenha />} />
            <Route path="/verificar-email" element={<VerificarEmail />} />
            <Route path="/_demo/acessos" element={<DemoAcessos />} />
            <Route path="/_demo/acessos/:actorType" element={<DemoAcessos />} />
            <Route path="/_demo/narrativa" element={<DemoNarrativa />} />
            <Route path="/_demo/narrativa/:actorType" element={<DemoNarrativa />} />
            <Route path="/stellar" element={<StellarOverview />} />
            <Route path="/stellar/tranche1" element={<StellarTranche1 />} />
            <Route path="/stellar/tranche2" element={<StellarTranche2 />} />
            
            {/* App routes (protected) */}
            <Route path="/app" element={<AppLayout><WorkspaceHome /></AppLayout>} />
            <Route
              path="/app/caderneta"
              element={
                <RequireWorkspaceAccess allowed={["producer"]}>
                  <AppLayout><Caderneta /></AppLayout>
                </RequireWorkspaceAccess>
              }
            />
            
            <Route
              path="/app/descobrir"
              element={
                <RequireWorkspaceAccess allowed={["producer", "processor", "certifier"]}>
                  <AppLayout><CircuitDiscovery /></AppLayout>
                </RequireWorkspaceAccess>
              }
            />
            <Route
              path="/app/circuitos"
              element={
                <RequireWorkspaceAccess allowed={["producer", "partner", "processor", "certifier"]}>
                  <AppLayout><CircuitosList /></AppLayout>
                </RequireWorkspaceAccess>
              }
            />
            <Route
              path="/app/circuitos/novo"
              element={
                <RequireWorkspaceAccess allowed={["producer", "partner", "processor", "certifier"]}>
                  <AppLayout><NovoCircuito /></AppLayout>
                </RequireWorkspaceAccess>
              }
            />
            <Route
              path="/app/circuitos/:id"
              element={
                <RequireWorkspaceAccess allowed={["producer", "partner", "processor", "certifier"]}>
                  <AppLayout><CircuitoDetail /></AppLayout>
                </RequireWorkspaceAccess>
              }
            />
            <Route
              path="/app/circuitos/:id/editar"
              element={
                <RequireWorkspaceAccess allowed={["producer", "partner", "processor", "certifier"]}>
                  <AppLayout><EditarCircuito /></AppLayout>
                </RequireWorkspaceAccess>
              }
            />
            <Route
              path="/app/circuitos/:id/solicitacoes"
              element={
                <RequireWorkspaceAccess allowed={["producer", "partner", "processor", "certifier"]}>
                  <AppLayout><JoinRequestsAdmin /></AppLayout>
                </RequireWorkspaceAccess>
              }
            />
            <Route
              path="/app/itens"
              element={
                <RequireWorkspaceAccess allowed={["producer", "partner", "processor", "certifier"]}>
                  <AppLayout><ItensList /></AppLayout>
                </RequireWorkspaceAccess>
              }
            />
            <Route
              path="/app/itens/novo"
              element={
                <RequireWorkspaceAccess allowed={["producer", "partner", "processor", "certifier"]}>
                  <AppLayout><NovoItem /></AppLayout>
                </RequireWorkspaceAccess>
              }
            />
            <Route
              path="/app/itens/:id"
              element={
                <RequireWorkspaceAccess allowed={["producer", "partner", "processor", "certifier"]}>
                  <AppLayout><ItemDetail /></AppLayout>
                </RequireWorkspaceAccess>
              }
            />
            <Route
              path="/app/claims"
              element={
                <RequireWorkspaceAccess allowed={["producer", "certifier"]}>
                  <AppLayout><OwnershipClaims /></AppLayout>
                </RequireWorkspaceAccess>
              }
            />
            <Route
              path="/app/propriedades/rebanho"
              element={
                <RequireWorkspaceAccess allowed={["certifier"]}>
                  <AppLayout><PropertyHerd /></AppLayout>
                </RequireWorkspaceAccess>
              }
            />
            <Route
              path="/app/eventos"
              element={
                <RequireWorkspaceAccess allowed={["producer", "partner", "processor", "certifier"]}>
                  <AppLayout><EventosList /></AppLayout>
                </RequireWorkspaceAccess>
              }
            />
            <Route
              path="/app/auditoria"
              element={
                <RequireWorkspaceAccess allowed={["producer", "processor", "certifier"]}>
                  <AppLayout><AuditTrail /></AppLayout>
                </RequireWorkspaceAccess>
              }
            />
            <Route
              path="/app/snapshots"
              element={
                <RequireWorkspaceAccess allowed={["producer", "certifier"]}>
                  <AppLayout><SnapshotsList /></AppLayout>
                </RequireWorkspaceAccess>
              }
            />
            
            <Route
              path="/app/finance"
              element={
                <RequireWorkspaceAccess allowed={["producer", "processor"]}>
                  <AppLayout><FinanceDashboard /></AppLayout>
                </RequireWorkspaceAccess>
              }
            />
            <Route
              path="/app/finance/linhas-credito"
              element={
                <RequireWorkspaceAccess allowed={["producer", "processor"]}>
                  <AppLayout><FinanceCreditLines /></AppLayout>
                </RequireWorkspaceAccess>
              }
            />
            <Route
              path="/app/finance/simulador"
              element={
                <RequireWorkspaceAccess allowed={["producer", "processor"]}>
                  <AppLayout><FinanceSimulador /></AppLayout>
                </RequireWorkspaceAccess>
              }
            />
            <Route
              path="/app/finance/analise"
              element={
                <RequireWorkspaceAccess allowed={["producer", "processor"]}>
                  <AppLayout><FinanceAnalise /></AppLayout>
                </RequireWorkspaceAccess>
              }
            />
            
            <Route
              path="/app/compliance"
              element={
                <RequireWorkspaceAccess allowed={["producer", "processor", "certifier"]}>
                  <AppLayout><ComplianceCheck /></AppLayout>
                </RequireWorkspaceAccess>
              }
            />
            
            <Route
              path="/app/api-keys"
              element={
                <RequireWorkspaceAccess allowed={["partner"]}>
                  <AppLayout><ApiKeys /></AppLayout>
                </RequireWorkspaceAccess>
              }
            />
            <Route
              path="/app/parceiro"
              element={
                <RequireWorkspaceAccess allowed={["partner"]}>
                  <AppLayout><PartnerPortal /></AppLayout>
                </RequireWorkspaceAccess>
              }
            />
            <Route
              path="/app/parceiro/logs"
              element={
                <RequireWorkspaceAccess allowed={["partner"]}>
                  <AppLayout><PartnerLogs /></AppLayout>
                </RequireWorkspaceAccess>
              }
            />
            <Route
              path="/app/webhooks"
              element={
                <RequireWorkspaceAccess allowed={["partner"]}>
                  <AppLayout><WebhooksPage /></AppLayout>
                </RequireWorkspaceAccess>
              }
            />
            <Route
              path="/app/cli"
              element={
                <RequireWorkspaceAccess allowed={["partner"]}>
                  <AppLayout><PartnerCliPage /></AppLayout>
                </RequireWorkspaceAccess>
              }
            />
            <Route
              path="/app/sdk"
              element={
                <RequireWorkspaceAccess allowed={["partner"]}>
                  <AppLayout><PartnerSdkPage /></AppLayout>
                </RequireWorkspaceAccess>
              }
            />
            <Route
              path="/app/docs"
              element={
                <RequireWorkspaceAccess allowed={["partner"]}>
                  <AppLayout><PartnerDocs /></AppLayout>
                </RequireWorkspaceAccess>
              }
            />
            <Route path="/app/configuracoes" element={<AppLayout><Configuracoes /></AppLayout>} />
            
            {/* Admin routes */}
            <Route
              path="/app/admin/metricas"
              element={
                <RequireAdmin>
                  <AppLayout><AdminMetrics /></AppLayout>
                </RequireAdmin>
              }
            />
            <Route
              path="/app/admin/usuarios"
              element={
                <RequireAdmin>
                  <AppLayout><AdminUsers /></AppLayout>
                </RequireAdmin>
              }
            />
            <Route
              path="/app/admin/identificadores"
              element={
                <RequireAdmin>
                  <AppLayout><AdminCanonicalIdentifiers /></AppLayout>
                </RequireAdmin>
              }
            />
            <Route
              path="/app/admin/jobs"
              element={
                <RequireAdmin>
                  <AppLayout><AdminJobs /></AppLayout>
                </RequireAdmin>
              }
            />
            <Route
              path="/app/admin/search-analytics"
              element={
                <RequireAdmin>
                  <AppLayout><AdminSearchAnalytics /></AppLayout>
                </RequireAdmin>
              }
            />
            <Route
              path="/app/admin/payloads-parceiros"
              element={
                <RequireAdmin>
                  <AppLayout><AdminPartnerPayloads /></AppLayout>
                </RequireAdmin>
              }
            />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
