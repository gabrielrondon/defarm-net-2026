import { useState } from "react";
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
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Circuit } from "@/lib/defarm-api";
import {
  cancelCircuitInvitation,
  createCircuitInvitation,
  getCircuitInvitations,
} from "@/lib/api/circuits";
import type { CircuitInvitation } from "@/lib/api/types";
import { ApiError } from "@/lib/api/client";

interface ManageMembersDialogProps {
  circuit: Circuit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MemberData {
  member_id: string;
  role: string;
  custom_role_name?: string | null;
  permissions: string[];
  joined_timestamp: number;
}

const roleIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Owner: Crown,
  Admin: Shield,
  Member: User,
  Viewer: Eye,
};

const roleColors: Record<string, string> = {
  Owner: "bg-amber-500/10 text-amber-600",
  Admin: "bg-blue-500/10 text-blue-600",
  Member: "bg-primary/10 text-primary",
  Viewer: "bg-muted text-muted-foreground",
};

export function ManageMembersDialog({
  circuit,
  open,
  onOpenChange,
}: ManageMembersDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [showInviteForm, setShowInviteForm] = useState(false);

  // Get members from circuit data - the API returns them with the circuit
  const members: MemberData[] = (circuit as any).members || [];
  const invitationsQuery = useQuery({
    queryKey: ["circuit-invitations", circuit.id],
    queryFn: () => getCircuitInvitations(circuit.id),
    enabled: open && Boolean(circuit.id),
  });

  const pendingInvitations = (invitationsQuery.data ?? []).filter(
    (invitation) => invitation.status === "pending"
  );

  const inviteMutation = useMutation({
    mutationFn: (email: string) =>
      createCircuitInvitation(circuit.id, {
        invited_email: email,
        role: "Member",
        expires_in_days: 14,
      }),
    onSuccess: (_invitation, email) => {
      toast({
        title: "Convite registrado",
        description: `Convite pendente para ${email}.`,
      });
      setInviteEmail("");
      setShowInviteForm(false);
      queryClient.invalidateQueries({ queryKey: ["circuit-invitations", circuit.id] });
    },
    onError: (error) => {
      const message =
        error instanceof ApiError && error.status === 409
          ? "Já existe um convite pendente para este destinatário."
          : error instanceof Error
            ? error.message
            : "Tente novamente mais tarde";
      toast({
        title: "Erro ao enviar convite",
        description: message,
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (invitationId: string) => cancelCircuitInvitation(invitationId),
    onSuccess: () => {
      toast({
        title: "Convite cancelado",
        description: "O convite pendente foi cancelado.",
      });
      queryClient.invalidateQueries({ queryKey: ["circuit-invitations", circuit.id] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao cancelar convite",
        description: error instanceof Error ? error.message : "Tente novamente mais tarde",
        variant: "destructive",
      });
    },
  });

  const filteredMembers = members.filter((member) =>
    member.member_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    inviteMutation.mutate(inviteEmail.trim());
  };

  const handleRemoveMember = (memberId: string) => {
    // TODO: Implement actual remove member API
    toast({
      title: "Membro removido",
      description: `${memberId} foi removido do circuito`,
    });
  };

  const handleChangeRole = (memberId: string, newRole: string) => {
    // TODO: Implement actual change role API
    toast({
      title: "Cargo alterado",
      description: `Cargo de ${memberId} alterado para ${newRole}`,
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("pt-BR", {
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

        <div className="flex items-center gap-2 py-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar membros..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            onClick={() => setShowInviteForm(!showInviteForm)}
            variant={showInviteForm ? "secondary" : "default"}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Convidar
          </Button>
        </div>

        {showInviteForm && (
          <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg border border-border">
            <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Input
              placeholder="email@exemplo.com"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleInvite} disabled={inviteMutation.isPending || !inviteEmail.trim()}>
              {inviteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Enviar"
              )}
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0 space-y-2 py-2">
          {invitationsQuery.isError ? (
            <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-sm text-destructive">
              Não foi possível carregar os convites pendentes.
            </div>
          ) : null}

          {pendingInvitations.length > 0 ? (
            <div className="space-y-2 pb-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Convites pendentes
              </p>
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50/70"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {invitationTarget(invitation)}
                    </p>
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Expira em {formatDateTime(invitation.expires_at)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cancelMutation.mutate(invitation.id)}
                    disabled={cancelMutation.isPending}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Cancelar
                  </Button>
                </div>
              ))}
            </div>
          ) : null}

          {filteredMembers.length > 0 ? (
            filteredMembers.map((member) => {
              const RoleIcon = roleIcons[member.role] || User;
              const isOwner = member.role === "Owner";

              return (
                <div
                  key={member.member_id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{member.member_id}</p>
                      <p className="text-xs text-muted-foreground">
                        Desde {formatDate(member.joined_timestamp)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                        roleColors[member.role] || roleColors.Member
                      )}
                    >
                      <RoleIcon className="h-3 w-3" />
                      {member.custom_role_name || member.role}
                    </span>

                    {!isOwner && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleChangeRole(member.member_id, "Admin")}>
                            <Shield className="h-4 w-4 mr-2" />
                            Promover a Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleChangeRole(member.member_id, "Member")}>
                            <User className="h-4 w-4 mr-2" />
                            Definir como Membro
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleChangeRole(member.member_id, "Viewer")}>
                            <Eye className="h-4 w-4 mr-2" />
                            Definir como Visualizador
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleRemoveMember(member.member_id)}
                          >
                            Remover do circuito
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
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-border text-sm text-muted-foreground">
          {members.length} membro(s) no circuito
        </div>
      </DialogContent>
    </Dialog>
  );
}
