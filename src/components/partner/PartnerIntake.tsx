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
  partnerIntakeJson,
  partnerIntakePreview,
  partnerIntakePreviewJson,
  resolveRoutingIssue,
  type PartnerIntakeResponse,
  type PartnerIntakePreviewResponse,
  type RawPayloadSummary,
  type RoutingIssueItem,
} from "@/lib/api/partner-routing";
import type { Circuit } from "@/lib/api/types";
import { AlertTriangle, Download, ExternalLink, FileUp, Loader2, ScrollText, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api/client";
import { listIngestionTemplates } from "@/lib/api/ingestion-templates";
import type { IngestionTemplate } from "@/lib/api/types";
import {
  clearLog,
  getLogEntries,
  subscribeLog,
  type PartnerRequestLogEntry,
} from "@/lib/api/partner-request-log";

export function PartnerIntake() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [sourceCircuitId, setSourceCircuitId] = useState("");
  const [templateId, setTemplateId] = useState("none");
  const [inlineMappingText, setInlineMappingText] = useState("");
  const [templates, setTemplates] = useState<IngestionTemplate[]>([]);
  const [intakeInputMode, setIntakeInputMode] = useState<"json" | "file">("json");
  const [jsonBodyText, setJsonBodyText] = useState(
    `{
  "items": [
    {
      "value_chain": "BEEF",
      "sisbov": "BR990000777000001",
      "car": "MT-5107248.29C8.4496.42A7",
      "partner_internal_id": "demo-0001"
    }
  ]
}`
  );
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
  const [logEntries, setLogEntries] = useState<PartnerRequestLogEntry[]>(getLogEntries);
  const [logExpanded, setLogExpanded] = useState(false);

  useEffect(() => {
    return subscribeLog(() => setLogEntries(getLogEntries()));
  }, []);

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
    showToastOnError = false,
    selectedMode?: "json" | "file",
    selectedJsonBodyText?: string
  ) => {
    setPreviewRows(0);
    setPreviewResolvable(0);
    setPreviewUnknown(0);
    setPreviewResult(null);
    setPreviewError(null);
    const mode = selectedMode || intakeInputMode;
    if (mode === "file" && !selectedFile) return;
    if (mode === "json" && !(selectedJsonBodyText ?? jsonBodyText).trim()) return;
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
          toast({
            title: "Falha na prévia",
            description,
            variant: "destructive",
          });
        }
        return;
      }
    }
    setPreviewing(true);
    try {
      const preview =
        mode === "file"
          ? await partnerIntakePreview(
              selectedFile as File,
              selectedSourceCircuitId,
              autoCreate,
              selectedTemplateId && selectedTemplateId !== "none" ? selectedTemplateId : undefined,
              inlineMapping
            )
          : await partnerIntakePreviewJson(JSON.parse((selectedJsonBodyText ?? jsonBodyText).trim()), {
              sourceCircuitId: selectedSourceCircuitId,
              autoCreateCircuit: autoCreate,
              templateId: selectedTemplateId && selectedTemplateId !== "none" ? selectedTemplateId : undefined,
              inlineMapping,
            });
      setPreviewRows(preview.total_rows);
      setPreviewResolvable(preview.resolvable_rows);
      setPreviewUnknown(preview.unresolved_rows);
      setPreviewResult(preview);
    } catch (err) {
      const description = formatClientError(err, "Falha ao gerar prévia.");
      setPreviewRows(0);
      setPreviewResolvable(0);
      setPreviewUnknown(0);
      setPreviewResult(null);
      setPreviewError(description);
      if (showToastOnError) {
        toast({
          title: "Falha na prévia",
          description,
          variant: "destructive",
        });
      }
    } finally {
      setPreviewing(false);
    }
  };

  const formatIssueType = (identifierType: string) => {
    if (identifierType === "unknown") {
      return "Sem identificador de roteamento (LAND_DFID/CAR/CCIR/INCRA/NIRF/CIB/MATRÍCULA/GEOREF/IE)";
    }
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
    if (intakeInputMode !== "file" || !file) return;
    void buildPreValidation(file, sourceCircuitId, templateId, inlineMappingText);
  }, [intakeInputMode, file, sourceCircuitId, autoCreate, templateId, inlineMappingText]);

  const runPreviewNow = async () => {
    if (intakeInputMode === "file" && !file) return;
    if (intakeInputMode === "json" && !jsonBodyText.trim()) return;
    await buildPreValidation(
      file,
      sourceCircuitId || undefined,
      templateId,
      inlineMappingText,
      true,
      intakeInputMode,
      jsonBodyText
    );
    toast({
      title: "Prévia executada",
      description: "Validação concluída sem persistir dados.",
    });
  };

  const onSubmit = async () => {
    if (intakeInputMode === "file" && !file) return;
    if (intakeInputMode === "json" && !jsonBodyText.trim()) return;
    const confirmed = window.confirm(
      "Este envio vai persistir payload e processar ingestão real. Deseja continuar?"
    );
    if (!confirmed) return;
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
      const result =
        intakeInputMode === "json"
          ? await partnerIntakeJson(JSON.parse(jsonBodyText.trim()), {
              sourceCircuitId,
              autoCreateCircuit: autoCreate,
              templateId: templateId !== "none" ? templateId : undefined,
              inlineMapping,
            })
          : await partnerIntake(
              file as File,
              sourceCircuitId,
              autoCreate,
              templateId !== "none" ? templateId : undefined,
              inlineMapping
            );
      setLastResult(result);
      toast({
        title: "Ingestão processada",
        description: `Status: ${result.summary.status}. Rotas: ${result.summary.routes}.`,
      });
      setPreviewResult(null);
      if (intakeInputMode === "file") setFile(null);
      await load();
    } catch (err) {
      const description = formatClientError(err, "Não foi possível processar este arquivo.");
      toast({
        title: "Falha na ingestão",
        description,
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
  const inReviewIssueCount = issues.filter((i) => i.status === "in_review").length;

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
    <div className="space-y-6">
      <Card className="p-5 space-y-4">
        <h3 className="text-base font-semibold">Ingestão Inteligente (staging)</h3>
        <p className="text-sm text-muted-foreground">
          Modo recomendado: enviar JSON no body do request. Como alternativa, também aceitamos arquivo CSV/JSON.
        </p>
        <p className="text-xs text-muted-foreground">
          Guia oficial:{" "}
          <a
            href="https://docs.defarm.net/docs/getting-started#preview"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline underline-offset-2"
          >
            quickstart + preview
          </a>
          {" · "}
          <a
            href="https://docs.defarm.net/docs/api#upload"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline underline-offset-2"
          >
            formato de upload
          </a>
        </p>
        <p className="text-xs text-muted-foreground">
          Recomendado em produção: enviar em chunks de 50-150 linhas por request. Em login JWT, o circuito de staging é opcional (usamos o padrão quando omitido).
        </p>
        <p className="text-xs text-muted-foreground">
          Template é opcional. Use apenas quando precisar mapear nomes de colunas diferentes do padrão DeFarm.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select value={sourceCircuitId} onValueChange={setSourceCircuitId}>
            <SelectTrigger><SelectValue placeholder="Circuito de staging" /></SelectTrigger>
            <SelectContent>
              {circuits.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={intakeInputMode} onValueChange={(value: "json" | "file") => setIntakeInputMode(value)}>
            <SelectTrigger><SelectValue placeholder="Modo de entrada" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="json">Request JSON (recomendado)</SelectItem>
              <SelectItem value="file">Arquivo CSV/JSON (alternativo)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {intakeInputMode === "json" ? (
          <label className="block border rounded-md p-3">
            <p className="text-xs font-medium mb-2">Body JSON (recomendado)</p>
            <textarea
              value={jsonBodyText}
              onChange={(e) => setJsonBodyText(e.target.value)}
              className="w-full min-h-[130px] bg-transparent text-xs font-mono outline-none resize-y"
              placeholder={`{"items":[{"value_chain":"BEEF","sisbov":"...","car":"..."}]}`}
            />
          </label>
        ) : (
          <label className="border rounded-md px-3 py-2 text-sm flex items-center gap-2 cursor-pointer">
            <FileUp className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{file?.name || "Selecionar arquivo (CSV/JSON)"}</span>
            <input
              type="file"
              className="hidden"
              accept=".csv,.json,text/csv,application/json"
              onChange={async (e) => {
                const selected = e.target.files?.[0] || null;
                setFile(selected);
                if (selected) {
                  await buildPreValidation(
                    selected,
                    sourceCircuitId || undefined,
                    templateId,
                    inlineMappingText,
                    true,
                    "file",
                    jsonBodyText
                  );
                }
              }}
            />
          </label>
        )}

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={runPreviewNow} disabled={(intakeInputMode === "file" ? !file : !jsonBodyText.trim()) || previewing || sending}>
              {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Executar preview"}
            </Button>
            <Button variant="outline" onClick={onSubmit} disabled={(intakeInputMode === "file" ? !file : !jsonBodyText.trim()) || sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar de verdade"}
            </Button>
          </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger>
              <SelectValue placeholder="Template (opcional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem template (padrão DeFarm)</SelectItem>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}{template.is_default ? " (padrão)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="md:col-span-2 text-xs text-muted-foreground self-center">
            {templateId === "none"
              ? "Mapeamento automático padrão ativo."
              : `Template selecionado: ${templates.find((t) => t.id === templateId)?.name || templateId}`}
          </div>
        </div>

        <label className="block border rounded-md p-3">
          <p className="text-xs font-medium mb-2">Mapping inline (JSON, opcional)</p>
          <textarea
            value={inlineMappingText}
            onChange={(e) => setInlineMappingText(e.target.value)}
            className="w-full min-h-[88px] bg-transparent text-xs font-mono outline-none resize-y"
            placeholder={`{"columns":{"id_interno":"partner_internal_id","numero_sisbov":"sisbov"}}`}
          />
          <p className="text-[11px] text-muted-foreground mt-2">
            Use para mapear campos sem criar template. Se enviar template + mapping, o mapping inline tem prioridade.
          </p>
        </label>

        <div className="flex items-center gap-3">
          <Switch checked={autoCreate} onCheckedChange={setAutoCreate} id="auto-create" />
          <Label htmlFor="auto-create">Criar circuito automaticamente quando identificador não existir</Label>
        </div>

        {(intakeInputMode === "file" ? !!file : !!jsonBodyText.trim()) ? (
          <div className="rounded-lg border p-3 bg-muted/30">
            <p className="text-xs font-medium text-foreground mb-2">Prévia real de roteamento (sem tokenizar)</p>
            {previewing ? (
              <p className="text-xs text-muted-foreground">Analisando arquivo...</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                <p className="text-muted-foreground">Linhas lidas: <span className="text-foreground font-medium">{previewRows}</span></p>
                <p className="text-muted-foreground">Com identificador: <span className="text-primary font-medium">{previewResolvable}</span></p>
                <p className="text-muted-foreground">Sem identificador: <span className="text-destructive font-medium">{previewUnknown}</span></p>
                <p className="text-muted-foreground">Auto-criação prevista: <span className="text-foreground font-medium">{previewResult?.would_auto_create_rows ?? 0}</span></p>
              </div>
            )}
            {previewError ? (
              <p className="text-xs text-destructive mt-2">{previewError}</p>
            ) : null}
            {!previewing && previewResult?.routing_plan?.length ? (
              <div className="mt-3 space-y-1">
                {previewResult.routing_plan.slice(0, 6).map((plan) => (
                  <p key={`${plan.identifier_type}-${plan.identifier_value}-${plan.circuit_id || "none"}`} className="text-[11px] text-muted-foreground">
                    {plan.identifier_type.toUpperCase()} {plan.identifier_value} · {plan.rows} linha(s) · {plan.status === "routed_existing" ? `roteia para ${circuitNameMap.get(plan.circuit_id || "") || plan.circuit_id}` : plan.status === "would_auto_create" ? "criaria circuito automaticamente" : "ficará pendente"}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {lastResult ? (
          <div className="rounded-lg border p-3 bg-muted/20 space-y-3">
            <p className="text-xs font-medium text-foreground">
              Último processamento: {lastResult.summary.status} · {lastResult.summary.total_rows} linha(s)
            </p>
            {lastResult.summary ? (
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">
                  rotas: {lastResult.summary.routes} · itens com link: {lastResult.summary.items} · pendências: {lastResult.summary.unresolved_rows}
                </p>
                {lastResult.summary.partner_reference ? (
                  <p className="text-[11px] text-muted-foreground">
                    referência parceira: {lastResult.summary.partner_reference.field}={lastResult.summary.partner_reference.value}
                  </p>
                ) : null}
                {lastResult.summary.warnings?.length ? (
                  <div className="mt-2 rounded border border-yellow-500/30 bg-yellow-500/5 p-2 space-y-1">
                    {lastResult.summary.warnings.map((w, i) => (
                      <p key={i} className="text-[11px] text-yellow-700 dark:text-yellow-400 flex items-start gap-1.5">
                        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                        {w}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {lastResult.verbose?.circuit_links?.length ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Links diretos para os circuitos com os itens roteados:
                </p>
                {lastResult.verbose.circuit_links.map((link) => (
                  <div key={link.circuit_id} className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <a href={link.app_url} target="_blank" rel="noopener noreferrer">
                        Abrir no app <ExternalLink className="h-3.5 w-3.5 ml-1" />
                      </a>
                    </Button>
                    {link.is_public !== false ? (
                      <Button size="sm" variant="ghost" asChild>
                        <a href={link.public_url} target="_blank" rel="noopener noreferrer">
                          Página pública <ExternalLink className="h-3.5 w-3.5 ml-1" />
                        </a>
                      </Button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">
                        Circuito privado (publique para compartilhar link público)
                      </span>
                    )}
                    <p className="text-[11px] text-muted-foreground">{link.circuit_id}</p>
                  </div>
                ))}
              </div>
            ) : null}
            {lastResult.errors?.length ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Erros retornados por linha:</p>
                {lastResult.errors.slice(0, 20).map((error, idx) => (
                  <div key={`${error.reason_code}-${error.row_index ?? "none"}-${idx}`} className="rounded border p-2 bg-destructive/5">
                    <p className="text-[11px] text-destructive">
                      {error.reason_code} · {error.message}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      linha: {error.row_index ?? "-"} · referência: {error.partner_reference || "-"}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
            {lastResult.items?.length ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Itens resolvidos no upload (DFID + URL + referência):
                </p>
                {lastResult.items.slice(0, 20).map((item) => (
                  <div key={item.dfid} className="rounded border p-2 bg-background/60">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                          Abrir URL <ExternalLink className="h-3.5 w-3.5 ml-1" />
                        </a>
                      </Button>
                      <p className="text-[11px] text-muted-foreground">{item.dfid}</p>
                    </div>
                    {item.partner_reference ? (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        partner_reference: {item.partner_reference}
                      </p>
                    ) : null}
                    {item.asset_reference ? (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        referência do ativo: {item.asset_reference.identifier_type}={item.asset_reference.value}
                      </p>
                    ) : null}
                    {item.routes?.length ? (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        rotas: {item.routes.map((r) => `${r.route_type}:${r.route_value}`).join(" · ")}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="text-base font-semibold">Histórico de Payload Bruto</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Arquivos enviados</p>
            <p className="text-lg font-semibold">{history.length}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Processados com sucesso</p>
            <p className="text-lg font-semibold text-primary">{completedCount}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Com falha</p>
            <p className="text-lg font-semibold text-destructive">{failedCount}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Filtrar por status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="partial">Parcial</SelectItem>
              <SelectItem value="failed">Falha</SelectItem>
              <SelectItem value="processing">Processando</SelectItem>
            </SelectContent>
          </Select>
          <label className="md:col-span-2 border rounded-md px-3 py-2">
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full bg-transparent text-sm outline-none"
              placeholder="Buscar por nome do arquivo, hash ou erro"
            />
          </label>
        </div>

        {filteredHistory.length === 0 ? (
          <EmptyState icon={FileUp} title="Nenhum payload registrado" description="Envie um arquivo CSV ou JSON acima para começar." />
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
                    {row.error_message} · Próxima ação: ajustar template/roteamento e reenviar.
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
                          title: "Falha ao baixar payload",
                          description: "Não foi possível baixar este arquivo bruto.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Baixar original
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="text-base font-semibold">Pendências de Roteamento</h3>
        <p className="text-sm text-muted-foreground">
          Pendências detectadas na ingestão. Assuma e resolva com regra para evitar recorrência.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Total listado</p>
            <p className="text-lg font-semibold">{issues.length}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Abertas</p>
            <p className="text-lg font-semibold">{openIssueCount}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Em revisão</p>
            <p className="text-lg font-semibold">{inReviewIssueCount}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select value={issueTargetCircuitId} onValueChange={setIssueTargetCircuitId}>
            <SelectTrigger><SelectValue placeholder="Circuito destino para resolução rápida" /></SelectTrigger>
            <SelectContent>
              {circuits.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground self-center">
            Ação rápida: cria regra já vinculando a pendência ao circuito escolhido.
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
              <SelectValue placeholder="Status da pendência" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open,in_review">Abertas + em revisão</SelectItem>
              <SelectItem value="open">Só abertas</SelectItem>
              <SelectItem value="in_review">Só em revisão</SelectItem>
              <SelectItem value="resolved">Resolvidas</SelectItem>
              <SelectItem value="rejected">Rejeitadas</SelectItem>
            </SelectContent>
          </Select>
          <label className="md:col-span-2 flex items-center gap-3 text-sm border rounded-md px-3 py-2">
            <Switch
              checked={issueAssignedToMe}
              onCheckedChange={(checked) => setIssueAssignedToMe(Boolean(checked))}
              id="issue-assigned-to-me"
            />
            <Label htmlFor="issue-assigned-to-me">Mostrar apenas atribuídas para mim</Label>
          </label>
        </div>
        <div>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Atualizar pendências
          </Button>
        </div>
        {issues.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma pendência no momento.</p>
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
                      tipo: {formatIssueType(issue.identifier_type)} · motivo: {formatIssueReason(issue.reason)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      último evento: {new Date(issue.last_seen_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-1 rounded-full border bg-muted text-muted-foreground border-border w-fit">
                      {issue.occurrences} ocorrência(s)
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full border bg-muted text-muted-foreground border-border w-fit">
                      {issue.status}
                    </span>
                    {issue.assigned_to ? (
                      <span className="text-xs px-2 py-1 rounded-full border bg-muted text-muted-foreground border-border w-fit">
                        atribuída
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
                        toast({ title: "Pendência assumida", description: "Agora ela está em revisão para seu usuário." });
                        await load();
                      } catch {
                        toast({
                          title: "Falha ao assumir pendência",
                          description: "Não foi possível atribuir a pendência.",
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
                    Assumir
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
                          resolution_notes: "Resolvido no Partner Portal",
                          create_rule: true,
                          circuit_id: issueTargetCircuitId,
                        });
                        toast({ title: "Pendência resolvida", description: "Regra criada e pendência encerrada." });
                        await load();
                      } catch {
                        toast({
                          title: "Falha ao resolver pendência",
                          description: "Não foi possível criar regra e resolver automaticamente.",
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
                    Resolver com regra
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
                          resolution_notes: "Resolvido manualmente no Partner Portal",
                          create_rule: false,
                        });
                        toast({ title: "Pendência encerrada", description: "Marcada como resolvida manualmente." });
                        await load();
                      } catch {
                        toast({
                          title: "Falha ao encerrar pendência",
                          description: "Não foi possível marcar como resolvida.",
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
                    Resolver manual
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
            <h3 className="text-base font-semibold">Log de Requisições da API</h3>
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
                Limpar
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLogExpanded(!logExpanded)}
            >
              {logExpanded ? "Recolher" : "Expandir"}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Todas as chamadas feitas para endpoints de parceiro nesta sessão. Útil para depuração e verificação.
        </p>
        {logEntries.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma requisição registrada nesta sessão.</p>
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
                    REDE
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
