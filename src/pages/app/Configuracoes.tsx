import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Settings,
  User,
  Building2,
  Bell,
  Shield,
  LogOut,
  Save,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type SettingsTab = "perfil" | "workspace" | "notificacoes" | "seguranca";

interface TabButtonProps {
  icon: typeof User;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function TabButton({ icon: Icon, label, isActive, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}

export default function Configuracoes() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>("perfil");
  const [isLoading, setIsLoading] = useState(false);

  // Profile state
  const [displayName, setDisplayName] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");

  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [circuitUpdates, setCircuitUpdates] = useState(true);
  const [itemAlerts, setItemAlerts] = useState(true);

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      // Simulated API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast({
        title: "Perfil atualizado",
        description: "Suas alterações foram salvas com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "perfil":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">Perfil</h2>
              <p className="text-sm text-muted-foreground">
                Gerencie suas informações pessoais
              </p>
            </div>

            <div className="bg-background border border-border rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">
                    {user?.username?.charAt(0).toUpperCase() || "U"}
                  </span>
                </div>
                <div>
                  <p className="text-lg font-medium text-foreground">{user?.username}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Nome de exibição</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Seu nome"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <Button
                disabled
                className="btn-offset bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                title="Em breve"
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar alterações
              </Button>
              <p className="text-xs text-muted-foreground italic">Funcionalidade em breve</p>
            </div>
          </div>
        );

      case "workspace":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">Workspace</h2>
              <p className="text-sm text-muted-foreground">
                Configurações do seu espaço de trabalho
              </p>
            </div>

            <div className="bg-background border border-border rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-4 pb-4 border-b border-border">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-medium text-foreground">
                    {user?.workspace_id || "Meu Workspace"}
                  </p>
                  <p className="text-sm text-muted-foreground">Plano: Starter</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg opacity-50">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Membros</p>
                    <p className="text-xs text-muted-foreground">
                      Gerencie os membros do seu workspace
                    </p>
                  </div>
                  <Button variant="outline" size="sm" disabled>
                    Em breve
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-foreground">API Keys</p>
                    <p className="text-xs text-muted-foreground">
                      Chaves de acesso para integração
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Ver chaves
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg opacity-50">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Uso e limites</p>
                    <p className="text-xs text-muted-foreground">
                      Veja seu consumo de recursos
                    </p>
                  </div>
                  <Button variant="outline" size="sm" disabled>
                    Em breve
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      case "notificacoes":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">Notificações</h2>
              <p className="text-sm text-muted-foreground">
                Configure como você quer ser notificado
              </p>
            </div>

            <div className="bg-background border border-border rounded-2xl p-6 space-y-4 opacity-50">
              <p className="text-xs text-muted-foreground italic mb-2">Funcionalidade em breve</p>
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Notificações por email
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Receba atualizações importantes no seu email
                  </p>
                </div>
                <Switch checked={emailNotifications} disabled />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Push notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Notificações no navegador
                  </p>
                </div>
                <Switch checked={pushNotifications} disabled />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Atualizações de circuitos
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Quando itens são adicionados ou removidos
                  </p>
                </div>
                <Switch checked={circuitUpdates} disabled />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Alertas de itens</p>
                  <p className="text-xs text-muted-foreground">
                    Quando itens são tokenizados ou deprecados
                  </p>
                </div>
                <Switch checked={itemAlerts} disabled />
              </div>
            </div>
          </div>
        );

      case "seguranca":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">Segurança</h2>
              <p className="text-sm text-muted-foreground">
                Proteja sua conta
              </p>
            </div>

            <div className="bg-background border border-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg opacity-50">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Alterar senha</p>
                  <p className="text-xs text-muted-foreground">
                    Atualize sua senha regularmente
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Em breve
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg opacity-50">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Autenticação em dois fatores
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Adicione uma camada extra de segurança
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Em breve
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">Sessões ativas</p>
                  <p className="text-xs text-muted-foreground">
                    Veja onde sua conta está conectada
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Ver sessões
                </Button>
              </div>
            </div>

            <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">Zona de perigo</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Ações irreversíveis para sua conta
              </p>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="text-destructive border-destructive/50 hover:bg-destructive/10"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair da conta
                </Button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
            <p className="text-muted-foreground">Gerencie sua conta e preferências</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="md:col-span-1">
          <div className="bg-background border border-border rounded-2xl p-3 space-y-1">
            <TabButton
              icon={User}
              label="Perfil"
              isActive={activeTab === "perfil"}
              onClick={() => setActiveTab("perfil")}
            />
            <TabButton
              icon={Building2}
              label="Workspace"
              isActive={activeTab === "workspace"}
              onClick={() => setActiveTab("workspace")}
            />
            <TabButton
              icon={Bell}
              label="Notificações"
              isActive={activeTab === "notificacoes"}
              onClick={() => setActiveTab("notificacoes")}
            />
            <TabButton
              icon={Shield}
              label="Segurança"
              isActive={activeTab === "seguranca"}
              onClick={() => setActiveTab("seguranca")}
            />
          </div>
        </div>

        {/* Main content */}
        <div className="md:col-span-3">{renderContent()}</div>
      </div>
    </div>
  );
}
