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
  partnerIntake,
  partnerIntakePreview,
  resolveRoutingIssue,
  type PartnerIntakeResponse,
  type PartnerIntakePreviewResponse,
  type RawPayloadSummary,
  type RoutingIssueItem,
} from "@/lib/api/partner-routing";
import type { Circuit } from "@/lib/api/types";
import { AlertTriangle, Download, ExternalLink, FileUp, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api/client";
import { listIngestionTemplates } from "@/lib/api/ingestion-templates";
import type { IngestionTemplate } from "@/lib/api/types";

export function PartnerIntake() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [sourceCircuitId, setSourceCircuitId] = useState("");
  const [templateId, setTemplateId] = useState("none");
  const [inlineMappingText, setInlineMappingText] = useState("");
  const [templates, setTemplates] = useState<IngestionTemplate[]>([]);
  const [autoCreate, setAutoCreate] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<RawPayloadSummary[]>([]);
  const [issues, setIssues] = useState<RoutingIssueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const [issueTargetCircuitId, setIssueTargetCircuitId] = useState("");
  const [issueStatusFilter, setIssueStatusFilter] = useState<string>("open,in_review");
  const [issueAssignedToMe, setIssueAssignedToMe] = useState(false);
  const [issueSavingKey, setIssueSavingKey] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewRows, setPreviewRows] = useState(0);
  const [previewResolvable, setPreviewResolvable] = useState(0);
  const [previewUnknown, setPreviewUnknown] = useState(0);
  const [previewResult, setPreviewResult] = useState<PartnerIntakePreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<PartnerIntakeResponse | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const formatClientError = (err: unknown, fallback: string) => {
    if (err instanceof ApiError) {
      return `${err.message}${err.details ? ` · ${err.details}` : ""} (HTTP ${err.status} / ${err.code})`;
    }
    if (err instanceof Error) {
      return err.message;
    }
    return fallback;
  };

  const buildPreValidation = async (
    selectedFile: File | null,
    selectedSourceCircuitId?: string,
    selectedTemplateId?: string,
    selectedInlineMappingText?: string,
    showToastOnError = false
  ) => {
    setPreviewRows(0);
    setPreviewResolvable(0);
    setPreviewUnknown(0);
    setPreviewResult(null);
    setPreviewError(null);
    if (!selectedFile) return;
    const mappingText = (selectedInlineMappingText ?? inlineMappingText).trim();
    let inlineMapping: Record<string, unknown> | undefined;
    if (mappingText.length > 0) {
      try {
        const parsed = JSON.parse(mappingText);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("Mapping deve ser um objeto JSON.");
        }
        inlineMapping = parsed as Record<string, unknown>;
      } catch (err) {
        const description = err instanceof Error ? err.message : "Mapping JSON inválido.";
        setPreviewError(description);
        if (showToastOnError) {
          toast({ title: "Falha na prévia", description, variant: "destructive" });
        }
        return;
      }
    }
    setPreviewing(true);
    try {
      const preview = await partnerIntakePreview(
        selectedFile,
        selectedSourceCircuitId,
        autoCreate,
        selectedTemplateId && selectedTemplateId !== "none" ? selectedTemplateId : undefined,
        inlineMapping
      );
      setPreviewRows(preview.total_rows);
      setPreviewResolvable(preview.resolvable_rows);
      setPreviewUnknown(preview.unresolved_rows);
      setPreviewResult(preview);
    } catch (err) {
      const description = formatClientError(err, "Falha ao gerar prévia.");
      setPreviewResult(null);
      setPreviewError(description);
      if (showToastOnError) {
        toast({ title: "Falha na prévia", description, variant: "destructive" });
      }
    } finally {
      setPreviewing(false);
    }
  };

  const formatIssueType = (identifierType: string) => {
    if (identifierType === "unknown") return "Sem identificador de roteamento";
    return identifierType.toUpperCase();
  };

  const circuitNameMap = useMemo(() => new Map(circuits.map((c) => [c.id, c.name])), [circuits]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [circuitsData, rawData, issuesData, templatesData] = await Promise.all([
        getCircuits(),
        listRawPayloads(40),
        listRoutingIssueItems({ status: issueStatusFilter, assigned_to_me: issueAssignedToMe, limit: 200 }),
        listIngestionTemplates().catch(() => [] as IngestionTemplate[]),
      ]);
      setCircuits(circuitsData);
      setHistory(rawData.rows);
      setIssues(issuesData.issues);
      setTemplates(templatesData);
      if (!sourceCircuitId && circuitsData[0]) {
        const staging = circuitsData.find(
          (c) => c?.metadata?.partner_staging === true || c?.metadata?.partner_staging === "true"
        );
        setSourceCircuitId(staging?.id || circuitsData[0].id);
      }
      if (!issueTargetCircuitId && circuitsData[0]) {
        setIssueTargetCircuitId(circuitsData[0].id);
      }
    } catch {
      toast({
        title: "Erro ao carregar ingestões",
        description: "Não foi possível carregar histórico da ingestão.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, sourceCircuitId, issueTargetCircuitId, issueStatusFilter, issueAssignedToMe]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!file) return;
    void buildPreValidation(file, sourceCircuitId, templateId, inlineMappingText);
  }, [file, sourceCircuitId, autoCreate, templateId, inlineMappingText]);

  const onSubmit = async () => {
    if (!file) return;
    setSending(true);
    try {
      const mappingText = inlineMappingText.trim();
      let inlineMapping: Record<string, unknown> | undefined;
      if (mappingText.length > 0) {
        const parsed = JSON.parse(mappingText);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("Mapping deve ser um objeto JSON.");
        }
        inlineMapping = parsed as Record<string, unknown>;
      }
      const result = await partnerIntake(
        file,
        sourceCircuitId,
        autoCreate,
        templateId !== "none" ? templateId : undefined,
        inlineMapping
      );
      setLastResult(result);
      toast({
        title: "Ingestão processada",
        description: `Status: ${result.status}. Lotes roteados: ${result.routed_batches.length}.`,
      });
      setPreviewResult(null);
      setFile(null);
      await load();
    } catch (err) {
      toast({
        title: "Falha na ingestão",
        description: formatClientError(err, "Não foi possível processar este arquivo."),
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

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

  const formatIssueReason = (reason: string) => {
    if (reason === "missing_identifier") return "sem identificador";
    if (reason === "missing_value_chain") return "sem value_chain";
    if (reason === "missing_trackable_identifier") return "sem identificador do ativo";
    if (reason === "empty_after_normalization") return "identificador inválido";
    if (reason === "no_routing_rule") return "sem regra de roteamento";
    return reason;
  };

  const canAutoResolveWithRule = (issue: RoutingIssueItem) =>
    issue.identifier_type !== "unknown" && issue.identifier_value.trim().length > 0;

  return (
    <div className="space-y-8">
      {/* Upload section */}
      <div>
        <h2 className="text-foreground">Ingestão de Dados</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-lg">
          Envie CSV ou JSON. O sistema roteia automaticamente para os circuitos corretos.
        </p>
      </div>

      <div className="rounded-xl bg-muted/40 p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select value={sourceCircuitId} onValueChange={setSourceCircuitId}>
            <SelectTrigger><SelectValue placeholder="Circuito de staging" /></SelectTrigger>
            <SelectContent>
              {circuits.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <label className="border rounded-lg px-3 py-2 text-sm flex items-center gap-2 cursor-pointer bg-background">
            <FileUp className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate text-muted-foreground">{file?.name || "Selecionar arquivo"}</span>
            <input
              type="file"
              className="hidden"
              accept=".csv,.json,text/csv,application/json"
              onChange={async (e) => {
                const selected = e.target.files?.[0] || null;
                setFile(selected);
                if (selected) {
                  await buildPreValidation(selected, sourceCircuitId || undefined, templateId, inlineMappingText, true);
                }
              }}
            />
          </label>

          <Button onClick={onSubmit} disabled={!file || sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Processar"}
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={autoCreate} onCheckedChange={setAutoCreate} id="auto-create" />
          <Label htmlFor="auto-create" className="text-sm">Criar circuito automaticamente</Label>
        </div>

        {/* Advanced options - collapsible */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAdvanced ? "Ocultar" : "Mostrar"} opções avançadas
        </button>

        {showAdvanced && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Template (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem template</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}{template.is_default ? " (padrão)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground self-center">
                Use apenas quando precisar mapear colunas diferentes do padrão.
              </p>
            </div>

            <label className="block border rounded-lg p-3 bg-background">
              <p className="text-xs font-medium mb-2">Mapping inline (JSON, opcional)</p>
              <textarea
                value={inlineMappingText}
                onChange={(e) => setInlineMappingText(e.target.value)}
                className="w-full min-h-[72px] bg-transparent text-xs font-mono outline-none resize-y"
                placeholder='{"columns":{"id_interno":"partner_internal_id"}}'
              />
            </label>
          </div>
        )}

        {/* Preview */}
        {file && (
          <div className="rounded-lg border p-3 bg-background">
            <p className="text-xs font-medium text-foreground mb-2">Prévia de roteamento</p>
            {previewing ? (
              <p className="text-xs text-muted-foreground">Analisando...</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 text-xs">
                <p className="text-muted-foreground">Linhas: <span className="text-foreground font-medium">{previewRows}</span></p>
                <p className="text-muted-foreground">Resolvidas: <span className="text-primary font-medium">{previewResolvable}</span></p>
                <p className="text-muted-foreground">Pendentes: <span className="text-destructive font-medium">{previewUnknown}</span></p>
              </div>
            )}
            {previewError && <p className="text-xs text-destructive mt-2">{previewError}</p>}
            {!previewing && previewResult?.routing_plan?.length ? (
              <div className="mt-2 space-y-0.5">
                {previewResult.routing_plan.slice(0, 4).map((plan) => (
                  <p key={`${plan.identifier_type}-${plan.identifier_value}`} className="text-[11px] text-muted-foreground">
                    {plan.identifier_type.toUpperCase()} {plan.identifier_value} · {plan.rows} linha(s) · {plan.status === "routed_existing" ? circuitNameMap.get(plan.circuit_id || "") || "circuito" : plan.status === "would_auto_create" ? "novo circuito" : "pendente"}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* Last result */}
        {lastResult && (
          <div className="rounded-lg border p-3 bg-background space-y-2">
            <p className="text-xs font-medium text-foreground">
              Resultado: {lastResult.summary?.status || lastResult.status} · {lastResult.summary?.total_rows ?? lastResult.total_rows} linha(s)
            </p>
            {lastResult.summary && (
              <p className="text-[11px] text-muted-foreground">
                Lotes: {lastResult.summary.routed_batches} · Itens: {lastResult.summary.items_linked} · Pendências: {lastResult.summary.unresolved_rows}
              </p>
            )}
            {lastResult.summary?.warnings?.length ? (
              <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2 space-y-0.5">
                {lastResult.summary.warnings.map((w, i) => (
                  <p key={i} className="text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-1">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                    {w}
                  </p>
                ))}
              </div>
            ) : null}
            {lastResult.circuit_links?.length ? (
              <div className="flex flex-wrap gap-2">
                {lastResult.circuit_links.map((link) => (
                  <Button key={link.circuit_id} size="sm" variant="outline" asChild>
                    <a href={link.app_url} target="_blank" rel="noopener noreferrer">
                      Abrir circuito <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                ))}
              </div>
            ) : null}
            {lastResult.items?.length ? (
              <div className="space-y-1">
                {lastResult.items.slice(0, 10).map((item) => (
                  <div key={item.dfid} className="flex items-center gap-2 text-[11px]">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{item.dfid}</a>
                    {item.partner_reference && <span className="text-muted-foreground">ref: {item.partner_reference}</span>}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* History — compact */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="section-label">Histórico · {history.length}</p>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="failed">Falha</SelectItem>
                <SelectItem value="processing">Processando</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-xl bg-muted/40 p-3">
            <p className="metric-label">Enviados</p>
            <p className="text-lg font-bold text-foreground mt-1">{history.length}</p>
          </div>
          <div className="rounded-xl bg-muted/40 p-3">
            <p className="metric-label">Sucesso</p>
            <p className="text-lg font-bold text-primary mt-1">{completedCount}</p>
          </div>
          <div className="rounded-xl bg-muted/40 p-3">
            <p className="metric-label">Falha</p>
            <p className="text-lg font-bold text-destructive mt-1">{failedCount}</p>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <EmptyState icon={FileUp} title="Nenhum payload" description="Envie um arquivo acima." />
        ) : (
          <div className="space-y-1.5">
            {filteredHistory.slice(0, 20).map((row) => (
              <div key={row.id} className="rounded-lg border p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{row.file_name || "payload"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(row.created_at).toLocaleString("pt-BR")} · {(row.payload_size_bytes / 1024).toFixed(0)}KB
                  </p>
                  {row.error_message && <p className="text-[11px] text-destructive mt-0.5 truncate">{row.error_message}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                    row.status === "completed" ? "bg-primary/10 text-primary"
                      : row.status === "failed" ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground"
                  }`}>
                    {row.status}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
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
                        toast({ title: "Falha ao baixar", variant: "destructive" });
                      }
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Routing issues — compact */}
      {(openIssueCount > 0 || issues.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="section-label">Pendências · {openIssueCount} abertas</p>
            <div className="flex gap-2">
              <Select value={issueStatusFilter} onValueChange={setIssueStatusFilter}>
                <SelectTrigger className="h-8 text-xs w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open,in_review">Abertas</SelectItem>
                  <SelectItem value="resolved">Resolvidas</SelectItem>
                  <SelectItem value="rejected">Rejeitadas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={issueTargetCircuitId} onValueChange={setIssueTargetCircuitId}>
                <SelectTrigger className="h-8 text-xs w-[160px]"><SelectValue placeholder="Circuito destino" /></SelectTrigger>
                <SelectContent>
                  {circuits.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {issues.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma pendência.</p>
          ) : (
            <div className="space-y-1.5">
              {issues.map((issue) => (
                <div key={issue.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{issue.identifier_value || "(vazio)"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatIssueType(issue.identifier_type)} · {formatIssueReason(issue.reason)} · {issue.occurrences}×
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={issueSavingKey === `assign:${issue.id}` || issue.assigned_to === user?.id}
                        onClick={async () => {
                          setIssueSavingKey(`assign:${issue.id}`);
                          try {
                            await assignRoutingIssue(issue.id, {});
                            toast({ title: "Assumida" });
                            await load();
                          } catch {
                            toast({ title: "Falha", variant: "destructive" });
                          } finally {
                            setIssueSavingKey(null);
                          }
                        }}
                      >
                        Assumir
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
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
                              resolution_notes: "Resolvido no Partner Portal",
                              create_rule: true,
                              circuit_id: issueTargetCircuitId,
                            });
                            toast({ title: "Resolvida com regra" });
                            await load();
                          } catch {
                            toast({ title: "Falha", variant: "destructive" });
                          } finally {
                            setIssueSavingKey(null);
                          }
                        }}
                      >
                        Resolver
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
