import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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

/**
 * Pendências de roteamento — itens que entraram sem regra/identificador resolvível.
 * Mora no Roteamento (é onde se cria a regra que resolve a pendência). Antes vivia
 * na aba "Operações" do Portal, junto de histórico de payload + log de API — que já
 * existem, mais ricos, na página Logs. Onda A: dissolvemos Operações e trouxemos só
 * o pedaço exclusivo (pendências) para o seu lar natural.
 */
export function PartnerRoutingIssues() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [issues, setIssues] = useState<RoutingIssueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [issueTargetCircuitId, setIssueTargetCircuitId] = useState("");
  const [issueStatusFilter, setIssueStatusFilter] = useState<string>("open,in_review");
  const [issueAssignedToMe, setIssueAssignedToMe] = useState(false);
  const [issueSavingKey, setIssueSavingKey] = useState<string | null>(null);

  const formatIssueType = (identifierType: string) => {
    if (identifierType === "unknown") {
      return t("portal.routing.issues.typeMissingFull");
    }
    return identifierType.toUpperCase();
  };

  const formatIssueStatus = (status: string) =>
    t(`portal.enums.issueStatus.${status}`, { defaultValue: status });

  const formatIssueReason = (reason: string) =>
    t(`portal.enums.issueReason.${reason}`, { defaultValue: reason });

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
        title: t("portal.routing.issues.toasts.loadErrorTitle"),
        description: t("portal.routing.issues.toasts.loadErrorDesc"),
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
        <h3 className="text-base font-semibold">{t("portal.routing.issues.title")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("portal.routing.issues.desc")}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">{t("portal.routing.issues.totalListed")}</p>
          <p className="text-lg font-semibold">{issues.length}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">{t("portal.routing.issues.open")}</p>
          <p className="text-lg font-semibold">{openIssueCount}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">{t("portal.routing.issues.inReview")}</p>
          <p className="text-lg font-semibold">{inReviewIssueCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Select value={issueTargetCircuitId} onValueChange={setIssueTargetCircuitId}>
          <SelectTrigger><SelectValue placeholder={t("portal.routing.issues.targetCircuitPlaceholder")} /></SelectTrigger>
          <SelectContent>
            {circuits.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground self-center">
          {t("portal.routing.issues.quickAction")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Select value={issueStatusFilter} onValueChange={setIssueStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder={t("portal.routing.issues.statusFilterPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open,in_review">{t("portal.routing.issues.filter.openInReview")}</SelectItem>
            <SelectItem value="open">{t("portal.routing.issues.filter.openOnly")}</SelectItem>
            <SelectItem value="in_review">{t("portal.routing.issues.filter.inReviewOnly")}</SelectItem>
            <SelectItem value="resolved">{t("portal.routing.issues.filter.resolved")}</SelectItem>
            <SelectItem value="rejected">{t("portal.routing.issues.filter.rejected")}</SelectItem>
          </SelectContent>
        </Select>
        <label className="md:col-span-2 flex items-center gap-3 text-sm border rounded-md px-3 py-2">
          <Switch
            checked={issueAssignedToMe}
            onCheckedChange={(checked) => setIssueAssignedToMe(Boolean(checked))}
            id="issue-assigned-to-me"
          />
          <Label htmlFor="issue-assigned-to-me">{t("portal.routing.issues.assignedToMe")}</Label>
        </label>
      </div>

      <div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          {t("portal.routing.issues.refresh")}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : issues.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("portal.routing.issues.none")}</p>
      ) : (
        <div className="space-y-2">
          {issues.map((issue) => (
            <div key={issue.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{issue.identifier_value || t("portal.routing.issues.emptyValue")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("portal.routing.issues.typeReasonLine", {
                      type: formatIssueType(issue.identifier_type),
                      reason: formatIssueReason(issue.reason),
                    })}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("portal.routing.issues.lastEvent", { date: new Date(issue.last_seen_at).toLocaleString("pt-BR") })}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2 py-1 rounded-full border bg-muted text-muted-foreground border-border w-fit">
                    {t("portal.routing.issues.occurrences", { count: issue.occurrences })}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full border bg-muted text-muted-foreground border-border w-fit">
                    {formatIssueStatus(issue.status)}
                  </span>
                  {issue.assigned_to ? (
                    <span className="text-xs px-2 py-1 rounded-full border bg-muted text-muted-foreground border-border w-fit">
                      {t("portal.routing.issues.assigned")}
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
                      toast({ title: t("portal.routing.issues.toasts.claimedTitle"), description: t("portal.routing.issues.toasts.claimedDesc") });
                      await load();
                    } catch {
                      toast({
                        title: t("portal.routing.issues.toasts.claimErrorTitle"),
                        description: t("portal.routing.issues.toasts.claimErrorDesc"),
                        variant: "destructive",
                      });
                    } finally {
                      setIssueSavingKey(null);
                    }
                  }}
                >
                  {issueSavingKey === `assign:${issue.id}` ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  {t("portal.routing.issues.claim")}
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
                        resolution_notes: t("portal.routing.issues.notesRuleResolved"),
                        create_rule: true,
                        circuit_id: issueTargetCircuitId,
                      });
                      toast({ title: t("portal.routing.issues.toasts.resolvedTitle"), description: t("portal.routing.issues.toasts.resolvedDesc") });
                      await load();
                    } catch {
                      toast({
                        title: t("portal.routing.issues.toasts.resolveErrorTitle"),
                        description: t("portal.routing.issues.toasts.resolveErrorDesc"),
                        variant: "destructive",
                      });
                    } finally {
                      setIssueSavingKey(null);
                    }
                  }}
                >
                  {issueSavingKey === `resolve:${issue.id}` ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  {t("portal.routing.issues.resolveWithRule")}
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
                        resolution_notes: t("portal.routing.issues.notesManualResolved"),
                        create_rule: false,
                      });
                      toast({ title: t("portal.routing.issues.toasts.closedTitle"), description: t("portal.routing.issues.toasts.closedDesc") });
                      await load();
                    } catch {
                      toast({
                        title: t("portal.routing.issues.toasts.closeErrorTitle"),
                        description: t("portal.routing.issues.toasts.closeErrorDesc"),
                        variant: "destructive",
                      });
                    } finally {
                      setIssueSavingKey(null);
                    }
                  }}
                >
                  {issueSavingKey === `resolve-manual:${issue.id}` ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  {t("portal.routing.issues.resolveManually")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
