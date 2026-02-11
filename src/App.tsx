import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
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
import NotFound from "./pages/NotFound";

// App pages
import Dashboard from "./pages/app/Dashboard";
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

const queryClient = new QueryClient(); // init

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/solucoes" element={<Solucoes />} />
            <Route path="/sobre" element={<Sobre />} />
            <Route path="/contato" element={<Contato />} />
            <Route path="/privacidade" element={<Privacidade />} />
            <Route path="/termos" element={<Termos />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
            
            {/* App routes (protected) */}
            <Route path="/app" element={<AppLayout><Dashboard /></AppLayout>} />
            <Route path="/app/circuitos" element={<AppLayout><CircuitosList /></AppLayout>} />
            <Route path="/app/circuitos/novo" element={<AppLayout><NovoCircuito /></AppLayout>} />
            <Route path="/app/circuitos/:id" element={<AppLayout><CircuitoDetail /></AppLayout>} />
            <Route path="/app/circuitos/:id/editar" element={<AppLayout><EditarCircuito /></AppLayout>} />
            <Route path="/app/itens" element={<AppLayout><ItensList /></AppLayout>} />
            <Route path="/app/itens/novo" element={<AppLayout><NovoItem /></AppLayout>} />
            <Route path="/app/itens/:id" element={<AppLayout><ItemDetail /></AppLayout>} />
            <Route path="/app/eventos" element={<AppLayout><EventosList /></AppLayout>} />
            <Route path="/app/auditoria" element={<AppLayout><AuditTrail /></AppLayout>} />
            <Route path="/app/snapshots" element={<AppLayout><SnapshotsList /></AppLayout>} />
            
            <Route path="/app/finance" element={<AppLayout><FinanceDashboard /></AppLayout>} />
            <Route path="/app/finance/linhas-credito" element={<AppLayout><FinanceCreditLines /></AppLayout>} />
            <Route path="/app/finance/simulador" element={<AppLayout><FinanceSimulador /></AppLayout>} />
            <Route path="/app/finance/analise" element={<AppLayout><FinanceAnalise /></AppLayout>} />
            
            <Route path="/app/compliance" element={<AppLayout><ComplianceCheck /></AppLayout>} />
            
            <Route path="/app/api-keys" element={<AppLayout><ApiKeys /></AppLayout>} />
            <Route path="/app/configuracoes" element={<AppLayout><Configuracoes /></AppLayout>} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
