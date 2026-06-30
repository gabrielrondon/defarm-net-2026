import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getCircuits } from "@/lib/api/circuits";
import {
  assignRoutingIssue,
  listRoutingIssueItems,
  resolveRoutingIssue,
  type RoutingIssueItem,
} from "@/lib/api/partner-routing";
import type { Circuit } from "@/lib/api/types";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePartnerPortalLocale } from "@/components/partner/usePartnerPortalLocale";

/**
 * Pendências de roteamento — itens que entraram sem regra/identificador resolvível.
 * Mora no Roteamento (é onde se cria a regra que resolve a pendência). Antes vivia
 * na aba "Operações" do Portal, junto de histórico de payload + log de API — que já
 * existem, mais ricos, na página Logs. Onda A: dissolvemos Operações e trouxemos só
 * o pedaço exclusivo (pendências) para o seu lar natural.
 */
export function PartnerRoutingIssues() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { locale } = usePartnerPortalLocale();
  const isEn = locale === "en";
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [issues, setIssues] = useState<RoutingIssueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [issueTargetCircuitId, setIssueTargetCircuitId] = useState("");
  const [issueStatusFilter, setIssueStatusFilter] = useState<string>("open,in_review");
  const [issueAssignedToMe, setIssueAssignedToMe] = useState(false);
  const [issueSavingKey, setIssueSavingKey] = useState<string | null>(null);

  const formatIssueType = (identifierType: string) => {
    if (identifierType === "unknown") {
      return isEn
        ? "Missing routing identifier (LAND_DFID/CAR/CCIR/INCRA/NIRF/CIB/MATRICULA/GEOREF/IE)"
        : "Sem identificador de roteamento (LAND_DFID/CAR/CCIR/INCRA/NIRF/CIB/MATRÍCULA/GEOREF/IE)";
    }
    return identifierType.toUpperCase();
  };

  const formatIssueReason = (reason: string) => {
    if (reason === "missing_identifier") return isEn ? "missing identifier" : "sem identificador";
    if (reason === "missing_value_chain") return isEn ? "missing value_chain" : "sem value_chain";
    if (reason === "missing_trackable_identifier") return isEn ? "missing trackable identifier" : "sem identificador do ativo";
    if (reason === "empty_after_normalization") return isEn ? "invalid identifier after normalization" : "identificador inválido";
    if (reason === "no_routing_rule") return isEn ? "no routing rule" : "sem regra de roteamento";
    return reason;
  };

  const canAutoResolveWithRule = (issue: RoutingIssueItem) =>
    issue.identifier_type !== "unknown" && issue.identifier_value.trim().length > 0;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [circuitsData, issuesData] = await Promise.all([
        getCircuits(),
        listRoutingIssueItems({ status: issueStatusFilter, assigned_to_me: issueAssignedToMe, limit: 200 }),
      ]);
      setCircuits(circuitsData);
      setIssues(issuesData.issues);
      if (!issueTargetCircuitId && circuitsData[0]) {
        setIssueTargetCircuitId(circuitsData[0].id);
      }
    } catch {
      toast({
        title: isEn ? "Failed to load routing issues" : "Erro ao carregar pendências",
        description: isEn ? "Could not load routing issues." : "Não foi possível carregar as pendências de roteamento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, issueStatusFilter, issueAssignedToMe]);

  useEffect(() => {
    load();
  }, [load]);

  const openIssueCount = issues.filter((i) => i.status === "open").length;
  const inReviewIssueCount = issues.filter((i) => i.status === "in_review").length;

  return (
    <Card className="p-5 space-y-4">
      <div>
        <h3 className="text-base font-semibold">{isEn ? "Routing issues" : "Pendências de Roteamento"}</h3>
        <p className="text-sm text-muted-foreground">
          {isEn
            ? "Items that arrived without a resolvable rule/identifier. Claim and resolve with a rule to avoid recurrence."
            : "Itens que chegaram sem regra/identificador resolvível. Assuma e resolva com regra para evitar recorrência."}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">{isEn ? "Total listed" : "Total listado"}</p>
          <p className="text-lg font-semibold">{issues.length}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">{isEn ? "Open" : "Abertas"}</p>
          <p className="text-lg font-semibold">{openIssueCount}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">{isEn ? "In review" : "Em revisão"}</p>
          <p className="text-lg font-semibold">{inReviewIssueCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Select value={issueTargetCircuitId} onValueChange={setIssueTargetCircuitId}>
          <SelectTrigger><SelectValue placeholder={isEn ? "Target circuit for quick resolution" : "Circuito destino para resolução rápida"} /></SelectTrigger>
          <SelectContent>
            {circuits.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground self-center">
          {isEn ? "Quick action: create a rule linked to selected circuit." : "Ação rápida: cria regra já vinculando a pendência ao circuito escolhido."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Select value={issueStatusFilter} onValueChange={setIssueStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder={isEn ? "Issue status" : "Status da pendência"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open,in_review">{isEn ? "Open + in review" : "Abertas + em revisão"}</SelectItem>
            <SelectItem value="open">{isEn ? "Open only" : "Só abertas"}</SelectItem>
            <SelectItem value="in_review">{isEn ? "In review only" : "Só em revisão"}</SelectItem>
            <SelectItem value="resolved">{isEn ? "Resolved" : "Resolvidas"}</SelectItem>
            <SelectItem value="rejected">{isEn ? "Rejected" : "Rejeitadas"}</SelectItem>
          </SelectContent>
        </Select>
        <label className="md:col-span-2 flex items-center gap-3 text-sm border rounded-md px-3 py-2">
          <Switch
            checked={issueAssignedToMe}
            onCheckedChange={(checked) => setIssueAssignedToMe(Boolean(checked))}
            id="issue-assigned-to-me"
          />
          <Label htmlFor="issue-assigned-to-me">{isEn ? "Show only assigned to me" : "Mostrar apenas atribuídas para mim"}</Label>
        </label>
      </div>

      <div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          {isEn ? "Refresh issues" : "Atualizar pendências"}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : issues.length === 0 ? (
        <p className="text-sm text-muted-foreground">{isEn ? "No issues at the moment." : "Nenhuma pendência no momento."}</p>
      ) : (
        <div className="space-y-2">
          {issues.map((issue) => (
            <div key={issue.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{issue.identifier_value || "(vazio)"}</p>
                  <p className="text-xs text-muted-foreground">
                    {isEn ? "type" : "tipo"}: {formatIssueType(issue.identifier_type)} · {isEn ? "reason" : "motivo"}: {formatIssueReason(issue.reason)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {isEn ? "last event" : "último evento"}: {new Date(issue.last_seen_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2 py-1 rounded-full border bg-muted text-muted-foreground border-border w-fit">
                    {issue.occurrences} {isEn ? "occurrence(s)" : "ocorrência(s)"}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full border bg-muted text-muted-foreground border-border w-fit">
                    {issue.status}
                  </span>
                  {issue.assigned_to ? (
                    <span className="text-xs px-2 py-1 rounded-full border bg-muted text-muted-foreground border-border w-fit">
                      {isEn ? "assigned" : "atribuída"}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={issueSavingKey === `assign:${issue.id}` || issue.assigned_to === user?.id}
                  onClick={async () => {
                    setIssueSavingKey(`assign:${issue.id}`);
                    try {
                      await assignRoutingIssue(issue.id, {});
                      toast({ title: isEn ? "Issue claimed" : "Pendência assumida", description: isEn ? "Issue is now in review for your user." : "Agora ela está em revisão para seu usuário." });
                      await load();
                    } catch {
                      toast({
                        title: isEn ? "Failed to claim issue" : "Falha ao assumir pendência",
                        description: isEn ? "Could not assign issue." : "Não foi possível atribuir a pendência.",
                        variant: "destructive",
                      });
                    } finally {
                      setIssueSavingKey(null);
                    }
                  }}
                >
                  {issueSavingKey === `assign:${issue.id}` ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  {isEn ? "Claim" : "Assumir"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    !issueTargetCircuitId ||
                    !canAutoResolveWithRule(issue) ||
                    !issue.can_resolve ||
                    issueSavingKey === `resolve:${issue.id}`
                  }
                  onClick={async () => {
                    setIssueSavingKey(`resolve:${issue.id}`);
                    try {
                      await resolveRoutingIssue(issue.id, {
                        resolution_action: "rule_created",
                        resolution_notes: isEn ? "Resolved in Partner Portal" : "Resolvido no Partner Portal",
                        create_rule: true,
                        circuit_id: issueTargetCircuitId,
                      });
                      toast({ title: isEn ? "Issue resolved" : "Pendência resolvida", description: isEn ? "Rule created and issue closed." : "Regra criada e pendência encerrada." });
                      await load();
                    } catch {
                      toast({
                        title: isEn ? "Failed to resolve issue" : "Falha ao resolver pendência",
                        description: isEn ? "Could not create rule and resolve automatically." : "Não foi possível criar regra e resolver automaticamente.",
                        variant: "destructive",
                      });
                    } finally {
                      setIssueSavingKey(null);
                    }
                  }}
                >
                  {issueSavingKey === `resolve:${issue.id}` ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  {isEn ? "Resolve with rule" : "Resolver com regra"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!issue.can_resolve || issueSavingKey === `resolve-manual:${issue.id}`}
                  onClick={async () => {
                    setIssueSavingKey(`resolve-manual:${issue.id}`);
                    try {
                      await resolveRoutingIssue(issue.id, {
                        resolution_action: "manual_resolution",
                        resolution_notes: isEn ? "Manually resolved in Partner Portal" : "Resolvido manualmente no Partner Portal",
                        create_rule: false,
                      });
                      toast({ title: isEn ? "Issue closed" : "Pendência encerrada", description: isEn ? "Marked as manually resolved." : "Marcada como resolvida manualmente." });
                      await load();
                    } catch {
                      toast({
                        title: isEn ? "Failed to close issue" : "Falha ao encerrar pendência",
                        description: isEn ? "Could not mark as resolved." : "Não foi possível marcar como resolvida.",
                        variant: "destructive",
                      });
                    } finally {
                      setIssueSavingKey(null);
                    }
                  }}
                >
                  {issueSavingKey === `resolve-manual:${issue.id}` ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  {isEn ? "Resolve manually" : "Resolver manual"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
