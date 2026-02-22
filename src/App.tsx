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
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import EsqueciSenha from "./pages/EsqueciSenha";
import ResetSenha from "./pages/ResetSenha";
import VerificarEmail from "./pages/VerificarEmail";
import NotFound from "./pages/NotFound";

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
import AdminMetrics from "./pages/app/AdminMetrics";
import AdminUsers from "./pages/app/AdminUsers";
import AdminCanonicalIdentifiers from "./pages/app/AdminCanonicalIdentifiers";
import AdminJobs from "./pages/app/AdminJobs";
import PartnerPortal from "./pages/app/PartnerPortal";
import OwnershipClaims from "./pages/app/OwnershipClaims";
import PropertyHerd from "./pages/app/PropertyHerd";

const queryClient = new QueryClient(); // init

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

function RequirePartnerOrAdmin({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.is_admin && user?.workspace_type !== "partner") {
    return <Navigate to="/app" replace />;
  }
  return children;
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
            <Route path="/c/:id" element={<PublicCircuit />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/reset-senha" element={<ResetSenha />} />
            <Route path="/verificar-email" element={<VerificarEmail />} />
            
            {/* App routes (protected) */}
            <Route path="/app" element={<AppLayout><Caderneta /></AppLayout>} />
            <Route path="/app/caderneta" element={<AppLayout><Caderneta /></AppLayout>} />
            
            <Route path="/app/descobrir" element={<AppLayout><CircuitDiscovery /></AppLayout>} />
            <Route path="/app/circuitos" element={<AppLayout><CircuitosList /></AppLayout>} />
            <Route path="/app/circuitos/novo" element={<AppLayout><NovoCircuito /></AppLayout>} />
            <Route path="/app/circuitos/:id" element={<AppLayout><CircuitoDetail /></AppLayout>} />
            <Route path="/app/circuitos/:id/editar" element={<AppLayout><EditarCircuito /></AppLayout>} />
            <Route path="/app/circuitos/:id/solicitacoes" element={<AppLayout><JoinRequestsAdmin /></AppLayout>} />
            <Route path="/app/itens" element={<AppLayout><ItensList /></AppLayout>} />
            <Route path="/app/itens/novo" element={<AppLayout><NovoItem /></AppLayout>} />
            <Route path="/app/itens/:id" element={<AppLayout><ItemDetail /></AppLayout>} />
            <Route path="/app/claims" element={<AppLayout><OwnershipClaims /></AppLayout>} />
            <Route path="/app/propriedades/rebanho" element={<AppLayout><PropertyHerd /></AppLayout>} />
            <Route path="/app/eventos" element={<AppLayout><EventosList /></AppLayout>} />
            <Route path="/app/auditoria" element={<AppLayout><AuditTrail /></AppLayout>} />
            <Route path="/app/snapshots" element={<AppLayout><SnapshotsList /></AppLayout>} />
            
            <Route path="/app/finance" element={<AppLayout><FinanceDashboard /></AppLayout>} />
            <Route path="/app/finance/linhas-credito" element={<AppLayout><FinanceCreditLines /></AppLayout>} />
            <Route path="/app/finance/simulador" element={<AppLayout><FinanceSimulador /></AppLayout>} />
            <Route path="/app/finance/analise" element={<AppLayout><FinanceAnalise /></AppLayout>} />
            
            <Route path="/app/compliance" element={<AppLayout><ComplianceCheck /></AppLayout>} />
            
            <Route path="/app/api-keys" element={<AppLayout><ApiKeys /></AppLayout>} />
            <Route
              path="/app/parceiro"
              element={
                <RequirePartnerOrAdmin>
                  <AppLayout><PartnerPortal /></AppLayout>
                </RequirePartnerOrAdmin>
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
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
