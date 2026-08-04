import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Crown,
  Shield,
  User,
  Eye,
  Mail,
  Search,
  MoreHorizontal,
  UserPlus,
  Loader2,
  Clock,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Circuit } from "@/lib/defarm-api";
import {
  cancelCircuitInvitation,
  createCircuitInvitation,
  getCircuitMembers,
  getCircuitInvitations,
} from "@/lib/api/circuits";
import type { CircuitInvitation, CircuitMember } from "@/lib/api/types";
import { ApiError } from "@/lib/api/client";

interface ManageMembersDialogProps {
  circuit: Circuit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const roleIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  owner: Crown,
  admin: Shield,
  member: User,
  viewer: Eye,
};

const roleColors: Record<string, string> = {
  owner: "bg-amber-500/10 text-amber-600",
  admin: "bg-blue-500/10 text-blue-600",
  member: "bg-primary/10 text-primary",
  viewer: "bg-muted text-muted-foreground",
};

// Papéis que podem ser convidados (owner nunca é convidável).
const INVITE_ROLES = ["member", "admin", "viewer"] as const;

// Estados de convite → rótulo + cor. Deixa "pendente" ≠ "expirado/cancelado" óbvio.
const INV_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "bg-amber-500/10 text-amber-600" },
  accepted: { label: "Aceito", cls: "bg-green-500/10 text-green-600" },
  declined: { label: "Recusado", cls: "bg-red-500/10 text-red-600" },
  expired: { label: "Expirado", cls: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelado", cls: "bg-muted text-muted-foreground" },
};

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

export function ManageMembersDialog({
  circuit,
  open,
  onOpenChange,
}: ManageMembersDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("member");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const inviteInputRef = useRef<HTMLInputElement>(null);

  // Abre o painel de convite (opcionalmente pré-preenchendo o email vindo da busca) e foca.
  const openInvite = (prefillEmail?: string) => {
    if (prefillEmail) {
      setInviteEmail(prefillEmail.trim());
      setSearchQuery("");
    }
    setShowInviteForm(true);
  };
  // Foca o campo de email sempre que o painel de convite abre (some a confusão com a busca).
  useEffect(() => {
    if (showInviteForm) inviteInputRef.current?.focus();
  }, [showInviteForm]);

  const membersQuery = useQuery({
    queryKey: ["circuitMembers", circuit.id],
    queryFn: () => getCircuitMembers(circuit.id),
    enabled: open && Boolean(circuit.id),
  });
  const members: CircuitMember[] = membersQuery.data?.members ?? [];
  const invitationsQuery = useQuery({
    queryKey: ["circuit-invitations", circuit.id],
    queryFn: () => getCircuitInvitations(circuit.id),
    enabled: open && Boolean(circuit.id),
  });

  // Todos os convites, pendentes primeiro, depois mais recentes.
  const invitations = [...(invitationsQuery.data ?? [])].sort((a, b) => {
    const rank = (s: string) => (s === "pending" ? 0 : 1);
    return rank(a.status) - rank(b.status) || (b.created_at ?? "").localeCompare(a.created_at ?? "");
  });

  const inviteErrorMessage = (error: unknown) =>
    error instanceof ApiError && error.status === 409
      ? "Já existe um convite pendente para este destinatário."
      : error instanceof Error
        ? error.message
        : "Tente novamente mais tarde";

  const inviteMutation = useMutation({
    mutationFn: (vars: { email: string; role: string }) =>
      createCircuitInvitation(circuit.id, {
        invited_email: vars.email,
        role: vars.role,
        expires_in_days: 14,
      }),
    onSuccess: (_invitation, vars) => {
      toast({
        title: "Convite enviado",
        description: `Convite pendente para ${vars.email} (${vars.role}).`,
      });
      setInviteEmail("");
      setInviteRole("member"); // reseta o papel — senão gruda e o próximo convite herda (ex.: admin)
      setShowInviteForm(false);
      queryClient.invalidateQueries({ queryKey: ["circuit-invitations", circuit.id] });
      queryClient.invalidateQueries({ queryKey: ["circuitMembers", circuit.id] });
    },
    onError: (error) =>
      toast({
        title: "Erro ao enviar convite",
        description: inviteErrorMessage(error),
        variant: "destructive",
      }),
  });

  // Reenviar = criar um convite novo com o mesmo destinatário/papel (não há endpoint de
  // resend; só oferecemos em convites não-pendentes: expirado/recusado/cancelado).
  const resendMutation = useMutation({
    mutationFn: (invitation: CircuitInvitation) =>
      createCircuitInvitation(circuit.id, {
        invited_email: invitation.invited_email ?? undefined,
        invited_user_id: invitation.invited_email ? undefined : invitation.invited_user_id,
        role: invitation.role,
        expires_in_days: 14,
      }),
    onSuccess: () => {
      toast({ title: "Convite reenviado", description: "Um novo convite pendente foi criado." });
      queryClient.invalidateQueries({ queryKey: ["circuit-invitations", circuit.id] });
    },
    onError: (error) =>
      toast({
        title: "Erro ao reenviar convite",
        description: inviteErrorMessage(error),
        variant: "destructive",
      }),
  });

  const cancelMutation = useMutation({
    mutationFn: (invitationId: string) => cancelCircuitInvitation(invitationId),
    onSuccess: () => {
      toast({ title: "Convite cancelado", description: "O convite pendente foi cancelado." });
      queryClient.invalidateQueries({ queryKey: ["circuit-invitations", circuit.id] });
    },
    onError: (error) =>
      toast({
        title: "Erro ao cancelar convite",
        description: error instanceof Error ? error.message : "Tente novamente mais tarde",
        variant: "destructive",
      }),
  });

  const filteredMembers = members.filter((member) => {
    const needle = searchQuery.toLowerCase();
    return (
      member.user_id.toLowerCase().includes(needle) ||
      member.role.toLowerCase().includes(needle) ||
      (member.status || "").toLowerCase().includes(needle) ||
      (member.terms_status || "").toLowerCase().includes(needle)
    );
  });

  const handleInvite = () => {
    const email = inviteEmail.trim();
    if (!email) return;
    inviteMutation.mutate({ email, role: inviteRole });
  };

  const formatDate = (value: string) => {
    return new Date(value).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (value: string) => {
    return new Date(value).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const invitationTarget = (invitation: CircuitInvitation) =>
    invitation.invited_email || invitation.invited_user_id || "destinatário";

  const roleLabel = (role: string) => {
    const normalized = role.toLowerCase();
    if (normalized === "owner") return "owner";
    if (normalized === "admin") return "admin";
    if (normalized === "viewer") return "viewer";
    return "member";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Gerenciar Membros
          </DialogTitle>
          <DialogDescription>
            Gerencie os membros do circuito "{circuit.name}"
          </DialogDescription>
        </DialogHeader>

        {/* Zona 1: BUSCAR membros (só filtra a lista abaixo — não convida). */}
        <div className="flex items-center gap-2 py-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar membros do circuito..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              aria-label="Buscar membros"
            />
          </div>
          <Button
            onClick={() => {
              // Se há um email na busca, leva-o pro convite (mata o footgun) — mesmo com o painel
              // já aberto. Sem email, alterna o painel.
              if (isEmail(searchQuery)) openInvite(searchQuery);
              else setShowInviteForm((v) => !v);
            }}
            variant={showInviteForm ? "secondary" : "default"}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Convidar
          </Button>
        </div>

        {/* Zona 2: CONVIDAR por email (o que de fato cria o convite). */}
        {showInviteForm && (
          <div className="space-y-2 p-4 bg-muted/50 rounded-lg border border-border">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Convidar por email
            </p>
            <div className="flex items-center gap-2">
              <Input
                ref={inviteInputRef}
                placeholder="email@exemplo.com"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleInvite();
                  }
                }}
                className="flex-1"
                aria-label="Email do convidado"
              />
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleInvite} disabled={inviteMutation.isPending || !inviteEmail.trim()}>
                {inviteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar"}
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0 space-y-2 py-2">
          {invitationsQuery.isError ? (
            <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-sm text-destructive">
              Não foi possível carregar os convites.
            </div>
          ) : null}

          {/* Convites — todos os estados (pendente/aceito/recusado/expirado/cancelado). */}
          {invitations.length > 0 ? (
            <div className="space-y-2 pb-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Convites ({invitations.length})
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {invitations.map((invitation) => {
                const st = INV_STATUS[invitation.status] ?? {
                  label: invitation.status,
                  cls: "bg-muted text-muted-foreground",
                };
                // Reenviar só em não-decisões (expirou/foi cancelado). 'declined' = a pessoa
                // recusou de propósito; não oferecemos re-convite de 1 clique (evita insistência).
                const canResend = ["expired", "cancelled"].includes(invitation.status);
                return (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-background"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {invitationTarget(invitation)}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {roleLabel(invitation.role)}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {invitation.status === "pending"
                          ? `Enviado ${formatDate(invitation.created_at)} · expira ${formatDateTime(invitation.expires_at)}`
                          : `Enviado ${formatDate(invitation.created_at)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium",
                          st.cls
                        )}
                      >
                        {st.label}
                      </span>
                      {invitation.status === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cancelMutation.mutate(invitation.id)}
                          disabled={cancelMutation.isPending}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Cancelar
                        </Button>
                      )}
                      {canResend && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resendMutation.mutate(invitation)}
                          disabled={resendMutation.isPending}
                        >
                          <RefreshCw className="h-3.5 w-3.5 mr-1" />
                          Reenviar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          ) : null}

          {membersQuery.isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Carregando membros...
            </div>
          ) : membersQuery.isError ? (
            <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-sm text-destructive">
              Não foi possível carregar os membros do circuito.
            </div>
          ) : filteredMembers.length > 0 ? (
            filteredMembers.map((member) => {
              const normalizedRole = roleLabel(member.role);
              const RoleIcon = roleIcons[normalizedRole] || User;
              const isOwner = normalizedRole === "owner";

              return (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-medium text-foreground truncate">
                        {member.user_id}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Desde {formatDate(member.joined_at)}
                        {member.terms_status ? ` · termo ${member.terms_status}` : ""}
                        {member.accepted_terms_version ? ` v${member.accepted_terms_version}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                        roleColors[normalizedRole] || roleColors.member
                      )}
                    >
                      <RoleIcon className="h-3 w-3" />
                      {normalizedRole}
                    </span>

                    {!isOwner && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem disabled>
                            <Shield className="h-4 w-4 mr-2" />
                            Alteração de papel em breve
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem disabled className="text-muted-foreground">
                            Remoção via endpoint dedicado
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {searchQuery ? "Nenhum membro encontrado" : "Nenhum membro no circuito"}
              </p>
              {/* Footgun-killer: digitou um email na busca? Oferece convidar direto. */}
              {searchQuery && isEmail(searchQuery) && (
                <Button className="mt-3" size="sm" onClick={() => openInvite(searchQuery)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Convidar {searchQuery.trim()}
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-border text-sm text-muted-foreground">
          {membersQuery.isLoading ? "Carregando membros..." : `${members.length} membro(s) no circuito`}
        </div>
      </DialogContent>
    </Dialog>
  );
}
