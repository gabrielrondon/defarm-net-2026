import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getCircuits } from "@/lib/api/circuits";
import {
  partnerIntake,
  partnerIntakePreview,
  type PartnerIntakePreviewResponse,
  type PartnerIntakeResponse,
} from "@/lib/api/partner-routing";
import type { Circuit } from "@/lib/api/types";
import { ApiError } from "@/lib/api/client";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileUp,
  Key,
  Loader2,
  PartyPopper,
  RotateCcw,
  SkipForward,
  Upload,
  XCircle,
} from "lucide-react";

type WizardStep = "upload" | "preview" | "test" | "production" | "done" | "error";

export function IngestionWizard() {
  const { toast } = useToast();
  const [step, setStep] = useState<WizardStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [sourceCircuitId, setSourceCircuitId] = useState("");
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState<PartnerIntakePreviewResponse | null>(null);
  const [result, setResult] = useState<PartnerIntakeResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Detect test circuit (value_chain = DEFARM or metadata.partner_staging)
  const testCircuit = useMemo(
    () =>
      circuits.find(
        (c) =>
          c?.metadata?.partner_staging === true ||
          c?.metadata?.partner_staging === "true" ||
          c?.metadata?.value_chain === "DEFARM"
      ),
    [circuits]
  );

  const prodCircuit = useMemo(
    () =>
      circuits.find(
        (c) =>
          c?.metadata?.partner_staging !== true &&
          c?.metadata?.partner_staging !== "true" &&
          c?.metadata?.value_chain !== "DEFARM"
      ),
    [circuits]
  );

  useEffect(() => {
    async function init() {
      try {
        const data = await getCircuits();
        setCircuits(data);
        if (data[0]) setSourceCircuitId(data[0].id);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setPreviewing(true);
    setStep("preview");
    setPreview(null);
    setErrorMsg("");

    try {
      const result = await partnerIntakePreview(
        selectedFile,
        sourceCircuitId || undefined,
        true
      );
      setPreview(result);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `${err.message} (${err.status})`
          : err instanceof Error
          ? err.message
          : "Falha ao gerar prévia.";
      setErrorMsg(msg);
    } finally {
      setPreviewing(false);
    }
  };

  const handleProcess = async (isTest: boolean) => {
    if (!file) return;
    setProcessing(true);
    setErrorMsg("");

    const circuitId = isTest ? testCircuit?.id : prodCircuit?.id || sourceCircuitId;

    try {
      const res = await partnerIntake(file, circuitId, true);
      setResult(res);
      if (isTest) {
        setStep("test");
      } else {
        setStep("done");
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `${err.message} (${err.status})`
          : err instanceof Error
          ? err.message
          : "Falha na ingestão.";
      setErrorMsg(msg);
      setStep("error");
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setStep("upload");
    setFile(null);
    setPreview(null);
    setResult(null);
    setErrorMsg("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {(["upload", "preview", "test", "done"] as const).map((s, i) => {
          const labels = { upload: "Upload", preview: "Preview", test: "Teste", done: "Produção" };
          const stepOrder = { upload: 0, preview: 1, test: 2, done: 3 };
          const currentOrder = { upload: 0, preview: 1, test: 2, production: 3, done: 3, error: -1 }[step];
          const isActive = stepOrder[s] === currentOrder;
          const isPast = stepOrder[s] < currentOrder;

          return (
            <div key={s} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/30" />}
              <span
                className={`transition-colors duration-300 ${
                  isActive
                    ? "text-foreground font-medium"
                    : isPast
                    ? "text-primary"
                    : ""
                }`}
              >
                {isPast && <Check className="h-3 w-3 inline mr-0.5" />}
                {labels[s]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step content — animated transitions */}
      <div className="relative">
        {/* STEP: Upload */}
        {step === "upload" && (
          <div className="animate-fade-in space-y-4">
            <div className="rounded-2xl border-2 border-dashed border-border hover:border-primary/40 transition-colors p-8 text-center">
              <label className="cursor-pointer block">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-foreground">
                  Arraste um arquivo ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  CSV ou JSON · O sistema analisa antes de gravar
                </p>
                <input
                  type="file"
                  className="hidden"
                  accept=".csv,.json,text/csv,application/json"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                />
              </label>
            </div>

            {circuits.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Circuito:</span>
                <Select value={sourceCircuitId} onValueChange={setSourceCircuitId}>
                  <SelectTrigger className="h-8 text-xs w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {circuits.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* STEP: Preview */}
        {step === "preview" && (
          <div className="animate-fade-in space-y-4">
            {/* File badge */}
            <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-3">
              <FileUp className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {file ? `${(file.size / 1024).toFixed(0)}KB` : ""}
                </p>
              </div>
              <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Trocar
              </button>
            </div>

            {previewing ? (
              <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
                <Loader2 className="h-6 w-6 animate-spin text-primary mb-3" />
                <p className="text-sm text-muted-foreground">Analisando estrutura do arquivo...</p>
              </div>
            ) : preview ? (
              <div className="animate-fade-in space-y-4">
                {/* Preview results */}
                <div className="rounded-xl border border-border p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <p className="text-sm font-medium text-foreground">Arquivo analisado com sucesso</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-muted/40 px-3 py-2">
                      <p className="text-[11px] uppercase text-muted-foreground">Linhas</p>
                      <p className="text-xl font-semibold text-foreground">{preview.total_rows}</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 px-3 py-2">
                      <p className="text-[11px] uppercase text-muted-foreground">Roteáveis</p>
                      <p className="text-xl font-semibold text-primary">{preview.resolvable_rows}</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 px-3 py-2">
                      <p className="text-[11px] uppercase text-muted-foreground">Pendentes</p>
                      <p className="text-xl font-semibold text-destructive">{preview.unresolved_rows}</p>
                    </div>
                  </div>

                  {/* Routing plan */}
                  {preview.routing_plan?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Plano de roteamento</p>
                      <div className="divide-y divide-border rounded-lg border">
                        {preview.routing_plan.slice(0, 6).map((plan, i) => (
                          <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                            <span className="font-mono text-foreground">
                              {plan.identifier_type.toUpperCase()} {plan.identifier_value}
                            </span>
                            <span className="text-muted-foreground">
                              {plan.rows} linha(s) ·{" "}
                              {plan.status === "routed_existing"
                                ? "circuito existente"
                                : plan.status === "would_auto_create"
                                ? "novo circuito"
                                : "pendente"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Explanation */}
                <div className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Como funciona?</span> Cada linha do arquivo contém um identificador (CAR, SISBOV, etc.) que determina a qual circuito o item pertence. Você pode primeiro enviar para uma cadeia de teste antes de publicar na cadeia de valor real.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {testCircuit && (
                    <Button
                      onClick={() => handleProcess(true)}
                      disabled={processing}
                      className="flex-1"
                    >
                      {processing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Enviar para teste
                          <ArrowRight className="h-4 w-4 ml-1.5" />
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    variant={testCircuit ? "outline" : "default"}
                    onClick={() => handleProcess(false)}
                    disabled={processing}
                    className={testCircuit ? "" : "flex-1"}
                  >
                    {processing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : testCircuit ? (
                      "Publicar direto"
                    ) : (
                      <>
                        Processar
                        <ArrowRight className="h-4 w-4 ml-1.5" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : errorMsg ? (
              <div className="animate-fade-in rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-center space-y-3">
                <XCircle className="h-6 w-6 text-destructive mx-auto" />
                <p className="text-sm text-foreground font-medium">Erro na análise</p>
                <p className="text-xs text-muted-foreground">{errorMsg}</p>
                <Button variant="outline" size="sm" onClick={reset}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Tentar novamente
                </Button>
              </div>
            ) : null}
          </div>
        )}

        {/* STEP: Test result */}
        {step === "test" && result && (
          <div className="animate-fade-in space-y-4">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Teste concluído com sucesso</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {result.summary?.total_rows || result.total_rows} linha(s) processada(s) ·{" "}
                  {result.summary?.items_linked || result.items?.length || 0} item(ns) vinculado(s)
                </p>
              </div>

              {result.circuit_links?.length ? (
                <div className="flex justify-center gap-2 pt-1">
                  {result.circuit_links.map((link) => (
                    <Button key={link.circuit_id} variant="outline" size="sm" asChild>
                      <a href={link.app_url} target="_blank" rel="noopener noreferrer">
                        Ver circuito <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="rounded-xl bg-muted/40 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Próximo passo:</span> Os dados estão em um circuito de teste. Quando estiver satisfeito, envie o mesmo arquivo para a cadeia de valor real.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={() => handleProcess(false)} disabled={processing} className="flex-1">
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Publicar na cadeia real
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </>
                )}
              </Button>
              <Button variant="ghost" size="sm" onClick={reset}>
                Recomeçar
              </Button>
            </div>
          </div>
        )}

        {/* STEP: Done — celebration */}
        {step === "done" && result && (
          <div className="animate-scale-in space-y-4">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto animate-scale-in">
                <PartyPopper className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-foreground">Ingestão concluída!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {result.summary?.total_rows || result.total_rows} linha(s) ·{" "}
                  {result.summary?.items_linked || result.items?.length || 0} item(ns) ·{" "}
                  {result.summary?.routed_batches || result.routed_batches?.length || 0} lote(s)
                </p>
              </div>

              {result.summary?.warnings?.length ? (
                <div className="rounded-lg border border-amber-300/30 bg-amber-50 dark:bg-amber-900/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400 text-left space-y-0.5">
                  {result.summary.warnings.map((w, i) => (
                    <p key={i}>⚠ {w}</p>
                  ))}
                </div>
              ) : null}

              {result.circuit_links?.length ? (
                <div className="flex justify-center gap-2 pt-1">
                  {result.circuit_links.map((link) => (
                    <Button key={link.circuit_id} variant="outline" size="sm" asChild>
                      <a href={link.app_url} target="_blank" rel="noopener noreferrer">
                        Ver circuito <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>

            <Button variant="outline" onClick={reset} className="w-full">
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Enviar outro arquivo
            </Button>
          </div>
        )}

        {/* STEP: Error */}
        {step === "error" && (
          <div className="animate-fade-in space-y-4">
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center space-y-3">
              <XCircle className="h-8 w-8 text-destructive mx-auto" />
              <div>
                <h3 className="text-foreground">Falha na ingestão</h3>
                <p className="text-sm text-muted-foreground mt-1">{errorMsg}</p>
              </div>
            </div>
            <Button variant="outline" onClick={reset} className="w-full">
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Tentar novamente
            </Button>
          </div>
        )}
      </div>

      {/* Skip link — always visible except on done/error */}
      {step !== "done" && step !== "error" && step !== "upload" && (
        <div className="text-center pt-2 animate-fade-in">
          <button
            onClick={reset}
            className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors inline-flex items-center gap-1"
          >
            <SkipForward className="h-3 w-3" />
            Pular estas etapas
          </button>
        </div>
      )}

      {/* API Banner */}
      <div className="rounded-xl bg-muted/40 px-5 py-4 flex items-center gap-4 animate-fade-in">
        <Key className="h-5 w-5 text-muted-foreground/50 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground">
            Esta ação também pode ser feita via API.
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Use o endpoint <code className="text-xs font-mono bg-muted px-1 rounded">POST /partner/ingestions</code> com sua API key.
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild className="shrink-0">
          <Link to="/app/api-keys">
            API Keys
            <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
