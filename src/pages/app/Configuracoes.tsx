import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
import { PARTNER_CANVAS } from "@/components/partner/PartnerPage";
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
  const { user, logout, setUserData, switchWorkspace, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
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
  const canManageWorkspace =
    !!user?.is_admin || user?.role === "owner" || user?.role === "admin";

  const handleViewSessions = async () => {
    setSessionsLoading(true);
    try {
      const data = await listMySessions();
      setSessions(data.sessions);
      setSessionsOpen(true);
    } catch (err) {
      toast({
        title: t("settings.toasts.sessionsLoadErrorTitle"),
        description: t("settings.toasts.sessionsLoadErrorDesc"),
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
        title: t("settings.toasts.workspacesLoadErrorTitle"),
        description: error instanceof Error ? error.message : t("settings.toasts.tryAgain"),
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
        title: t("settings.toasts.workspaceSwitchedTitle"),
        description: t("settings.toasts.workspaceSwitchedDesc"),
      });
    } catch (error) {
      toast({
        title: t("settings.toasts.workspaceSwitchErrorTitle"),
        description: error instanceof Error ? error.message : t("settings.toasts.tryAgain"),
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
        title: t("settings.toasts.verificationSentTitle"),
        description: res.message,
      });
    } catch (error) {
      toast({
        title: t("settings.toasts.verificationErrorTitle"),
        description: error instanceof Error ? error.message : t("settings.toasts.tryAgain"),
        variant: "destructive",
      });
    } finally {
      setEmailVerifyLoading(false);
    }
  };

  const handleRequestEmailChange = async () => {
    if (!newEmail.trim()) {
      toast({
        title: t("settings.toasts.emailRequiredTitle"),
        description: t("settings.toasts.emailRequiredDesc"),
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await requestEmailChange({ new_email: newEmail.trim() });
      await refreshUser();
      toast({
        title: t("settings.toasts.verificationSentTitle"),
        description: res.message,
      });
      setNewEmail("");
    } catch (error) {
      toast({
        title: t("settings.toasts.emailChangeErrorTitle"),
        description: error instanceof Error ? error.message : t("settings.toasts.tryAgain"),
        variant: "destructive",
      });
    }
  };

  const handleLoadWorkspaceMembers = async () => {
    if (!canManageWorkspace) {
      setWorkspaceMembers([]);
      return;
    }
    setMembersLoading(true);
    try {
      const data = await listWorkspaceMembers();
      setWorkspaceMembers(data.members);
    } catch (error) {
      toast({
        title: t("settings.toasts.membersLoadErrorTitle"),
        description: error instanceof Error ? error.message : t("settings.toasts.tryAgain"),
        variant: "destructive",
      });
    } finally {
      setMembersLoading(false);
    }
  };

  const handleAddWorkspaceMember = async () => {
    if (!canManageWorkspace) {
      toast({ title: t("settings.toasts.permissionDeniedTitle"), description: t("settings.toasts.permissionDeniedDesc"), variant: "destructive" });
      return;
    }
    if (!memberEmail.trim()) {
      toast({
        title: t("settings.toasts.memberEmailRequiredTitle"),
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
        title: t("settings.toasts.memberAddedTitle"),
      });
    } catch (error) {
      toast({
        title: t("settings.toasts.memberAddErrorTitle"),
        description: error instanceof Error ? error.message : t("settings.toasts.tryAgain"),
        variant: "destructive",
      });
    } finally {
      setMemberActionLoading(false);
    }
  };

  const handleUpdateMemberRole = async (memberUserId: string, role: "owner" | "admin" | "member") => {
    if (!canManageWorkspace) {
      toast({ title: t("settings.toasts.permissionDeniedTitle"), description: t("settings.toasts.permissionDeniedDesc"), variant: "destructive" });
      return;
    }
    setMemberActionLoading(true);
    try {
      await updateWorkspaceMemberRole(memberUserId, role);
      await handleLoadWorkspaceMembers();
      toast({ title: t("settings.toasts.roleUpdatedTitle") });
    } catch (error) {
      toast({
        title: t("settings.toasts.roleUpdateErrorTitle"),
        description: error instanceof Error ? error.message : t("settings.toasts.tryAgain"),
        variant: "destructive",
      });
    } finally {
      setMemberActionLoading(false);
    }
  };

  const handleRemoveWorkspaceMember = async (memberUserId: string) => {
    if (!canManageWorkspace) {
      toast({ title: t("settings.toasts.permissionDeniedTitle"), description: t("settings.toasts.permissionDeniedDesc"), variant: "destructive" });
      return;
    }
    setMemberActionLoading(true);
    try {
      await removeWorkspaceMember(memberUserId);
      await handleLoadWorkspaceMembers();
      toast({ title: t("settings.toasts.memberRemovedTitle") });
    } catch (error) {
      toast({
        title: t("settings.toasts.memberRemoveErrorTitle"),
        description: error instanceof Error ? error.message : t("settings.toasts.tryAgain"),
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
        title: t("settings.toasts.notificationsLoadErrorTitle"),
        description: error instanceof Error ? error.message : t("settings.toasts.tryAgain"),
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
        title: t("settings.toasts.preferencesSavedTitle"),
      });
    } catch (error) {
      toast({
        title: t("settings.toasts.notificationsSaveErrorTitle"),
        description: error instanceof Error ? error.message : t("settings.toasts.tryAgain"),
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
        title: t("settings.toasts.twofaStatusErrorTitle"),
        description: error instanceof Error ? error.message : t("settings.toasts.tryAgain"),
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
        title: t("settings.toasts.twofaSetupStartedTitle"),
        description: t("settings.toasts.twofaSetupStartedDesc"),
      });
    } catch (error) {
      toast({
        title: t("settings.toasts.twofaStartErrorTitle"),
        description: error instanceof Error ? error.message : t("settings.toasts.tryAgain"),
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
      toast({ title: t("settings.toasts.twofaEnabledTitle"), description: t("settings.toasts.twofaEnabledDesc") });
    } catch (error) {
      toast({
        title: t("settings.toasts.twofaEnableErrorTitle"),
        description: error instanceof Error ? error.message : t("settings.toasts.tryAgain"),
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
      toast({ title: t("settings.toasts.twofaDisabledTitle"), description: res.message });
    } catch (error) {
      toast({
        title: t("settings.toasts.twofaDisableErrorTitle"),
        description: error instanceof Error ? error.message : t("settings.toasts.tryAgain"),
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
      toast({ title: t("settings.toasts.recoveryRegeneratedTitle") });
    } catch (error) {
      toast({
        title: t("settings.toasts.recoveryRegenerateErrorTitle"),
        description: error instanceof Error ? error.message : t("settings.toasts.tryAgain"),
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
        title: t("settings.toasts.sessionRevokedTitle"),
        description: t("settings.toasts.sessionRevokedDesc"),
      });
    } catch (error) {
      toast({
        title: t("settings.toasts.sessionRevokeErrorTitle"),
        description: error instanceof Error ? error.message : t("settings.toasts.tryAgain"),
        variant: "destructive",
      });
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      await revokeAllMySessions();
      setSessions((prev) => prev.map((s) => ({ ...s, is_active: false, ended_at: new Date().toISOString() })));
      toast({
        title: t("settings.toasts.sessionsEndedTitle"),
        description: t("settings.toasts.sessionsEndedDesc"),
      });
    } catch (error) {
      toast({
        title: t("settings.toasts.sessionsEndErrorTitle"),
        description: error instanceof Error ? error.message : t("settings.toasts.tryAgain"),
        variant: "destructive",
      });
    }
  };

  const parseUserAgent = (ua?: string | null) => {
    if (!ua) return t("settings.sessions.unknownDevice");
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
        title: t("settings.toasts.profileUpdatedTitle"),
        description: t("settings.toasts.profileUpdatedDesc"),
      });
    } catch (error) {
      toast({
        title: t("settings.toasts.profileSaveErrorTitle"),
        description: t("settings.toasts.tryAgainLater"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast({
        title: t("settings.toasts.passwordRequiredTitle"),
        description: t("settings.toasts.passwordRequiredDesc"),
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
        title: t("settings.toasts.passwordChangedTitle"),
        description: res.message,
      });
    } catch (error) {
      toast({
        title: t("settings.toasts.passwordChangeErrorTitle"),
        description: error instanceof Error ? error.message : t("settings.toasts.tryAgainLater"),
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
    setDisplayName(user?.username || "");
    setEmail(user?.email || "");
  }, [user?.username, user?.email]);

  useEffect(() => {
    if (activeTab === "workspace") {
      handleLoadWorkspaces();
      if (canManageWorkspace) {
        handleLoadWorkspaceMembers();
      }
    }
    if (activeTab === "notificacoes") {
      handleLoadNotificationPreferences();
    }
    if (activeTab === "seguranca") {
      handleLoadTwoFaStatus();
    }
  }, [activeTab, canManageWorkspace]);

  const renderContent = () => {
    switch (activeTab) {
      case "perfil":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">{t("settings.profile.title")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("settings.profile.subtitle")}
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
                    {user?.email_verified
                      ? t("settings.profile.emailVerified")
                      : t("settings.profile.emailUnverified")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">{t("settings.profile.displayNameLabel")}</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={t("settings.profile.displayNamePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t("settings.profile.emailLabel")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("settings.profile.emailPlaceholder")}
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    {user?.pending_email
                      ? t("settings.profile.pendingEmailNote", { email: user.pending_email })
                      : t("settings.profile.changeEmailHint")}
                  </p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="newEmail">{t("settings.profile.newEmailLabel")}</Label>
                  <div className="flex flex-col md:flex-row gap-2">
                    <Input
                      id="newEmail"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder={t("settings.profile.newEmailPlaceholder")}
                    />
                    <Button variant="outline" onClick={handleRequestEmailChange} disabled={!newEmail.trim()}>
                      {t("settings.profile.requestChange")}
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
                {isLoading ? t("settings.profile.saving") : t("settings.profile.saveChanges")}
              </Button>
              {!user?.email_verified && (
                <Button
                  variant="outline"
                  onClick={handleRequestEmailVerification}
                  disabled={emailVerifyLoading}
                >
                  {emailVerifyLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {t("settings.profile.resendVerification")}
                </Button>
              )}
            </div>
          </div>
        );

      case "workspace":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">{t("settings.workspace.title")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("settings.workspace.subtitle")}
              </p>
            </div>

            <div className="bg-background border border-border rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-4 pb-4 border-b border-border">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-medium text-foreground">
                    {user?.workspace_name || t("settings.workspace.defaultName")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.workspace.planLine", {
                      type: user?.workspace_type || "producer",
                      role: user?.role || "viewer",
                    })}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-foreground">{t("settings.workspace.membersTitle")}</p>
                    <p className="text-xs text-muted-foreground">
                      {canManageWorkspace
                        ? t("settings.workspace.membersManageHint")
                        : t("settings.workspace.membersReadOnlyHint")}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadWorkspaceMembers}
                    disabled={membersLoading || !canManageWorkspace}
                  >
                    {membersLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : t("settings.workspace.refresh")}
                  </Button>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <div className="flex flex-col md:flex-row gap-2">
                    <Input
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      type="email"
                      placeholder={t("settings.workspace.memberEmailPlaceholder")}
                      disabled={!canManageWorkspace}
                    />
                    <select
                      value={memberRole}
                      onChange={(e) => setMemberRole(e.target.value as "admin" | "member")}
                      disabled={!canManageWorkspace}
                      className="h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="member">member</option>
                      <option value="admin">admin</option>
                    </select>
                    <Button onClick={handleAddWorkspaceMember} disabled={memberActionLoading || !memberEmail.trim() || !canManageWorkspace}>
                      {t("settings.workspace.add")}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {workspaceMembers.length === 0 ? (
                      <p className="text-xs text-muted-foreground">{t("settings.workspace.membersEmpty")}</p>
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
                                  {member.role === "admin"
                                    ? t("settings.workspace.makeMember")
                                    : t("settings.workspace.makeAdmin")}
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled={memberActionLoading}
                                  onClick={() => handleRemoveWorkspaceMember(member.user_id)}
                                >
                                  {t("settings.workspace.remove")}
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
                    <p className="text-sm font-medium text-foreground">{t("settings.workspace.apiKeysTitle")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("settings.workspace.apiKeysHint")}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate("/app/api-keys")}>
                    {t("settings.workspace.viewKeys")}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg opacity-50">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("settings.workspace.usageTitle")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("settings.workspace.usageHint")}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" disabled>
                    {t("settings.workspace.unavailable")}
                  </Button>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{t("settings.workspace.switchTitle")}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("settings.workspace.switchHint")}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleLoadWorkspaces} disabled={workspacesLoading}>
                      {workspacesLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : t("settings.workspace.refresh")}
                    </Button>
                  </div>
                  {workspaces.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t("settings.workspace.workspacesEmpty")}</p>
                  ) : (
                    workspaces.map((ws) => (
                      <div key={ws.id} className="flex items-center justify-between border rounded-md p-3 bg-background">
                        <div>
                          <p className="text-sm font-medium">{ws.name} {ws.is_default ? t("settings.workspace.current") : ""}</p>
                          <p className="text-xs text-muted-foreground">{ws.slug} · {ws.workspace_type} · {ws.role}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={ws.is_default || workspaceSwitchLoading}
                          onClick={() => handleSwitchWorkspace(ws.id)}
                        >
                          {t("settings.workspace.use")}
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
              <h2 className="text-xl font-semibold text-foreground mb-1">{t("settings.notifications.title")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("settings.notifications.subtitle")}
              </p>
            </div>

            <div className="bg-background border border-border rounded-2xl p-6 space-y-4">
              {notificationsLoading && (
                <p className="text-xs text-muted-foreground">{t("settings.notifications.loading")}</p>
              )}
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t("settings.notifications.emailTitle")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("settings.notifications.emailHint")}
                  </p>
                </div>
                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">{t("settings.notifications.pushTitle")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("settings.notifications.pushHint")}
                  </p>
                </div>
                <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t("settings.notifications.circuitTitle")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("settings.notifications.circuitHint")}
                  </p>
                </div>
                <Switch checked={circuitUpdates} onCheckedChange={setCircuitUpdates} />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">{t("settings.notifications.itemTitle")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("settings.notifications.itemHint")}
                  </p>
                </div>
                <Switch checked={itemAlerts} onCheckedChange={setItemAlerts} />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveNotificationPreferences} disabled={notificationsSaving}>
                  {notificationsSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {t("settings.notifications.save")}
                </Button>
              </div>
            </div>
          </div>
        );

      case "seguranca":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">{t("settings.security.title")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("settings.security.subtitle")}
              </p>
            </div>

            <div className="bg-background border border-border rounded-2xl p-6 space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">{t("settings.security.changePasswordTitle")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("settings.security.changePasswordHint")}
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    type="password"
                    placeholder={t("settings.security.currentPasswordPlaceholder")}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder={t("settings.security.newPasswordPlaceholder")}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={8}
                  />
                  <Button
                    variant="outline"
                    onClick={handleChangePassword}
                    disabled={passwordLoading || !currentPassword || newPassword.length < 8}
                  >
                    {passwordLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("settings.security.updatePassword")}
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{t("settings.security.twofaTitle")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("settings.security.twofaStatus", {
                      status: twofaEnabled
                        ? t("settings.security.twofaEnabled")
                        : t("settings.security.twofaDisabled"),
                      remaining: twofaRecoveryRemaining,
                    })}
                  </p>
                </div>
                {!twofaEnabled ? (
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" onClick={handleStartTwoFaSetup} disabled={twofaLoading}>
                      {t("settings.security.startTwofa")}
                    </Button>
                    {twofaSetupSecret && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">{t("settings.security.secretHint")}</p>
                        <Input value={twofaSetupSecret} readOnly />
                        <p className="text-xs text-muted-foreground break-all">{twofaSetupUrl}</p>
                        <div className="flex gap-2">
                          <Input
                            placeholder={t("settings.security.codePlaceholder")}
                            value={twofaCode}
                            onChange={(e) => setTwofaCode(e.target.value)}
                          />
                          <Button onClick={handleEnableTwoFa} disabled={twofaLoading || !twofaCode.trim()}>
                            {t("settings.security.enable")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      type="password"
                      placeholder={t("settings.security.twofaPasswordPlaceholder")}
                      value={twofaPassword}
                      onChange={(e) => setTwofaPassword(e.target.value)}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={handleRegenerateRecoveryCodes} disabled={twofaLoading || !twofaPassword.trim()}>
                        {t("settings.security.regenerateCodes")}
                      </Button>
                      <Button variant="destructive" onClick={handleDisableTwoFa} disabled={twofaLoading || !twofaPassword.trim()}>
                        {t("settings.security.disableTwofa")}
                      </Button>
                    </div>
                  </div>
                )}
                {recoveryCodes.length > 0 && (
                  <div className="mt-2 border rounded-md p-3 bg-background">
                    <p className="text-xs font-medium mb-2">{t("settings.security.recoveryCodesTitle")}</p>
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
                  <p className="text-sm font-medium text-foreground">{t("settings.security.activeSessionsTitle")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("settings.security.activeSessionsHint")}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleViewSessions}>
                  {sessionsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : t("settings.security.viewSessions")}
                </Button>
              </div>
              <div className="flex justify-end">
                <Button variant="destructive" size="sm" onClick={handleRevokeAllSessions}>
                  {t("settings.security.endAllSessions")}
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
                {t("settings.security.logout")}
              </Button>
            </div>

            {/* Sessions Dialog */}
            <Dialog open={sessionsOpen} onOpenChange={setSessionsOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{t("settings.sessions.title")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {sessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {t("settings.sessions.empty")}
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
                            <p className="text-xs text-muted-foreground">{t("settings.sessions.ip", { ip: session.ip_address })}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {t("settings.sessions.lastActivity", {
                              date: new Date(session.last_activity_at).toLocaleString(i18n.language),
                            })}
                          </p>
                          {session.is_active && (
                            <span className="inline-block mt-1 text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                              {t("settings.sessions.activeBadge")}
                            </span>
                          )}
                          {session.is_active && (
                            <div className="mt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRevokeSession(session.id)}
                              >
                                {t("settings.sessions.revoke")}
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

  // Voltar determinístico (o navigate(-1) ejetava quem chegava por URL direta).
  const backTo = user?.workspace_type === "partner" ? "/app/parceiro" : "/app";

  return (
    <div className={PARTNER_CANVAS}>
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(backTo)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("settings.header.back")}
        </button>
        <p className="section-label mb-1">{t("settings.header.eyebrow")}</p>
        <h1 className="text-foreground">{t("settings.header.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.header.subtitle")}</p>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="md:col-span-1">
          <div className="bg-card border border-border rounded-2xl p-3 space-y-1">
            <TabButton
              icon={User}
              label={t("settings.tabs.profile")}
              isActive={activeTab === "perfil"}
              onClick={() => setActiveTab("perfil")}
            />
            <TabButton
              icon={Building2}
              label={t("settings.tabs.workspace")}
              isActive={activeTab === "workspace"}
              onClick={() => setActiveTab("workspace")}
            />
            <TabButton
              icon={Bell}
              label={t("settings.tabs.notifications")}
              isActive={activeTab === "notificacoes"}
              onClick={() => setActiveTab("notificacoes")}
            />
            <TabButton
              icon={Shield}
              label={t("settings.tabs.security")}
              isActive={activeTab === "seguranca"}
              onClick={() => setActiveTab("seguranca")}
            />
          </div>
        </div>

        {/* Main content */}
        <div className="md:col-span-3">{renderContent()}</div>
      </div>
    </div>
    </div>
  );
}
