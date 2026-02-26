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
import { Download, ExternalLink, FileUp, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/contexts/AuthContext";

export function PartnerIntake() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [sourceCircuitId, setSourceCircuitId] = useState("");
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
  const [lastResult, setLastResult] = useState<PartnerIntakeResponse | null>(null);

  const buildPreValidation = async (selectedFile: File | null, selectedSourceCircuitId: string) => {
    setPreviewRows(0);
    setPreviewResolvable(0);
    setPreviewUnknown(0);
    setPreviewResult(null);
    if (!selectedFile) return;
    setPreviewing(true);
    try {
      const preview = await partnerIntakePreview(selectedFile, selectedSourceCircuitId, autoCreate);
      setPreviewRows(preview.total_rows);
      setPreviewResolvable(preview.resolvable_rows);
      setPreviewUnknown(preview.unresolved_rows);
      setPreviewResult(preview);
    } catch {
      setPreviewRows(0);
      setPreviewResolvable(0);
      setPreviewUnknown(0);
      setPreviewResult(null);
    } finally {
      setPreviewing(false);
    }
  };

  const formatIssueType = (identifierType: string) => {
    if (identifierType === "unknown") {
      return "Sem identificador de roteamento (LAND_DFID/CAR/CCIR/INCRA/NIRF/CIB/MATRÍCULA/GEOREF)";
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
        description: "Não foi possível carregar histórico do intake.",
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
    if (!file || !sourceCircuitId) return;
    void buildPreValidation(file, sourceCircuitId);
  }, [file, sourceCircuitId, autoCreate]);

  const onSubmit = async () => {
    if (!file || !sourceCircuitId) return;
    setSending(true);
    try {
      const result = await partnerIntake(file, sourceCircuitId, autoCreate);
      setLastResult(result);
      toast({
        title: "Intake processado",
        description: `Status: ${result.status}. Lotes roteados: ${result.routed_batches.length}.`,
      });
      setPreviewResult(null);
      setFile(null);
      await load();
    } catch {
      toast({
        title: "Falha no intake",
        description: "Não foi possível processar este arquivo.",
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
          Envie CSV/JSON uma única vez. A DeFarm persiste payload bruto, resolve cliente por identificador e roteia para os circuitos corretos.
        </p>
        <p className="text-xs text-muted-foreground">
          Recomendado em produção: enviar em chunks de 50-150 linhas por request.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select value={sourceCircuitId} onValueChange={setSourceCircuitId}>
            <SelectTrigger><SelectValue placeholder="Circuito de staging" /></SelectTrigger>
            <SelectContent>
              {circuits.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <label className="border rounded-md px-3 py-2 text-sm flex items-center gap-2 cursor-pointer">
            <FileUp className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{file?.name || "Selecionar arquivo"}</span>
            <input
              type="file"
              className="hidden"
              accept=".csv,.json,text/csv,application/json"
              onChange={async (e) => {
                const selected = e.target.files?.[0] || null;
                setFile(selected);
                if (selected && sourceCircuitId) {
                  await buildPreValidation(selected, sourceCircuitId);
                }
              }}
            />
          </label>

          <Button onClick={onSubmit} disabled={!file || !sourceCircuitId || sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Processar intake"}
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={autoCreate} onCheckedChange={setAutoCreate} id="auto-create" />
          <Label htmlFor="auto-create">Criar circuito automaticamente quando identificador não existir</Label>
        </div>

        {file ? (
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
              Último processamento: {lastResult.summary?.status || lastResult.status} · {lastResult.summary?.total_rows ?? lastResult.total_rows} linha(s)
            </p>
            {lastResult.summary ? (
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">
                  lotes: {lastResult.summary.routed_batches} · itens com link: {lastResult.summary.items_linked} · pendências: {lastResult.summary.unresolved_rows}
                </p>
                {lastResult.summary.partner_reference ? (
                  <p className="text-[11px] text-muted-foreground">
                    referência parceira: {lastResult.summary.partner_reference.field}={lastResult.summary.partner_reference.value}
                  </p>
                ) : null}
              </div>
            ) : null}
            {lastResult.circuit_links?.length ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Links diretos para os circuitos com os itens roteados:
                </p>
                {lastResult.circuit_links.map((link) => (
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
            {lastResult.routed_batches?.some((batch) => (batch.item_links?.length || 0) > 0) ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Itens resolvidos no upload (DFID + identificadores + referência enviada):
                </p>
                {lastResult.routed_batches.flatMap((batch) => batch.item_links || []).slice(0, 20).map((item) => (
                  <div key={item.item_id} className="rounded border p-2 bg-background/60">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <a href={item.app_url} target="_blank" rel="noopener noreferrer">
                          Abrir item <ExternalLink className="h-3.5 w-3.5 ml-1" />
                        </a>
                      </Button>
                      {item.is_public !== false ? (
                        <Button size="sm" variant="ghost" asChild>
                          <a href={item.public_url} target="_blank" rel="noopener noreferrer">
                            Página pública <ExternalLink className="h-3.5 w-3.5 ml-1" />
                          </a>
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          Item em circuito privado (link público indisponível)
                        </span>
                      )}
                      <p className="text-[11px] text-muted-foreground">{item.dfid}</p>
                    </div>
                    {item.input_references?.length ? (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        referência enviada: {item.input_references.map((r) => `${r.field}=${r.value}`).join(" · ")}
                      </p>
                    ) : null}
                    {item.identifiers?.length ? (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        identificadores: {item.identifiers.map((id) => `${id.identifier_type}:${id.value}`).join(" · ")}
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
          Pendências detectadas no intake. Assuma e resolva com regra para evitar recorrência.
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
    </div>
  );
}
