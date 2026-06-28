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
  downloadRawPayload,
  listRawPayloads,
  listRoutingIssueItems,
  resolveRoutingIssue,
  type RawPayloadSummary,
  type RoutingIssueItem,
} from "@/lib/api/partner-routing";
import type { Circuit } from "@/lib/api/types";
import { Download, FileUp, Languages, Loader2, ScrollText, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/contexts/AuthContext";
import {
  clearLog,
  getLogEntries,
  subscribeLog,
  type PartnerRequestLogEntry,
} from "@/lib/api/partner-request-log";
import { usePartnerPortalLocale } from "@/components/partner/usePartnerPortalLocale";

export function PartnerOperations() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [history, setHistory] = useState<RawPayloadSummary[]>([]);
  const [issues, setIssues] = useState<RoutingIssueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const [issueTargetCircuitId, setIssueTargetCircuitId] = useState("");
  const [issueStatusFilter, setIssueStatusFilter] = useState<string>("open,in_review");
  const [issueAssignedToMe, setIssueAssignedToMe] = useState(false);
  const [issueSavingKey, setIssueSavingKey] = useState<string | null>(null);
  const [logEntries, setLogEntries] = useState<PartnerRequestLogEntry[]>(getLogEntries);
  const [logExpanded, setLogExpanded] = useState(false);
  const { locale: metadataLocale, setLocale: setMetadataLocale } = usePartnerPortalLocale();
  const isEn = metadataLocale === "en";

  useEffect(() => {
    return subscribeLog(() => setLogEntries(getLogEntries()));
  }, []);

  const formatIssueType = (identifierType: string) => {
    if (identifierType === "unknown") {
      return isEn
        ? "Missing routing identifier (LAND_DFID/CAR/CCIR/INCRA/NIRF/CIB/MATRICULA/GEOREF/IE)"
        : "Sem identificador de roteamento (LAND_DFID/CAR/CCIR/INCRA/NIRF/CIB/MATRÍCULA/GEOREF/IE)";
    }
    return identifierType.toUpperCase();
  };

  const circuitNameMap = useMemo(() => new Map(circuits.map((c) => [c.id, c.name])), [circuits]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [circuitsData, rawData, issuesData] = await Promise.all([
        getCircuits(),
        listRawPayloads(40),
        listRoutingIssueItems({ status: issueStatusFilter, assigned_to_me: issueAssignedToMe, limit: 200 }),
      ]);
      setCircuits(circuitsData);
      setHistory(rawData.rows);
      setIssues(issuesData.issues);
      if (!issueTargetCircuitId && circuitsData[0]) {
        setIssueTargetCircuitId(circuitsData[0].id);
      }
    } catch {
      toast({
        title: isEn ? "Failed to load ingestions" : "Erro ao carregar ingestões",
        description: isEn ? "Could not load ingestion history." : "Não foi possível carregar histórico da ingestão.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, issueTargetCircuitId, issueStatusFilter, issueAssignedToMe]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filteredHistory = history.filter((row) => {
    const byStatus = statusFilter === "all" || row.status === statusFilter;
    const search = searchText.trim().toLowerCase();
    if (!search) return byStatus;
    return (
      byStatus &&
      ((row.file_name || "").toLowerCase().includes(search) ||
        row.payload_sha256.toLowerCase().includes(search) ||
        (row.error_message || "").toLowerCase().includes(search))
    );
  });

  const completedCount = history.filter((h) => h.status === "completed").length;
  const failedCount = history.filter((h) => h.status === "failed").length;
  const openIssueCount = issues.filter((i) => i.status === "open").length;
  const inReviewIssueCount = issues.filter((i) => i.status === "in_review").length;

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{isEn ? "Operations" : "Operações"}</h3>
          <p className="text-sm text-muted-foreground">
            {isEn
              ? "Raw payload history, routing issues and API request log."
              : "Histórico de payloads, pendências de roteamento e log de requisições."}
          </p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/30 p-1">
          <Languages className="h-3.5 w-3.5 text-muted-foreground ml-1" />
          <Button
            size="sm"
            variant={metadataLocale === "pt-BR" ? "default" : "ghost"}
            className="h-6 px-2 text-[11px]"
            onClick={() => setMetadataLocale("pt-BR")}
          >
            PT-BR
          </Button>
          <Button
            size="sm"
            variant={metadataLocale === "en" ? "default" : "ghost"}
            className="h-6 px-2 text-[11px]"
            onClick={() => setMetadataLocale("en")}
          >
            EN
          </Button>
        </div>
      </div>

      <Card className="p-5 space-y-4">
        <h3 className="text-base font-semibold">{isEn ? "Raw payload history" : "Histórico de Payload Bruto"}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{isEn ? "Files sent" : "Arquivos enviados"}</p>
            <p className="text-lg font-semibold">{history.length}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{isEn ? "Processed successfully" : "Processados com sucesso"}</p>
            <p className="text-lg font-semibold text-primary">{completedCount}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{isEn ? "Failed" : "Com falha"}</p>
            <p className="text-lg font-semibold text-destructive">{failedCount}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder={isEn ? "Filter by status" : "Filtrar por status"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isEn ? "All statuses" : "Todos os status"}</SelectItem>
              <SelectItem value="completed">{isEn ? "Completed" : "Concluído"}</SelectItem>
              <SelectItem value="partial">{isEn ? "Partial" : "Parcial"}</SelectItem>
              <SelectItem value="failed">{isEn ? "Failed" : "Falha"}</SelectItem>
              <SelectItem value="processing">{isEn ? "Processing" : "Processando"}</SelectItem>
            </SelectContent>
          </Select>
          <label className="md:col-span-2 border rounded-md px-3 py-2">
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full bg-transparent text-sm outline-none"
              placeholder={isEn ? "Search by file name, hash, or error" : "Buscar por nome do arquivo, hash ou erro"}
            />
          </label>
        </div>

        {filteredHistory.length === 0 ? (
          <EmptyState
            icon={FileUp}
            title={isEn ? "No payloads registered" : "Nenhum payload registrado"}
            description={isEn ? "Send a JSON payload (default) or CSV/JSON file (alternative) to start." : "Envie um payload JSON (padrão) ou arquivo CSV/JSON (alternativo) para começar."}
          />
        ) : (
          <div className="space-y-2">
            {filteredHistory.map((row) => (
              <div key={row.id} className="rounded-lg border p-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{row.file_name || "payload"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(row.created_at).toLocaleString("pt-BR")} · {row.payload_size_bytes.toLocaleString("pt-BR")} bytes · sha256 {row.payload_sha256.slice(0, 12)}...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      staging: {row.source_circuit_id ? (circuitNameMap.get(row.source_circuit_id) || row.source_circuit_id) : "n/a"}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border ${
                    row.status === "completed"
                      ? "bg-primary/10 text-primary border-primary/20"
                      : row.status === "partial"
                        ? "bg-muted text-muted-foreground border-border"
                        : row.status === "failed"
                          ? "bg-destructive/10 text-destructive border-destructive/20"
                          : "bg-muted text-muted-foreground border-border"
                  }`}>
                    {row.status}
                  </span>
                </div>
                {row.error_message ? (
                  <p className="text-xs text-destructive mt-2">
                    {row.error_message} · {isEn ? "Next action: adjust template/routing and resend." : "Próxima ação: ajustar template/roteamento e reenviar."}
                  </p>
                ) : null}
                <div className="mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const { blob, fileName } = await downloadRawPayload(row.id, {
                          suggestedFileName: row.file_name,
                          contentType: row.content_type,
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = fileName;
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch {
                        toast({
                          title: isEn ? "Failed to download payload" : "Falha ao baixar payload",
                          description: isEn ? "Could not download raw file." : "Não foi possível baixar este arquivo bruto.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    {isEn ? "Download original" : "Baixar original"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="text-base font-semibold">{isEn ? "Routing issues" : "Pendências de Roteamento"}</h3>
        <p className="text-sm text-muted-foreground">
          {isEn ? "Issues detected during ingestion. Claim and resolve with rule to avoid recurrence." : "Pendências detectadas na ingestão. Assuma e resolva com regra para evitar recorrência."}
        </p>
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
          <Select
            value={issueStatusFilter}
            onValueChange={(value) => {
              setIssueStatusFilter(value);
            }}
          >
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
        {issues.length === 0 ? (
          <p className="text-sm text-muted-foreground">{isEn ? "No issues at the moment." : "Nenhuma pendência no momento."}</p>
        ) : (
          <div className="space-y-2">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className="rounded-lg border p-3 space-y-2"
              >
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
                    {issueSavingKey === `assign:${issue.id}` ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : null}
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
                    {issueSavingKey === `resolve:${issue.id}` ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : null}
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
                    {issueSavingKey === `resolve-manual:${issue.id}` ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : null}
                    {isEn ? "Resolve manually" : "Resolver manual"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-base font-semibold">{isEn ? "API request log" : "Log de Requisições da API"}</h3>
            <span className="text-xs text-muted-foreground">({logEntries.length})</span>
          </div>
          <div className="flex items-center gap-2">
            {logEntries.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { clearLog(); setLogEntries([]); }}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                {isEn ? "Clear" : "Limpar"}
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLogExpanded(!logExpanded)}
            >
              {logExpanded ? (isEn ? "Collapse" : "Recolher") : (isEn ? "Expand" : "Expandir")}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {isEn
            ? "All calls made to partner endpoints in this session. Useful for debugging and verification."
            : "Todas as chamadas feitas para endpoints de parceiro nesta sessão. Útil para depuração e verificação."}
        </p>
        {logEntries.length === 0 ? (
          <p className="text-xs text-muted-foreground">{isEn ? "No requests recorded in this session." : "Nenhuma requisição registrada nesta sessão."}</p>
        ) : (
          <div className={`space-y-1 ${logExpanded ? "" : "max-h-[320px] overflow-y-auto"}`}>
            {logEntries.map((entry) => (
              <div
                key={entry.id}
                className="rounded border px-3 py-2 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs"
              >
                <span className="text-muted-foreground shrink-0 w-[140px]">
                  {new Date(entry.timestamp).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit", day: "2-digit", month: "2-digit" })}
                </span>
                <span className="font-mono font-medium shrink-0">
                  {entry.method}
                </span>
                <span className="font-mono text-muted-foreground truncate flex-1" title={entry.endpoint}>
                  {entry.endpoint}
                </span>
                {entry.status != null ? (
                  <span className={`shrink-0 px-1.5 py-0.5 rounded text-[11px] font-medium ${
                    entry.status >= 200 && entry.status < 300
                      ? "bg-primary/10 text-primary"
                      : entry.status >= 400
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground"
                  }`}>
                    {entry.status}
                  </span>
                ) : (
                  <span className="shrink-0 px-1.5 py-0.5 rounded text-[11px] font-medium bg-destructive/10 text-destructive">
                    {isEn ? "NETWORK" : "REDE"}
                  </span>
                )}
                <span className="text-muted-foreground shrink-0 w-[60px] text-right">
                  {entry.durationMs}ms
                </span>
                {entry.errorCode ? (
                  <span className="text-destructive truncate" title={entry.errorMessage || undefined}>
                    {entry.errorCode}{entry.errorMessage ? `: ${entry.errorMessage}` : ""}
                  </span>
                ) : entry.responseSummary ? (
                  <span className="text-muted-foreground truncate" title={entry.responseSummary}>
                    {entry.responseSummary}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
