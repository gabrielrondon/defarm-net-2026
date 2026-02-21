import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Monitor,
  Smartphone,
  Globe,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  addWorkspaceMember,
  changePassword,
  getNotificationPreferences,
  getTwoFaStatus,
  listMySessions,
  listMyWorkspaces,
  listWorkspaceMembers,
  removeWorkspaceMember,
  regenerateRecoveryCodes,
  requestEmailChange,
  requestEmailVerification,
  revokeAllMySessions,
  revokeMySession,
  setupTwoFa,
  enableTwoFa,
  disableTwoFa,
  updateNotificationPreferences,
  updateProfile,
  updateWorkspaceMemberRole,
} from "@/lib/defarm-api";
import type {
  AuthSession,
  UserWorkspaceSummary,
  WorkspaceMemberInfo,
} from "@/lib/defarm-api";

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
  const { user, logout, setUserData, switchWorkspace } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>("perfil");
  const [isLoading, setIsLoading] = useState(false);

  // Profile state
  const [displayName, setDisplayName] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [twofaEnabled, setTwofaEnabled] = useState(false);
  const [twofaRecoveryRemaining, setTwofaRecoveryRemaining] = useState(0);
  const [twofaSetupSecret, setTwofaSetupSecret] = useState("");
  const [twofaSetupUrl, setTwofaSetupUrl] = useState("");
  const [twofaCode, setTwofaCode] = useState("");
  const [twofaPassword, setTwofaPassword] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [twofaLoading, setTwofaLoading] = useState(false);

  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [circuitUpdates, setCircuitUpdates] = useState(true);
  const [itemAlerts, setItemAlerts] = useState(true);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsSaving, setNotificationsSaving] = useState(false);

  // Sessions state
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [workspaces, setWorkspaces] = useState<UserWorkspaceSummary[]>([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(false);
  const [workspaceSwitchLoading, setWorkspaceSwitchLoading] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMemberInfo[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<"admin" | "member">("member");
  const [memberActionLoading, setMemberActionLoading] = useState(false);
  const [emailVerifyLoading, setEmailVerifyLoading] = useState(false);

  const handleViewSessions = async () => {
    setSessionsLoading(true);
    try {
      const data = await listMySessions();
      setSessions(data.sessions);
      setSessionsOpen(true);
    } catch (err) {
      toast({
        title: "Erro ao carregar sessões",
        description: "Não foi possível buscar as sessões ativas.",
        variant: "destructive",
      });
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleLoadWorkspaces = async () => {
    setWorkspacesLoading(true);
    try {
      const data = await listMyWorkspaces();
      setWorkspaces(data.workspaces);
    } catch (error) {
      toast({
        title: "Falha ao carregar workspaces",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setWorkspacesLoading(false);
    }
  };

  const handleSwitchWorkspace = async (workspaceId: string) => {
    setWorkspaceSwitchLoading(true);
    try {
      await switchWorkspace(workspaceId);
      await handleLoadWorkspaces();
      toast({
        title: "Workspace alterado",
        description: "Seu contexto foi atualizado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Falha ao trocar workspace",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setWorkspaceSwitchLoading(false);
    }
  };

  const handleRequestEmailVerification = async () => {
    setEmailVerifyLoading(true);
    try {
      const res = await requestEmailVerification();
      toast({
        title: "Verificação enviada",
        description: res.message,
      });
    } catch (error) {
      toast({
        title: "Falha ao enviar verificação",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setEmailVerifyLoading(false);
    }
  };

  const handleRequestEmailChange = async () => {
    if (!newEmail.trim()) {
      toast({
        title: "Informe um email",
        description: "Digite o novo email para enviar a verificação.",
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await requestEmailChange({ new_email: newEmail.trim() });
      toast({
        title: "Verificação enviada",
        description: res.message,
      });
      setNewEmail("");
    } catch (error) {
      toast({
        title: "Falha ao solicitar troca de email",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleLoadWorkspaceMembers = async () => {
    setMembersLoading(true);
    try {
      const data = await listWorkspaceMembers();
      setWorkspaceMembers(data.members);
    } catch (error) {
      toast({
        title: "Falha ao carregar membros",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setMembersLoading(false);
    }
  };

  const handleAddWorkspaceMember = async () => {
    if (!memberEmail.trim()) {
      toast({
        title: "Informe o email do membro",
        variant: "destructive",
      });
      return;
    }
    setMemberActionLoading(true);
    try {
      await addWorkspaceMember({ email: memberEmail.trim(), role: memberRole });
      setMemberEmail("");
      await handleLoadWorkspaceMembers();
      toast({
        title: "Membro adicionado",
      });
    } catch (error) {
      toast({
        title: "Falha ao adicionar membro",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setMemberActionLoading(false);
    }
  };

  const handleUpdateMemberRole = async (memberUserId: string, role: "owner" | "admin" | "member") => {
    setMemberActionLoading(true);
    try {
      await updateWorkspaceMemberRole(memberUserId, role);
      await handleLoadWorkspaceMembers();
      toast({ title: "Papel atualizado" });
    } catch (error) {
      toast({
        title: "Falha ao atualizar papel",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setMemberActionLoading(false);
    }
  };

  const handleRemoveWorkspaceMember = async (memberUserId: string) => {
    setMemberActionLoading(true);
    try {
      await removeWorkspaceMember(memberUserId);
      await handleLoadWorkspaceMembers();
      toast({ title: "Membro removido" });
    } catch (error) {
      toast({
        title: "Falha ao remover membro",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setMemberActionLoading(false);
    }
  };

  const handleLoadNotificationPreferences = async () => {
    setNotificationsLoading(true);
    try {
      const prefs = await getNotificationPreferences();
      setEmailNotifications(prefs.email_notifications);
      setPushNotifications(prefs.push_notifications);
      setCircuitUpdates(prefs.circuit_updates);
      setItemAlerts(prefs.item_alerts);
    } catch (error) {
      toast({
        title: "Falha ao carregar notificações",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleSaveNotificationPreferences = async () => {
    setNotificationsSaving(true);
    try {
      await updateNotificationPreferences({
        email_notifications: emailNotifications,
        push_notifications: pushNotifications,
        circuit_updates: circuitUpdates,
        item_alerts: itemAlerts,
      });
      toast({
        title: "Preferências salvas",
      });
    } catch (error) {
      toast({
        title: "Falha ao salvar notificações",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setNotificationsSaving(false);
    }
  };

  const handleLoadTwoFaStatus = async () => {
    try {
      const status = await getTwoFaStatus();
      setTwofaEnabled(status.enabled);
      setTwofaRecoveryRemaining(status.recovery_codes_remaining);
    } catch (error) {
      toast({
        title: "Falha ao carregar status de 2FA",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleStartTwoFaSetup = async () => {
    setTwofaLoading(true);
    try {
      const setup = await setupTwoFa();
      setTwofaSetupSecret(setup.secret);
      setTwofaSetupUrl(setup.otpauth_url);
      toast({
        title: "Setup 2FA iniciado",
        description: "Adicione o segredo no autenticador e confirme com um código.",
      });
    } catch (error) {
      toast({
        title: "Falha ao iniciar 2FA",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setTwofaLoading(false);
    }
  };

  const handleEnableTwoFa = async () => {
    if (!twofaCode.trim()) return;
    setTwofaLoading(true);
    try {
      const res = await enableTwoFa(twofaCode.trim());
      setRecoveryCodes(res.recovery_codes);
      setTwofaCode("");
      setTwofaSetupSecret("");
      setTwofaSetupUrl("");
      await handleLoadTwoFaStatus();
      toast({ title: "2FA ativado", description: "Guarde os recovery codes com segurança." });
    } catch (error) {
      toast({
        title: "Falha ao ativar 2FA",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setTwofaLoading(false);
    }
  };

  const handleDisableTwoFa = async () => {
    if (!twofaPassword.trim()) return;
    setTwofaLoading(true);
    try {
      const res = await disableTwoFa(twofaPassword.trim());
      setTwofaPassword("");
      setRecoveryCodes([]);
      await handleLoadTwoFaStatus();
      toast({ title: "2FA desativado", description: res.message });
    } catch (error) {
      toast({
        title: "Falha ao desativar 2FA",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setTwofaLoading(false);
    }
  };

  const handleRegenerateRecoveryCodes = async () => {
    if (!twofaPassword.trim()) return;
    setTwofaLoading(true);
    try {
      const res = await regenerateRecoveryCodes(twofaPassword.trim());
      setRecoveryCodes(res.recovery_codes);
      await handleLoadTwoFaStatus();
      toast({ title: "Recovery codes regenerados" });
    } catch (error) {
      toast({
        title: "Falha ao regenerar recovery codes",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setTwofaLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await revokeMySession(sessionId);
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, is_active: false, ended_at: new Date().toISOString() } : s)));
      toast({
        title: "Sessão revogada",
        description: "A sessão/dispositivo foi desconectado.",
      });
    } catch (error) {
      toast({
        title: "Falha ao revogar sessão",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      await revokeAllMySessions();
      setSessions((prev) => prev.map((s) => ({ ...s, is_active: false, ended_at: new Date().toISOString() })));
      toast({
        title: "Sessões encerradas",
        description: "Todas as sessões foram revogadas.",
      });
    } catch (error) {
      toast({
        title: "Falha ao encerrar sessões",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const parseUserAgent = (ua?: string | null) => {
    if (!ua) return "Dispositivo desconhecido";
    if (ua.includes("Chrome")) return "Google Chrome";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Safari")) return "Safari";
    if (ua.includes("Edge")) return "Microsoft Edge";
    return ua.slice(0, 40);
  };

  const getDeviceIcon = (ua?: string | null) => {
    if (!ua) return <Globe className="h-4 w-4 text-muted-foreground" />;
    if (ua.includes("Mobile") || ua.includes("Android") || ua.includes("iPhone"))
      return <Smartphone className="h-4 w-4 text-muted-foreground" />;
    return <Monitor className="h-4 w-4 text-muted-foreground" />;
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const profile = await updateProfile({
        full_name: displayName.trim(),
      });

      setUserData({
        ...user,
        username: profile.full_name || user.username,
        full_name: profile.full_name || undefined,
        avatar_url: profile.avatar_url || null,
      });

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

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast({
        title: "Campos obrigatórios",
        description: "Informe a senha atual e a nova senha.",
        variant: "destructive",
      });
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      toast({
        title: "Senha alterada",
        description: res.message,
      });
    } catch (error) {
      toast({
        title: "Falha ao alterar senha",
        description: error instanceof Error ? error.message : "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  useEffect(() => {
    if (activeTab === "workspace") {
      handleLoadWorkspaces();
      handleLoadWorkspaceMembers();
    }
    if (activeTab === "notificacoes") {
      handleLoadNotificationPreferences();
    }
    if (activeTab === "seguranca") {
      handleLoadTwoFaStatus();
    }
  }, [activeTab]);

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
                  <p className="text-xs text-muted-foreground mt-1">
                    Email: {user?.email_verified ? "verificado" : "não verificado"}
                  </p>
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
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    {user?.pending_email
                      ? `Troca pendente para ${user.pending_email}. Verifique o novo email para confirmar.`
                      : "Para alterar, solicite abaixo e confirme no novo email."}
                  </p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="newEmail">Novo email</Label>
                  <div className="flex flex-col md:flex-row gap-2">
                    <Input
                      id="newEmail"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="novo@email.com"
                    />
                    <Button variant="outline" onClick={handleRequestEmailChange} disabled={!newEmail.trim()}>
                      Solicitar troca
                    </Button>
                  </div>
                </div>
              </div>

              <Button
                disabled={isLoading || !displayName.trim()}
                className="btn-offset"
                onClick={handleSaveProfile}
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? "Salvando..." : "Salvar alterações"}
              </Button>
              {!user?.email_verified && (
                <Button
                  variant="outline"
                  onClick={handleRequestEmailVerification}
                  disabled={emailVerifyLoading}
                >
                  {emailVerifyLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Reenviar verificação de email
                </Button>
              )}
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
                    {user?.workspace_name || "Meu Workspace"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Plano: Starter · Tipo: {user?.workspace_type || "producer"} · Papel: {user?.role || "viewer"}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-foreground">Membros</p>
                    <p className="text-xs text-muted-foreground">
                      Adicione membros existentes e gerencie papéis
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleLoadWorkspaceMembers} disabled={membersLoading}>
                    {membersLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Atualizar"}
                  </Button>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <div className="flex flex-col md:flex-row gap-2">
                    <Input
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      type="email"
                      placeholder="email do membro"
                    />
                    <select
                      value={memberRole}
                      onChange={(e) => setMemberRole(e.target.value as "admin" | "member")}
                      className="h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="member">member</option>
                      <option value="admin">admin</option>
                    </select>
                    <Button onClick={handleAddWorkspaceMember} disabled={memberActionLoading || !memberEmail.trim()}>
                      Adicionar
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {workspaceMembers.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhum membro encontrado.</p>
                    ) : (
                      workspaceMembers.map((member) => (
                        <div key={member.user_id} className="flex items-center justify-between border rounded-md p-3 bg-background">
                          <div>
                            <p className="text-sm font-medium">{member.full_name || member.email}</p>
                            <p className="text-xs text-muted-foreground">{member.email} · {member.role}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {member.role !== "owner" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={memberActionLoading}
                                  onClick={() => handleUpdateMemberRole(member.user_id, member.role === "admin" ? "member" : "admin")}
                                >
                                  {member.role === "admin" ? "Tornar member" : "Tornar admin"}
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled={memberActionLoading}
                                  onClick={() => handleRemoveWorkspaceMember(member.user_id)}
                                >
                                  Remover
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-foreground">API Keys</p>
                    <p className="text-xs text-muted-foreground">
                      Chaves de acesso para integração
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate("/app/api-keys")}>
                    Ver chaves
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg opacity-50">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Uso e limites</p>
                    <p className="text-xs text-muted-foreground">
                      Painel de consumo e limites do plano (backend pendente)
                    </p>
                  </div>
                  <Button variant="outline" size="sm" disabled>
                    Indisponível
                  </Button>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Trocar workspace padrão</p>
                      <p className="text-xs text-muted-foreground">
                        Define o contexto padrão da sua conta e renova seu token.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleLoadWorkspaces} disabled={workspacesLoading}>
                      {workspacesLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Atualizar"}
                    </Button>
                  </div>
                  {workspaces.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum workspace encontrado.</p>
                  ) : (
                    workspaces.map((ws) => (
                      <div key={ws.id} className="flex items-center justify-between border rounded-md p-3 bg-background">
                        <div>
                          <p className="text-sm font-medium">{ws.name} {ws.is_default ? "(atual)" : ""}</p>
                          <p className="text-xs text-muted-foreground">{ws.slug} · {ws.workspace_type} · {ws.role}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={ws.is_default || workspaceSwitchLoading}
                          onClick={() => handleSwitchWorkspace(ws.id)}
                        >
                          Usar
                        </Button>
                      </div>
                    ))
                  )}
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

            <div className="bg-background border border-border rounded-2xl p-6 space-y-4">
              {notificationsLoading && (
                <p className="text-xs text-muted-foreground">Carregando preferências...</p>
              )}
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Notificações por email
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Receba atualizações importantes no seu email
                  </p>
                </div>
                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">Push notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Notificações no navegador
                  </p>
                </div>
                <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Atualizações de circuitos
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Quando itens são adicionados ou removidos
                  </p>
                </div>
                <Switch checked={circuitUpdates} onCheckedChange={setCircuitUpdates} />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">Alertas de itens</p>
                  <p className="text-xs text-muted-foreground">
                    Quando itens são tokenizados ou deprecados
                  </p>
                </div>
                <Switch checked={itemAlerts} onCheckedChange={setItemAlerts} />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveNotificationPreferences} disabled={notificationsSaving}>
                  {notificationsSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Salvar preferências
                </Button>
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
              <p className="text-xs text-muted-foreground">
                Disponível agora: alterar senha, listar sessões e revogar sessões.
              </p>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">Alterar senha</p>
                  <p className="text-xs text-muted-foreground">
                    Atualize sua senha regularmente
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    type="password"
                    placeholder="Senha atual"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder="Nova senha (mín. 8 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={8}
                  />
                  <Button
                    variant="outline"
                    onClick={handleChangePassword}
                    disabled={passwordLoading || !currentPassword || newPassword.length < 8}
                  >
                    {passwordLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar senha"}
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Autenticação em dois fatores (2FA)</p>
                  <p className="text-xs text-muted-foreground">
                    Status: {twofaEnabled ? "Ativado" : "Desativado"} · Recovery codes restantes: {twofaRecoveryRemaining}
                  </p>
                </div>
                {!twofaEnabled ? (
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" onClick={handleStartTwoFaSetup} disabled={twofaLoading}>
                      Iniciar configuração 2FA
                    </Button>
                    {twofaSetupSecret && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Segredo (use no app autenticador):</p>
                        <Input value={twofaSetupSecret} readOnly />
                        <p className="text-xs text-muted-foreground break-all">{twofaSetupUrl}</p>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Código de 6 dígitos"
                            value={twofaCode}
                            onChange={(e) => setTwofaCode(e.target.value)}
                          />
                          <Button onClick={handleEnableTwoFa} disabled={twofaLoading || !twofaCode.trim()}>
                            Ativar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      type="password"
                      placeholder="Senha atual para ações de 2FA"
                      value={twofaPassword}
                      onChange={(e) => setTwofaPassword(e.target.value)}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={handleRegenerateRecoveryCodes} disabled={twofaLoading || !twofaPassword.trim()}>
                        Regenerar recovery codes
                      </Button>
                      <Button variant="destructive" onClick={handleDisableTwoFa} disabled={twofaLoading || !twofaPassword.trim()}>
                        Desativar 2FA
                      </Button>
                    </div>
                  </div>
                )}
                {recoveryCodes.length > 0 && (
                  <div className="mt-2 border rounded-md p-3 bg-background">
                    <p className="text-xs font-medium mb-2">Recovery codes (salve agora):</p>
                    <div className="grid grid-cols-2 gap-2">
                      {recoveryCodes.map((code) => (
                        <code key={code} className="text-xs">{code}</code>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">Sessões ativas</p>
                  <p className="text-xs text-muted-foreground">
                    Veja onde sua conta está conectada
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleViewSessions}>
                  {sessionsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Ver sessões"}
                </Button>
              </div>
              <div className="flex justify-end">
                <Button variant="destructive" size="sm" onClick={handleRevokeAllSessions}>
                  Encerrar todas as sessões
                </Button>
              </div>
            </div>

            {/* Logout - simple, no drama */}
            <div className="pt-2">
              <Button
                variant="outline"
                className="text-muted-foreground hover:text-foreground"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair da conta
              </Button>
            </div>

            {/* Sessions Dialog */}
            <Dialog open={sessionsOpen} onOpenChange={setSessionsOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Sessões ativas</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {sessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma sessão encontrada
                    </p>
                  ) : (
                    sessions.map((session) => (
                      <div
                        key={session.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg border",
                          session.is_active ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"
                        )}
                      >
                        <div className="mt-0.5">
                          {getDeviceIcon(session.user_agent)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {parseUserAgent(session.user_agent)}
                          </p>
                          {session.ip_address && (
                            <p className="text-xs text-muted-foreground">IP: {session.ip_address}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Último acesso: {new Date(session.last_activity_at).toLocaleString("pt-BR")}
                          </p>
                          {session.is_active && (
                            <span className="inline-block mt-1 text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                              Ativa
                            </span>
                          )}
                          {session.is_active && (
                            <div className="mt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRevokeSession(session.id)}
                              >
                                Revogar
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>
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
