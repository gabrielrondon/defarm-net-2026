import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getCircuits } from "@/lib/api/circuits";
import {
  partnerIntake,
  partnerIntakePreview,
  getPartnerDefaultCircuit,
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
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState<PartnerIntakePreviewResponse | null>(null);
  const [result, setResult] = useState<PartnerIntakeResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [defaultCircuitId, setDefaultCircuitId] = useState("");

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
        defaultCircuitId || undefined,
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

    const circuitId = isTest ? testCircuit?.id : prodCircuit?.id || defaultCircuitId;

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

  const stepLabels = { upload: "Upload", preview: "Preview", test: "Teste", done: "Produção" } as const;
  const stepOrder = { upload: 0, preview: 1, test: 2, done: 3 };
  const currentOrder = { upload: 0, preview: 1, test: 2, production: 3, done: 3, error: -1 }[step];

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {(["upload", "preview", "test", "done"] as const).map((s, i) => {
          const isActive = stepOrder[s] === currentOrder;
          const isPast = stepOrder[s] < currentOrder;
          return (
            <div key={s} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/30" />}
              <span
                className={`transition-colors duration-300 ${
                  isActive ? "text-foreground font-medium" : isPast ? "text-primary" : ""
                }`}
              >
                {isPast && <Check className="h-3 w-3 inline mr-0.5" />}
                {stepLabels[s]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="relative">
        {/* UPLOAD */}
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
          </div>
        )}

        {/* PREVIEW */}
        {step === "preview" && (
          <div className="animate-fade-in space-y-4">
            {/* File badge */}
            <FileBadge file={file} onReset={reset} />

            {previewing ? (
              <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
                <Loader2 className="h-6 w-6 animate-spin text-primary mb-3" />
                <p className="text-sm text-muted-foreground">Analisando estrutura do arquivo...</p>
              </div>
            ) : preview ? (
              <div className="animate-fade-in space-y-4">
                <PreviewResults preview={preview} />

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
              <ErrorCard message={errorMsg} onRetry={reset} />
            ) : null}
          </div>
        )}

        {/* TEST RESULT */}
        {step === "test" && result && (
          <div className="animate-fade-in space-y-4">
            <TestResults result={result} />

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

        {/* DONE */}
        {step === "done" && result && (
          <div className="animate-scale-in space-y-4">
            <DoneResults result={result} />
            <Button variant="outline" onClick={reset} className="w-full">
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Enviar outro arquivo
            </Button>
          </div>
        )}

        {/* ERROR */}
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

      {/* Skip link */}
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

/* ─── Sub-components ─── */

function FileBadge({ file, onReset }: { file: File | null; onReset: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-3">
      <FileUp className="h-4 w-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file?.name}</p>
        <p className="text-xs text-muted-foreground">
          {file ? `${(file.size / 1024).toFixed(0)} KB` : ""}
        </p>
      </div>
      <button
        onClick={onReset}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Trocar
      </button>
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="animate-fade-in rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-center space-y-3">
      <XCircle className="h-6 w-6 text-destructive mx-auto" />
      <p className="text-sm text-foreground font-medium">Erro na análise</p>
      <p className="text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
        Tentar novamente
      </Button>
    </div>
  );
}

function PreviewResults({ preview }: { preview: PartnerIntakePreviewResponse }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border p-5 space-y-5">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <p className="text-sm font-medium text-foreground">Arquivo analisado com sucesso</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Linhas" value={preview.total_rows} />
          <StatCard label="Roteáveis" value={preview.resolvable_rows} variant="primary" />
          <StatCard label="Pendentes" value={preview.unresolved_rows} variant={preview.unresolved_rows > 0 ? "destructive" : undefined} />
        </div>

        {/* Routing plan — show what will happen */}
        {preview.routing_plan?.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              O que vai acontecer
            </p>
            <div className="space-y-2">
              {preview.routing_plan.slice(0, 4).map((plan, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg bg-muted/30 px-3 py-2.5 text-xs animate-fade-in"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <span className="mt-0.5">
                    {plan.status === "routed_existing" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    ) : plan.status === "would_auto_create" ? (
                      <ArrowRight className="h-3.5 w-3.5 text-amber-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">
                      {plan.identifier_type.toUpperCase()}: <span className="font-mono">{plan.identifier_value}</span>
                    </p>
                    <p className="text-muted-foreground mt-0.5">
                      {plan.rows} linha(s) →{" "}
                      {plan.status === "routed_existing"
                        ? "será vinculado a um circuito existente"
                        : plan.status === "would_auto_create"
                        ? "criará um novo circuito automaticamente"
                        : "não encontrou regra de roteamento"}
                    </p>
                  </div>
                </div>
              ))}
              {preview.routing_plan.length > 4 && (
                <p className="text-xs text-muted-foreground text-center">
                  + {preview.routing_plan.length - 4} outro(s) destino(s)
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Explanation */}
      <div className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground">Como funciona?</span>{" "}
          Cada linha contém um identificador (CAR, SISBOV, etc.) que determina a qual circuito o item pertence. Nenhum dado foi gravado ainda — esta é apenas a prévia.
        </p>
      </div>
    </div>
  );
}

function TestResults({ result }: { result: PartnerIntakeResponse }) {
  const totalRows = result.summary?.total_rows || result.total_rows;
  const itemsLinked = result.summary?.items_linked || result.items?.length || 0;
  const routes = result.routes || [];
  const items = result.items || [];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 space-y-5">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground">Teste concluído com sucesso</p>
        </div>

        {/* What was created */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Linhas processadas" value={totalRows} />
          <StatCard label="Itens criados" value={itemsLinked} variant="primary" />
        </div>

        {/* Routes created */}
        {routes.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Rotas processadas
            </p>
            {routes.slice(0, 3).map((route, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2 text-xs animate-fade-in"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="font-mono text-foreground">
                  {route.route_type.toUpperCase()}: {route.route_value}
                </span>
                <span className="text-muted-foreground">
                  {route.rows} linhas · {route.items} itens · <span className="text-primary">{route.status}</span>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Sample items with DFIDs */}
        {items.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Exemplo de itens criados
            </p>
            {items.slice(0, 3).map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg bg-background/60 px-3 py-2 text-xs animate-fade-in"
                style={{ animationDelay: `${i * 60 + 200}ms` }}
              >
                <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                <span className="font-mono text-foreground truncate">{item.dfid}</span>
                {item.partner_reference && (
                  <span className="text-muted-foreground ml-auto shrink-0">
                    ref: {item.partner_reference}
                  </span>
                )}
              </div>
            ))}
            {items.length > 3 && (
              <p className="text-xs text-muted-foreground text-center">
                + {items.length - 3} outro(s) item(ns)
              </p>
            )}
          </div>
        )}

        {/* Circuit links */}
        {result.circuit_links?.length ? (
          <div className="flex justify-center gap-2">
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

      <div className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground">Próximo passo:</span>{" "}
          Os dados estão em um circuito de teste. Revise os itens criados acima. Quando estiver satisfeito, publique na cadeia de valor real.
        </p>
      </div>
    </div>
  );
}

function DoneResults({ result }: { result: PartnerIntakeResponse }) {
  const totalRows = result.summary?.total_rows || result.total_rows;
  const itemsLinked = result.summary?.items_linked || result.items?.length || 0;
  const batchCount = result.summary?.routed_batches || result.routed_batches?.length || 0;
  const items = result.items || [];

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-8 space-y-5">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto animate-scale-in">
          <PartyPopper className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-foreground">Ingestão concluída!</h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Linhas" value={totalRows} />
        <StatCard label="Itens" value={itemsLinked} variant="primary" />
        <StatCard label="Lotes" value={batchCount} />
      </div>

      {/* Sample DFIDs */}
      {items.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">
            Itens publicados
          </p>
          {items.slice(0, 3).map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg bg-background/60 px-3 py-2 text-xs animate-fade-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-foreground hover:text-primary transition-colors truncate"
              >
                {item.dfid}
              </a>
              {item.partner_reference && (
                <span className="text-muted-foreground ml-auto shrink-0">
                  ref: {item.partner_reference}
                </span>
              )}
            </div>
          ))}
          {items.length > 3 && (
            <p className="text-xs text-muted-foreground text-center">
              + {items.length - 3} outro(s)
            </p>
          )}
        </div>
      )}

      {result.summary?.warnings?.length ? (
        <div className="rounded-lg border border-amber-300/30 bg-amber-50 dark:bg-amber-900/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400 text-left space-y-0.5">
          {result.summary.warnings.map((w, i) => (
            <p key={i}>⚠ {w}</p>
          ))}
        </div>
      ) : null}

      {result.circuit_links?.length ? (
        <div className="flex justify-center gap-2">
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
  );
}

function StatCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant?: "primary" | "destructive";
}) {
  const valueColor =
    variant === "primary"
      ? "text-primary"
      : variant === "destructive"
      ? "text-destructive"
      : "text-foreground";

  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <p className="text-[11px] uppercase text-muted-foreground">{label}</p>
      <p className={`text-xl font-semibold ${valueColor}`}>{value}</p>
    </div>
  );
}
