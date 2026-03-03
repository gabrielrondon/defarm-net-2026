import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  createAdminUser,
  createWorkspace,
  listAdmins,
  listAdminUsers,
  listWorkspaces,
  updateUserAdmin,
  updateUserRole,
  updateUserStatus,
  updateWorkspace,
  type AdminUser,
  type AdminWorkspace,
} from "@/lib/api/admin-users";
import {
  deleteWorkspaceTrustProfile,
  listWorkspaceTrustProfiles,
  upsertWorkspaceTrustProfile,
  type WorkspaceSourceType,
  type WorkspaceTrustProfile,
} from "@/lib/api/workspace-trust-profiles";

const WORKSPACE_TYPES = ["producer", "partner", "certifier", "processor", "government"] as const;
const WORKSPACE_TIERS = ["free", "basic", "pro", "enterprise"] as const;
const USER_ROLES = ["owner", "admin", "partner", "editor", "viewer"] as const;
const TRUST_SOURCE_TYPES: WorkspaceSourceType[] = [
  "government",
  "sanitary_agency",
  "authority",
  "certifier",
  "partner",
  "producer",
  "processor",
  "integration",
  "manual",
  "system",
];

function defaultTrustSourceByWorkspaceType(type: AdminWorkspace["workspace_type"]): WorkspaceSourceType {
  if (type === "government") return "government";
  if (type === "certifier") return "certifier";
  if (type === "partner") return "partner";
  if (type === "processor") return "processor";
  return "producer";
}

export default function AdminUsers() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [trustProfiles, setTrustProfiles] = useState<Record<string, WorkspaceTrustProfile>>({});
  const [trustDrafts, setTrustDrafts] = useState<Record<string, { source_type: WorkspaceSourceType | "auto"; notes: string }>>({});
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("all");
  const [userWorkspaceTypeFilter, setUserWorkspaceTypeFilter] = useState<string>("all");
  const [userStatusFilter, setUserStatusFilter] = useState<string>("all");
  const [userAdminFilter, setUserAdminFilter] = useState<string>("all");
  const [usersPage, setUsersPage] = useState(1);
  const [usersPageSize, setUsersPageSize] = useState(20);

  const [createMode, setCreateMode] = useState<"existing" | "new">("new");
  const [newUser, setNewUser] = useState({
    full_name: "",
    email: "",
    password: "",
    send_set_password_email: true,
    role: "owner",
    is_admin: false,
    workspace_id: "",
    workspace_name: "",
    workspace_slug: "",
    workspace_type: "producer" as (typeof WORKSPACE_TYPES)[number],
    trust_source_type: "auto" as WorkspaceSourceType | "auto",
    trust_notes: "",
  });

  const [newWorkspace, setNewWorkspace] = useState({
    name: "",
    slug: "",
    owner_user_id: "",
    workspace_type: "producer" as (typeof WORKSPACE_TYPES)[number],
    tier: "free" as (typeof WORKSPACE_TIERS)[number],
    trust_source_type: "auto" as WorkspaceSourceType | "auto",
    trust_notes: "",
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [usersResp, adminsResp, wsResp, trustResp] = await Promise.all([
        listAdminUsers(),
        listAdmins(),
        listWorkspaces(),
        listWorkspaceTrustProfiles(),
      ]);
      setUsers(usersResp);
      setAdmins(adminsResp);
      setWorkspaces(wsResp);
      const trustMap = trustResp.reduce<Record<string, WorkspaceTrustProfile>>((acc, profile) => {
        acc[profile.workspace_id] = profile;
        return acc;
      }, {});
      setTrustProfiles(trustMap);
      setTrustDrafts((prev) => {
        const next: Record<string, { source_type: WorkspaceSourceType | "auto"; notes: string }> = {};
        for (const ws of wsResp) {
          const profile = trustMap[ws.id];
          next[ws.id] = {
            source_type: profile?.source_type ?? "auto",
            notes: profile?.notes ?? prev[ws.id]?.notes ?? "",
          };
        }
        return next;
      });
    } catch (err) {
      toast({
        title: "Erro ao carregar admin",
        description: err instanceof Error ? err.message : "Falha inesperada.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const userOptions = useMemo(
    () => users.map((u) => ({ id: u.id, label: `${u.email} (${u.full_name || "Sem nome"})` })),
    [users]
  );
  const isPartnerRole = newUser.role === "partner";
  const selectableWorkspaces = useMemo(
    () => (isPartnerRole ? workspaces.filter((w) => w.workspace_type === "partner") : workspaces),
    [workspaces, isPartnerRole]
  );
  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return users.filter((user) => {
      if (userRoleFilter !== "all" && user.role !== userRoleFilter) return false;
      if (userWorkspaceTypeFilter !== "all" && (user.workspace_type || "sem-workspace") !== userWorkspaceTypeFilter) {
        return false;
      }
      if (userStatusFilter === "active" && !user.is_active) return false;
      if (userStatusFilter === "inactive" && user.is_active) return false;
      if (userAdminFilter === "admin" && !user.is_admin) return false;
      if (userAdminFilter === "non_admin" && user.is_admin) return false;
      if (!q) return true;
      return (
        (user.full_name || "").toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        user.id.toLowerCase().includes(q)
      );
    });
  }, [users, userSearch, userRoleFilter, userWorkspaceTypeFilter, userStatusFilter, userAdminFilter]);
  const usersTotal = filteredUsers.length;
  const usersTotalPages = Math.max(1, Math.ceil(usersTotal / usersPageSize));
  const currentUsersPage = Math.min(usersPage, usersTotalPages);
  const usersStart = usersTotal === 0 ? 0 : (currentUsersPage - 1) * usersPageSize + 1;
  const usersEnd = Math.min(usersTotal, currentUsersPage * usersPageSize);
  const pagedUsers = filteredUsers.slice((currentUsersPage - 1) * usersPageSize, currentUsersPage * usersPageSize);
  useEffect(() => {
    setUsersPage(1);
  }, [userSearch, userRoleFilter, userWorkspaceTypeFilter, userStatusFilter, userAdminFilter, usersPageSize]);

  const handleCreateUser = async () => {
    if (!newUser.email) return;
    if (createMode === "existing" && !newUser.workspace_id) {
      toast({
        title: "Workspace obrigatório",
        description: "Selecione um workspace existente ou mude para 'Criar novo'.",
        variant: "destructive",
      });
      return;
    }
    if (createMode === "existing" && isPartnerRole) {
      const selectedWorkspace = workspaces.find((w) => w.id === newUser.workspace_id);
      if (!selectedWorkspace || selectedWorkspace.workspace_type !== "partner") {
        toast({
          title: "Workspace incompatível",
          description: "Usuário com role partner deve entrar em workspace do tipo partner.",
          variant: "destructive",
        });
        return;
      }
    }
    if (!newUser.send_set_password_email && newUser.password.length < 8) {
      toast({
        title: "Senha inválida",
        description: "Informe uma senha inicial com no mínimo 8 caracteres.",
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await createAdminUser({
        email: newUser.email.trim(),
        password: newUser.send_set_password_email ? undefined : newUser.password,
        send_set_password_email: newUser.send_set_password_email,
        full_name: newUser.full_name.trim() || undefined,
        role: newUser.role,
        is_admin: newUser.is_admin,
        workspace_id: createMode === "existing" ? newUser.workspace_id || undefined : undefined,
        workspace_name: createMode === "new" ? newUser.workspace_name || undefined : undefined,
        workspace_slug: createMode === "new" ? newUser.workspace_slug || undefined : undefined,
        workspace_type: createMode === "new" ? newUser.workspace_type : undefined,
      });
      toast({
        title: "Usuário criado com sucesso",
        description: newUser.send_set_password_email
          ? res.set_password_email_sent
            ? "Convite enviado por e-mail para definição de senha."
            : "Convite solicitado, mas o e-mail não foi enviado."
          : "Senha inicial definida manualmente.",
      });
      if (newUser.role === "partner" && res.workspace_type !== "partner") {
        toast({
          title: "Atenção de visibilidade",
          description:
            "Este usuário foi criado com role partner, mas o workspace é " +
            (res.workspace_type || "desconhecido") +
            ". O portal parceiro só aparece com workspace_type=partner.",
          variant: "destructive",
        });
      }
      if (res.admin_notification_sent === false) {
        toast({
          title: "Aviso",
          description: "Usuário criado, mas o e-mail de resumo para o admin não foi enviado.",
          variant: "destructive",
        });
      }
      if (createMode === "new" && newUser.trust_source_type !== "auto") {
        await upsertWorkspaceTrustProfile(
          res.workspace_id,
          newUser.trust_source_type,
          newUser.trust_notes.trim() || undefined
        );
      }
      setNewUser({
        full_name: "",
        email: "",
        password: "",
        send_set_password_email: true,
        role: "owner",
        is_admin: false,
        workspace_id: "",
        workspace_name: "",
        workspace_slug: "",
        workspace_type: "producer",
        trust_source_type: "auto",
        trust_notes: "",
      });
      await loadAll();
    } catch (err) {
      toast({
        title: "Falha ao criar usuário",
        description: err instanceof Error ? err.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspace.name || !newWorkspace.owner_user_id) return;
    try {
      const created = await createWorkspace({
        name: newWorkspace.name,
        slug: newWorkspace.slug || undefined,
        owner_user_id: newWorkspace.owner_user_id,
        workspace_type: newWorkspace.workspace_type,
        tier: newWorkspace.tier,
      });
      if (newWorkspace.trust_source_type !== "auto") {
        await upsertWorkspaceTrustProfile(
          created.id,
          newWorkspace.trust_source_type,
          newWorkspace.trust_notes.trim() || undefined
        );
      }
      toast({ title: "Workspace criado com sucesso" });
      setNewWorkspace({
        name: "",
        slug: "",
        owner_user_id: "",
        workspace_type: "producer",
        tier: "free",
        trust_source_type: "auto",
        trust_notes: "",
      });
      await loadAll();
    } catch (err) {
      toast({
        title: "Falha ao criar workspace",
        description: err instanceof Error ? err.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    try {
      await updateUserStatus(user.id, { is_active: !user.is_active });
      await loadAll();
    } catch (err) {
      toast({
        title: "Falha ao atualizar status",
        description: err instanceof Error ? err.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await updateUserRole(userId, { role });
      await loadAll();
    } catch (err) {
      toast({
        title: "Falha ao atualizar role",
        description: err instanceof Error ? err.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleAdminFlag = async (user: AdminUser) => {
    try {
      await updateUserAdmin(user.id, { is_admin: !user.is_admin });
      await loadAll();
    } catch (err) {
      toast({
        title: "Falha ao atualizar admin",
        description: err instanceof Error ? err.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleWorkspaceType = async (ws: AdminWorkspace, workspace_type: AdminWorkspace["workspace_type"]) => {
    try {
      await updateWorkspace(ws.id, { workspace_type });
      setTrustDrafts((prev) => {
        const current = prev[ws.id] ?? { source_type: "auto" as const, notes: "" };
        if (current.source_type !== "auto") return prev;
        return {
          ...prev,
          [ws.id]: {
            ...current,
            notes: current.notes,
          },
        };
      });
      await loadAll();
    } catch (err) {
      toast({
        title: "Falha ao atualizar tipo de workspace",
        description: err instanceof Error ? err.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleTrustDraftChange = (
    workspaceId: string,
    patch: Partial<{ source_type: WorkspaceSourceType | "auto"; notes: string }>
  ) => {
    setTrustDrafts((prev) => ({
      ...prev,
      [workspaceId]: {
        source_type: prev[workspaceId]?.source_type ?? "auto",
        notes: prev[workspaceId]?.notes ?? "",
        ...patch,
      },
    }));
  };

  const handleSaveTrustProfile = async (workspaceId: string) => {
    const draft = trustDrafts[workspaceId];
    if (!draft) return;
    try {
      if (draft.source_type === "auto") {
        await deleteWorkspaceTrustProfile(workspaceId);
      } else {
        await upsertWorkspaceTrustProfile(workspaceId, draft.source_type, draft.notes.trim() || undefined);
      }
      await loadAll();
      toast({ title: "Fonte de confiança atualizada" });
    } catch (err) {
      toast({
        title: "Falha ao atualizar confiança",
        description: err instanceof Error ? err.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando painel admin...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">IAM Admin</h1>
        <p className="text-sm text-muted-foreground">
          Crie usuários e workspaces, defina tipo de workspace, senha inicial e gerencie administradores.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Criar Usuário</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Nome</Label>
              <Input
                value={newUser.full_name}
                onChange={(e) => setNewUser((p) => ({ ...p, full_name: e.target.value }))}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={newUser.email}
                onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
                placeholder="usuario@empresa.com"
              />
            </div>
            <div>
              <Label>Senha Inicial</Label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
                placeholder={newUser.send_set_password_email ? "Opcional (será enviado link)" : "********"}
                disabled={newUser.send_set_password_email}
              />
            </div>
            <div>
              <Label>Role no Workspace</Label>
              <Select
                value={newUser.role}
                onValueChange={(v) =>
                  setNewUser((p) => ({
                    ...p,
                    role: v,
                    workspace_type: v === "partner" ? "partner" : p.workspace_type,
                    workspace_id:
                      v === "partner" && createMode === "existing"
                        ? (workspaces.find((w) => w.id === p.workspace_id && w.workspace_type === "partner")
                            ? p.workspace_id
                            : "")
                        : p.workspace_id,
                  }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={newUser.is_admin}
              onChange={(e) => setNewUser((p) => ({ ...p, is_admin: e.target.checked }))}
            />
            <Label>Tornar usuário administrador do sistema</Label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={newUser.send_set_password_email}
              onChange={(e) => setNewUser((p) => ({ ...p, send_set_password_email: e.target.checked }))}
            />
            <Label>Enviar link por e-mail para definir senha (recomendado)</Label>
          </div>

          <div className="flex items-center gap-4">
            <Label>Workspace</Label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={createMode === "new"} onChange={() => setCreateMode("new")} />
              Criar novo
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={createMode === "existing"} onChange={() => setCreateMode("existing")} />
              Usar existente
            </label>
          </div>

          {createMode === "new" ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label>Nome do Workspace</Label>
                <Input
                  value={newUser.workspace_name}
                  onChange={(e) => setNewUser((p) => ({ ...p, workspace_name: e.target.value }))}
                  placeholder="Fazenda Boa Vista"
                />
              </div>
              <div>
                <Label>Slug (opcional)</Label>
                <Input
                  value={newUser.workspace_slug}
                  onChange={(e) => setNewUser((p) => ({ ...p, workspace_slug: e.target.value }))}
                  placeholder="fazenda-boa-vista"
                />
              </div>
              <div>
                <Label>Tipo de Workspace</Label>
                <Select
                  value={newUser.workspace_type}
                  onValueChange={(v: AdminWorkspace["workspace_type"]) => setNewUser((p) => ({ ...p, workspace_type: v }))}
                >
                  <SelectTrigger disabled={isPartnerRole}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WORKSPACE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fonte de Confiança (opcional)</Label>
                <Select
                  value={newUser.trust_source_type}
                  onValueChange={(v: WorkspaceSourceType | "auto") => setNewUser((p) => ({ ...p, trust_source_type: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{`auto (${defaultTrustSourceByWorkspaceType(newUser.workspace_type)})`}</SelectItem>
                    {TRUST_SOURCE_TYPES.map((sourceType) => (
                      <SelectItem key={sourceType} value={sourceType}>{sourceType}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-4">
                <Label>Notas de confiança (opcional)</Label>
                <Input
                  value={newUser.trust_notes}
                  onChange={(e) => setNewUser((p) => ({ ...p, trust_notes: e.target.value }))}
                  placeholder="Ex.: órgão oficial estadual (IAGRO)"
                />
              </div>
            </div>
          ) : (
            <div>
              <Label>Workspace existente</Label>
              <Select
                value={newUser.workspace_id}
                onValueChange={(v) => setNewUser((p) => ({ ...p, workspace_id: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecione workspace" /></SelectTrigger>
                <SelectContent>
                  {selectableWorkspaces.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name} ({w.workspace_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isPartnerRole && (
                <p className="text-xs text-muted-foreground mt-1">
                  Para role partner, apenas workspaces partner são permitidos.
                </p>
              )}
            </div>
          )}

          <Button onClick={handleCreateUser}>Criar Usuário</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Administradores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {admins.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum admin encontrado.</p>
          ) : (
            admins.map((admin) => (
              <div key={admin.id} className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <p className="font-medium">{admin.full_name || "Sem nome"}</p>
                  <p className="text-xs text-muted-foreground">{admin.email}</p>
                </div>
                <Button variant="outline" onClick={() => handleAdminFlag(admin)}>
                  Remover Admin
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuários</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <Input
              placeholder="Buscar por nome, e-mail ou id"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="md:col-span-2"
            />
            <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
              <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas roles</SelectItem>
                {USER_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={userWorkspaceTypeFilter} onValueChange={setUserWorkspaceTypeFilter}>
              <SelectTrigger><SelectValue placeholder="Tipo workspace" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos tipos</SelectItem>
                {WORKSPACE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
                <SelectItem value="sem-workspace">sem-workspace</SelectItem>
              </SelectContent>
            </Select>
            <Select value={userStatusFilter} onValueChange={setUserStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={userAdminFilter} onValueChange={setUserAdminFilter}>
              <SelectTrigger><SelectValue placeholder="Admin flag" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="admin">Somente admins</SelectItem>
                <SelectItem value="non_admin">Somente não-admins</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <p>
              Exibindo {usersStart}-{usersEnd} de {usersTotal}
            </p>
            <div className="flex items-center gap-2">
              <Select value={String(usersPageSize)} onValueChange={(v) => setUsersPageSize(Number(v))}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10/página</SelectItem>
                  <SelectItem value="20">20/página</SelectItem>
                  <SelectItem value="50">50/página</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                disabled={currentUsersPage <= 1}
                onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentUsersPage >= usersTotalPages}
                onClick={() => setUsersPage((p) => Math.min(usersTotalPages, p + 1))}
              >
                Próxima
              </Button>
            </div>
          </div>

          {pagedUsers.map((user) => (
            <div key={user.id} className="border rounded-md p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="font-medium">{user.full_name || "Sem nome"} <span className="text-xs text-muted-foreground">({user.email})</span></p>
                <div className="flex items-center gap-2 text-xs mt-1">
                  <Badge variant="outline">{user.workspace_type || "sem-workspace"}</Badge>
                  {user.is_admin && <Badge>admin</Badge>}
                  <Badge variant={user.is_active ? "default" : "secondary"}>{user.is_active ? "ativo" : "inativo"}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select value={user.role} onValueChange={(v) => handleRoleChange(user.id, v)}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => handleToggleActive(user)}>
                  {user.is_active ? "Desativar" : "Ativar"}
                </Button>
                <Button variant="outline" onClick={() => handleAdminFlag(user)}>
                  {user.is_admin ? "Despromover" : "Promover Admin"}
                </Button>
              </div>
            </div>
          ))}
          {pagedUsers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum usuário encontrado para os filtros atuais.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Criar Workspace</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div>
            <Label>Nome</Label>
            <Input
              value={newWorkspace.name}
              onChange={(e) => setNewWorkspace((p) => ({ ...p, name: e.target.value }))}
              placeholder="Nome do workspace"
            />
          </div>
          <div>
            <Label>Slug (opcional)</Label>
            <Input
              value={newWorkspace.slug}
              onChange={(e) => setNewWorkspace((p) => ({ ...p, slug: e.target.value }))}
              placeholder="slug-workspace"
            />
          </div>
          <div>
            <Label>Owner</Label>
            <Select
              value={newWorkspace.owner_user_id}
              onValueChange={(v) => setNewWorkspace((p) => ({ ...p, owner_user_id: v }))}
            >
              <SelectTrigger><SelectValue placeholder="Selecione usuário" /></SelectTrigger>
              <SelectContent>
                {userOptions.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo</Label>
            <Select
              value={newWorkspace.workspace_type}
              onValueChange={(v: AdminWorkspace["workspace_type"]) => setNewWorkspace((p) => ({ ...p, workspace_type: v }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {WORKSPACE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tier</Label>
            <Select
              value={newWorkspace.tier}
              onValueChange={(v: AdminWorkspace["tier"]) => setNewWorkspace((p) => ({ ...p, tier: v }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {WORKSPACE_TIERS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fonte de Confiança (opcional)</Label>
            <Select
              value={newWorkspace.trust_source_type}
              onValueChange={(v: WorkspaceSourceType | "auto") =>
                setNewWorkspace((p) => ({ ...p, trust_source_type: v }))
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">{`auto (${defaultTrustSourceByWorkspaceType(newWorkspace.workspace_type)})`}</SelectItem>
                {TRUST_SOURCE_TYPES.map((sourceType) => (
                  <SelectItem key={sourceType} value={sourceType}>{sourceType}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-6">
            <Label>Notas de confiança (opcional)</Label>
            <Input
              value={newWorkspace.trust_notes}
              onChange={(e) => setNewWorkspace((p) => ({ ...p, trust_notes: e.target.value }))}
              placeholder="Ex.: integração oficial de agência sanitária"
            />
          </div>
          <div className="md:col-span-6">
            <Button onClick={handleCreateWorkspace}>Criar Workspace</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workspaces</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {workspaces.map((ws) => (
            <div key={ws.id} className="border rounded-md p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="font-medium">{ws.name} <span className="text-xs text-muted-foreground">({ws.slug})</span></p>
                <p className="text-xs text-muted-foreground">owner: {ws.owner_email || ws.owner_id}</p>
                <p className="text-xs text-muted-foreground">
                  confiança ativa: {trustProfiles[ws.id]?.source_type ?? `auto (${defaultTrustSourceByWorkspaceType(ws.workspace_type)})`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{ws.tier}</Badge>
                <Select value={ws.workspace_type} onValueChange={(v: AdminWorkspace["workspace_type"]) => handleWorkspaceType(ws, v)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WORKSPACE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={trustDrafts[ws.id]?.source_type ?? "auto"}
                  onValueChange={(v: WorkspaceSourceType | "auto") => handleTrustDraftChange(ws.id, { source_type: v })}
                >
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{`auto (${defaultTrustSourceByWorkspaceType(ws.workspace_type)})`}</SelectItem>
                    {TRUST_SOURCE_TYPES.map((sourceType) => (
                      <SelectItem key={sourceType} value={sourceType}>{sourceType}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={trustDrafts[ws.id]?.notes ?? ""}
                  onChange={(e) => handleTrustDraftChange(ws.id, { notes: e.target.value })}
                  placeholder="nota (opcional)"
                  className="w-56"
                />
                <Button variant="outline" onClick={() => handleSaveTrustProfile(ws.id)}>
                  Salvar confiança
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
