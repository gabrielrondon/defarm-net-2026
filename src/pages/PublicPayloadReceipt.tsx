import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clipboard, ExternalLink, FileText, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  getPublicRawPayloadReceipt,
  type PublicRawPayloadReceiptResponse,
} from "@/lib/api/partner-routing";

function formatDateInTimeZone(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function timestampBlock(value?: string | null): string {
  if (!value) return "n/a";
  return `${formatDateInTimeZone(value, "America/Sao_Paulo")} BRT (UTC-03:00)\n${formatDateInTimeZone(value, "UTC")} UTC`;
}

function receiptTimestampLines(label: string, value?: string | null): string[] {
  if (!value) {
    return [`${label}: n/a`];
  }
  return [
    `${label} (Brasilia): ${formatDateInTimeZone(value, "America/Sao_Paulo")} BRT (UTC-03:00)`,
    `${label} (UTC): ${formatDateInTimeZone(value, "UTC")} UTC`,
  ];
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    received: "Recebido",
    processing: "Processando",
    completed: "Concluido",
    partial: "Parcial",
    failed: "Falhou",
  };
  return labels[status] || status;
}

function buildReceiptText(receipt: PublicRawPayloadReceiptResponse): string {
  const lines = [
    "Recibo verificavel de envio DeFarm",
    "",
    `Verificado: ${receipt.verified ? "sim" : "nao"}`,
    `Metodo: ${receipt.verification_method}`,
    `Payload: ${receipt.payload.id}`,
    `Workspace: ${receipt.payload.workspace_id}`,
    `Arquivo: ${receipt.payload.file_name || "payload"}`,
    `Status: ${statusLabel(receipt.payload.status)}`,
    ...receiptTimestampLines("Recebido em", receipt.payload.created_at),
    ...receiptTimestampLines("Processado em", receipt.payload.processed_at),
    `Tamanho: ${receipt.payload.payload_size_bytes.toLocaleString("pt-BR")} bytes`,
    `SHA256: ${receipt.payload.payload_sha256}`,
    "",
    "Resultado",
    `Linhas totais: ${receipt.result.total_rows ?? "n/a"}`,
    `Linhas processadas: ${receipt.result.processed_rows ?? "n/a"}`,
    `Itens retornados: ${receipt.result.items_returned}`,
    `Itens criados: ${receipt.result.items_created ?? "n/a"}`,
    `Itens enriquecidos: ${receipt.result.items_enriched ?? "n/a"}`,
    `Rotas: ${receipt.result.routes ?? "n/a"}`,
    `Erros: ${receipt.result.errors}`,
  ];

  if (receipt.items.length > 0) {
    lines.push("", "Itens");
    for (const item of receipt.items) {
      lines.push(`- ${item.dfid || "DFID n/a"} · ${item.resolution_result || "resultado n/a"} · ${item.url || "sem URL"}`);
    }
  }

  if (receipt.errors.length > 0) {
    lines.push("", "Erros");
    for (const error of receipt.errors) {
      lines.push(`- ${error.reason_code || "erro"}: ${error.message || "sem mensagem"}`);
    }
  }

  lines.push("", "Observacao: este recibo confirma o registro e processamento tecnico do envio. Ele nao inclui o payload bruto nem identificadores sensiveis.");
  return lines.join("\n");
}

export default function PublicPayloadReceipt() {
  const { toast } = useToast();
  const { id = "" } = useParams();
  const [searchParams] = useSearchParams();
  const sha256 = searchParams.get("sha256") || "";

  const receiptQuery = useQuery({
    queryKey: ["public-payload-receipt", id, sha256],
    queryFn: () => getPublicRawPayloadReceipt(id, sha256),
    enabled: Boolean(id && sha256),
    retry: false,
  });

  const receipt = receiptQuery.data;
  const receiptText = useMemo(() => (receipt ? buildReceiptText(receipt) : ""), [receipt]);

  const copyText = async (text: string, title: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title });
    } catch {
      toast({
        title: "Nao foi possivel copiar",
        description: "Copie manualmente pelo navegador.",
        variant: "destructive",
      });
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="h-3 w-3 rounded-sm bg-emerald-500 rotate-45" />
            DeFarm
          </Link>
          <Button variant="outline" size="sm" onClick={() => copyText(window.location.href, "Link copiado")}>
            <Clipboard className="mr-2 h-4 w-4" />
            Copiar link
          </Button>
        </header>

        <Card className="border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Recibo de envio</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-normal">Processamento DeFarm</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Este recibo confirma que o identificador do envio e o SHA256 do payload conferem com
                o registro técnico mantido pela DeFarm. O payload bruto não é exibido neste link.
              </p>
            </div>
            {receipt?.verified && (
              <div className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                <ShieldCheck className="h-4 w-4" />
                Verificado
              </div>
            )}
          </div>

          {!id || !sha256 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Link incompleto. O recibo precisa do payload e do SHA256 completo.
            </div>
          ) : receiptQuery.isLoading ? (
            <div className="flex items-center gap-2 rounded-md border p-4 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando recibo...
            </div>
          ) : receiptQuery.isError ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Nao foi possivel verificar este recibo. O link pode estar incompleto, alterado ou apontar
              para um envio inexistente.
            </div>
          ) : receipt ? (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Info label="Payload" value={receipt.payload.id} />
                <Info label="Workspace" value={receipt.payload.workspace_id} />
                <Info label="Arquivo" value={receipt.payload.file_name || "payload"} />
                <Info label="Status" value={statusLabel(receipt.payload.status)} />
                <Info label="Recebido em" value={timestampBlock(receipt.payload.created_at)} multiline />
                <Info label="Processado em" value={timestampBlock(receipt.payload.processed_at)} multiline />
                <Info label="Tamanho" value={`${receipt.payload.payload_size_bytes.toLocaleString("pt-BR")} bytes`} />
                <Info label="SHA256" value={receipt.payload.payload_sha256} mono />
              </div>

              <section className="rounded-md border p-4">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Resultado
                </h2>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Metric label="Linhas processadas" value={`${receipt.result.processed_rows ?? "n/a"}/${receipt.result.total_rows ?? "n/a"}`} />
                  <Metric label="Itens retornados" value={String(receipt.result.items_returned)} />
                  <Metric label="Erros" value={String(receipt.result.errors)} />
                  <Metric label="Itens criados" value={String(receipt.result.items_created ?? "n/a")} />
                  <Metric label="Itens enriquecidos" value={String(receipt.result.items_enriched ?? "n/a")} />
                  <Metric label="Rotas" value={String(receipt.result.routes ?? "n/a")} />
                </div>
              </section>

              {receipt.items.length > 0 && (
                <section className="rounded-md border p-4">
                  <h2 className="mb-3 text-sm font-semibold">Itens retornados</h2>
                  <div className="space-y-2">
                    {receipt.items.map((item, index) => (
                      <div key={`${item.dfid || "item"}-${index}`} className="flex flex-col gap-1 rounded-md bg-slate-50 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium">{item.dfid || "DFID n/a"}</p>
                          <p className="text-xs text-slate-500">{item.resolution_result || "resultado n/a"}</p>
                        </div>
                        {item.url && (
                          <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                            Abrir item
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => copyText(receiptText, "Recibo copiado")}>
                  <FileText className="mr-2 h-4 w-4" />
                  Copiar recibo
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </main>
  );
}

function Info({ label, value, mono, multiline }: { label: string; value: string; mono?: boolean; multiline?: boolean }) {
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <p className="mb-1 text-xs text-slate-500">{label}</p>
      <p className={`${mono ? "break-all font-mono text-xs" : "text-sm"} ${multiline ? "whitespace-pre-line" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
