import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Download, Share2, ExternalLink, Copy, BadgeCheck, Check, Clock3, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { NeloreMark } from "@/components/NeloreMark";

interface AssetQRCodeProps {
  dfid: string;
  locale?: string;
  valueChain?: string;
  statusLabel?: string;
  verificationState?: "confirmed" | "pending" | "unknown";
  canonicalIdLabel?: string;
  canonicalIdValue?: string;
  identityHash?: string;
  latestCid?: string;
  className?: string;
}

function buildQrUrl(dfid: string, size = 480): string {
  const publicUrl = `https://defarm.net/i/${dfid}`;
  return `https://quickchart.io/qr?text=${encodeURIComponent(publicUrl)}&size=${size}&margin=0&dark=27C268&light=ffffff`;
}

function DiamondQR({ dfid, size = 120 }: { dfid: string; size?: number }) {
  const qrUrl = buildQrUrl(dfid, 480);
  return (
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
      <rect x="22" y="22" width="76" height="76" rx="18" fill="hsl(var(--primary))" transform="rotate(45 60 60)" />
      <rect x="32" y="32" width="56" height="56" rx="14" fill="white" stroke="white" strokeWidth="6" transform="rotate(45 60 60) translate(5 -5)" />
      <image x="34" y="34" width="52" height="52" href={qrUrl} transform="rotate(45 60 60) translate(5 -5)" />
    </svg>
  );
}

function shorten(value: string, head = 10, tail = 8) {
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

function guillochePath(cx = 200, cy = 200, scale = 1, n = 1600): string {
  const Rf = 100;
  const rr = 64;
  const d = 90;
  const turns = 16;
  const k = (Rf - rr) / rr;
  let path = "";
  for (let i = 0; i <= n; i++) {
    const t = (2 * Math.PI * turns * i) / n;
    const x = cx + ((Rf - rr) * Math.cos(t) + d * Math.cos(k * t)) * scale;
    const y = cy + ((Rf - rr) * Math.sin(t) - d * Math.sin(k * t)) * scale;
    path += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return path;
}

const GUILLOCHE_PATH = guillochePath(200, 200, 1.32);

function Guilloche({ className, opacity = 0.1 }: { className?: string; opacity?: number }) {
  return (
    <svg viewBox="0 0 400 400" className={className} fill="none" aria-hidden="true" style={{ opacity }}>
      <defs>
        <radialGradient id="asset-guilloche" cx="50%" cy="50%" r="52%">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="65%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--primary-deep))" />
        </radialGradient>
      </defs>
      <path d={GUILLOCHE_PATH} stroke="url(#asset-guilloche)" strokeWidth={0.7} />
    </svg>
  );
}

function CornerTicks() {
  const base = "pointer-events-none absolute h-4 w-4 border-primary/30";
  return (
    <div aria-hidden="true">
      <span className={`${base} left-4 top-4 rounded-tl-[3px] border-l border-t`} />
      <span className={`${base} right-4 top-4 rounded-tr-[3px] border-r border-t`} />
      <span className={`${base} bottom-4 left-4 rounded-bl-[3px] border-b border-l`} />
      <span className={`${base} bottom-4 right-4 rounded-br-[3px] border-b border-r`} />
    </div>
  );
}

function SecurityStrip({ label }: { label: string }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-8 bottom-3 overflow-hidden whitespace-nowrap text-center text-[6px] font-medium uppercase leading-none tracking-[0.34em] text-primary/25"
    >
      {` ${label} · `.repeat(24)}
    </div>
  );
}

function ChainMark({ chain }: { chain?: string }) {
  if ((chain || "").toUpperCase() !== "BEEF") return null;
  return (
    <NeloreMark
      className="pointer-events-none absolute -right-10 top-4 h-40 w-40 text-primary/8 sm:-right-8 sm:h-48 sm:w-48"
      title=""
    />
  );
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Falha ao ler blob"));
    reader.readAsDataURL(blob);
  });
}

async function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  return await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Falha ao carregar imagem"));
    };
    image.src = url;
  });
}

export function AssetQRCode({
  dfid,
  valueChain,
  statusLabel,
  verificationState = "unknown",
  canonicalIdLabel,
  canonicalIdValue,
  identityHash,
  latestCid,
  className = "",
  locale = "pt-BR",
}: AssetQRCodeProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const { toast } = useToast();
  // Trilíngue local (a página pública tem toggle próprio, fora do i18next da app).
  const L = (pt: string, en: string, es: string) => (locale === "en" ? en : locale === "es" ? es : pt);

  // Esc fecha o certificado (paridade com clicar fora / no X).
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  const publicUrl = `https://defarm.net/i/${dfid}`;
  const latestCidUrl = latestCid ? `https://gateway.pinata.cloud/ipfs/${latestCid}` : null;
  const identityHashUrl = identityHash
    ? `https://stellar.expert/explorer/public/tx/${identityHash}`
    : null;
  const proofTone =
    verificationState === "confirmed"
      ? {
          label: L("Prova on-chain confirmada", "On-chain proof confirmed", "Prueba on-chain confirmada"),
          help: L("A identidade pública tem âncora confirmada.", "The public identity has a confirmed anchor.", "La identidad pública tiene un anclaje confirmado."),
          Icon: Check,
          className: "border-primary/25 bg-primary/10 text-primary",
        }
      : verificationState === "pending"
        ? {
            label: L("Prova on-chain pendente", "On-chain proof pending", "Prueba on-chain pendiente"),
            help: L("O DFID existe; a confirmação pode terminar em segundo plano.", "The DFID exists; confirmation may finish in the background.", "El DFID existe; la confirmación puede terminar en segundo plano."),
            Icon: Clock3,
            className: "border-amber-300/50 bg-amber-50 text-amber-800",
          }
        : {
            label: L("Registro público encontrado", "Public record found", "Registro público encontrado"),
            help: L("Mostrando os dados públicos disponíveis para auditoria.", "Showing public data available for audit.", "Mostrando los datos públicos disponibles para auditoría."),
            Icon: ShieldCheck,
            className: "border-stone-200 bg-stone-50 text-stone-700",
          };
  const ProofIcon = proofTone.Icon;

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} copiado` });
    } catch {
      toast({ title: `Falha ao copiar ${label.toLowerCase()}`, variant: "destructive" });
    }
  };

  const fetchQrPngBlob = async (size = 1200) => {
    // Timeout explícito: se o serviço de QR não responder, o usuário vê um
    // toast de erro em vez de um botão que "não faz nada".
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(buildQrUrl(dfid, size), { signal: controller.signal });
      if (!response.ok) throw new Error(L("Falha ao gerar QR", "Failed to generate QR", "Fallo al generar QR"));
      return await response.blob();
    } finally {
      clearTimeout(timer);
    }
  };

  const generatePngCardBlob = async (): Promise<Blob> => {
    const qrBlob = await fetchQrPngBlob(900);
    const qrImage = await loadImageFromBlob(qrBlob);

    const canvas = document.createElement("canvas");
    canvas.width = 1240;
    canvas.height = 1754;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponível");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#111827";
    ctx.font = "700 54px Arial";
    ctx.fillText("DeFarm", 80, 100);

    ctx.fillStyle = "#6b7280";
    ctx.font = "400 24px Arial";
    ctx.fillText("Certificado de Rastreabilidade", 80, 145);

    ctx.drawImage(qrImage, 270, 220, 700, 700);

    ctx.fillStyle = "#111827";
    ctx.font = "700 30px Arial";
    ctx.fillText(dfid, 80, 1020);

    let y = 1080;
    const drawLine = (label: string, value?: string | null) => {
      if (!value) return;
      ctx.fillStyle = "#6b7280";
      ctx.font = "600 20px Arial";
      ctx.fillText(`${label}:`, 80, y);
      ctx.fillStyle = "#111827";
      ctx.font = "400 20px Arial";
      ctx.fillText(value, 280, y);
      y += 44;
    };

    drawLine(canonicalIdLabel || "Identificador", canonicalIdValue || null);
    drawLine("Registro de identidade", identityHash || null);
    drawLine("Último CID", latestCid || null);
    drawLine("URL", publicUrl);

    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Falha ao gerar PNG"));
          return;
        }
        resolve(blob);
      }, "image/png");
    });
  };

  const generatePdfBlob = async (): Promise<Blob> => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const qrBlob = await fetchQrPngBlob(900);
    const qrDataUrl = await blobToDataUrl(qrBlob);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("DeFarm", 48, 52);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text("Certificado de Rastreabilidade", 48, 72);

    doc.addImage(qrDataUrl, "PNG", 140, 100, 320, 320);

    let y = 460;
    const line = (label: string, value?: string | null) => {
      if (!value) return;
      doc.setFont("helvetica", "bold");
      doc.text(`${label}:`, 48, y);
      doc.setFont("helvetica", "normal");
      const wrapped = doc.splitTextToSize(value, 460);
      doc.text(wrapped, 180, y);
      y += 24 + (wrapped.length - 1) * 16;
    };

    line("DFID", dfid);
    line(canonicalIdLabel || "Identificador", canonicalIdValue || null);
    line("Registro de identidade", identityHash || null);
    line("Último CID", latestCid || null);
    line("URL", publicUrl);

    return doc.output("blob");
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onDownloadPng = async () => {
    try {
      const blob = await generatePngCardBlob();
      downloadBlob(blob, `${dfid}-certificado.png`);
    } catch (err) {
      toast({ title: "Falha ao baixar PNG", description: err instanceof Error ? err.message : "Erro", variant: "destructive" });
    }
  };

  const onDownloadPdf = async () => {
    try {
      const blob = await generatePdfBlob();
      downloadBlob(blob, `${dfid}-certificado.pdf`);
    } catch (err) {
      toast({ title: "Falha ao baixar PDF", description: err instanceof Error ? err.message : "Erro", variant: "destructive" });
    }
  };

  // Copy the link AND open the native share sheet where available. Copy is
  // fired before share() to preserve the user activation share() needs, so the
  // link is always copied even when the share sheet has no "copy link" option.
  const onShareLink = async () => {
    const copyPromise = navigator.clipboard
      ? navigator.clipboard.writeText(publicUrl).then(() => true, () => false)
      : Promise.resolve(false);
    let shared = false;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Certificado DeFarm", text: `Rastreabilidade DeFarm: ${dfid}`, url: publicUrl });
        shared = true;
      } catch (err) {
        // User cancelled the native sheet — the link is still copied below.
        if (!(err instanceof Error && err.name === "AbortError")) {
          // other share failures fall through to the copy feedback
        }
      }
    }
    const copied = await copyPromise;
    if (copied) {
      toast({ title: shared ? "Compartilhado · link copiado" : "Link copiado" });
    } else if (!shared) {
      toast({ title: "Falha ao compartilhar link", variant: "destructive" });
    }
  };

  return (
    <>
      <div
        className={`group relative overflow-hidden rounded-[20px] border border-border bg-card px-5 py-6 text-center shadow-[0_2px_4px_-2px_rgba(0,0,0,0.10),0_20px_52px_-30px_hsl(var(--primary)/0.36)] cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-xl hover:border-primary/25 sm:px-7 sm:py-7 ${className}`}
        onClick={() => setFullscreen(true)}
      >
        <Guilloche className="pointer-events-none absolute left-1/2 top-[44%] h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2" />
        <ChainMark chain={valueChain} />
        <div className="pointer-events-none absolute inset-[10px] rounded-2xl border border-primary/15" aria-hidden="true" />
        <CornerTicks />
        <SecurityStrip label="DeFarm · Public animal page" />

        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="transition-transform group-hover:scale-105">
            <DiamondQR dfid={dfid} size={140} />
          </div>
          <div className="text-center space-y-2">
            <div className={`mx-auto inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${proofTone.className}`}>
              <ProofIcon className="h-3.5 w-3.5" />
              {proofTone.label}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{L("Página pública do animal", "Public animal page", "Página pública del animal")}</p>
              <p className="mt-1 text-xs font-mono text-foreground/80 break-all">{dfid}</p>
            </div>
            {canonicalIdLabel && canonicalIdValue ? (
              <p className="text-[11px] text-muted-foreground mt-1 break-all">
                {canonicalIdLabel}: <span className="font-mono text-foreground/80">{canonicalIdValue}</span>
              </p>
            ) : null}
            <p className="mx-auto max-w-[28rem] text-[12px] leading-relaxed text-muted-foreground">{proofTone.help}</p>
            {statusLabel ? <p className="text-[11px] text-muted-foreground">{statusLabel}</p> : null}
          </div>
        </div>
        <div className="absolute inset-0 rounded-2xl bg-foreground/0 group-hover:bg-foreground/[0.02] transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border">
            {L("Clique para expandir", "Click to expand", "Haz clic para ampliar")}
          </span>
        </div>
      </div>

      {fullscreen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={L("Certificado de Rastreabilidade", "Traceability Certificate", "Certificado de Trazabilidad")}
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center animate-fade-in"
          onClick={() => setFullscreen(false)}
        >
          <div
            className="relative w-full max-w-sm mx-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setFullscreen(false)}
              className="absolute -top-12 right-0 p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={L("Fechar certificado", "Close certificate", "Cerrar certificado")}
            >
              <X className="h-6 w-6" />
            </button>

            <div className="relative overflow-hidden rounded-[24px] border border-border bg-card p-8 shadow-2xl">
              <Guilloche className="pointer-events-none absolute left-1/2 top-[42%] h-[390px] w-[390px] -translate-x-1/2 -translate-y-1/2" opacity={0.12} />
              <ChainMark chain={valueChain} />
              <div className="pointer-events-none absolute inset-[10px] rounded-[20px] border border-primary/15" aria-hidden="true" />
              <CornerTicks />
              <SecurityStrip label="DeFarm · Traceability certificate" />
              <div className="relative z-10 flex flex-col items-center gap-6">
                <DiamondQR dfid={dfid} size={220} />

                <div className="text-center space-y-1">
                  <div className={`mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${proofTone.className}`}>
                    <BadgeCheck className="h-3.5 w-3.5" />
                    {proofTone.label}
                  </div>
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
                    {L("Certificado público de rastreabilidade", "Public traceability certificate", "Certificado público de trazabilidad")}
                  </p>
                  <p className="text-sm font-mono text-foreground font-medium break-all">{dfid}</p>
                  {canonicalIdLabel && canonicalIdValue ? (
                    <p className="text-xs text-muted-foreground break-all">
                      {canonicalIdLabel}: <span className="font-mono">{canonicalIdValue}</span>
                    </p>
                  ) : null}
                  {identityHash ? (
                    <div className="text-[11px] text-muted-foreground break-all">
                      <p>{L("Registro de identidade:", "Identity record:", "Registro de identidad:")}</p>
                      <div className="inline-flex items-center gap-1.5">
                        <a
                          href={identityHashUrl || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-foreground/80 hover:text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {shorten(identityHash)}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <button
                          type="button"
                          onClick={() => void handleCopy(identityHash, "Hash de identidade")}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Copiar hash de identidade"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {latestCid ? (
                    <div className="text-[11px] text-muted-foreground break-all">
                      <p>{L("Último registro de conteúdo:", "Latest content record:", "Último registro de contenido:")}</p>
                      <div className="inline-flex items-center gap-1.5">
                        <a
                          href={latestCidUrl || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-foreground/80 hover:text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {shorten(latestCid)}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <button
                          type="button"
                          onClick={() => void handleCopy(latestCid, "CID")}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Copiar CID"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ) : null}
                  <p className="text-xs text-muted-foreground">{publicUrl}</p>
                </div>

                <div className="flex items-center gap-2 w-full">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => void onDownloadPng()}>
                    <Download className="h-4 w-4 mr-1.5" />
                    PNG
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => void onDownloadPdf()}>
                    <Download className="h-4 w-4 mr-1.5" />
                    PDF
                  </Button>
                  <Button size="sm" className="flex-1" onClick={() => void onShareLink()}>
                    <Share2 className="h-4 w-4 mr-1.5" />
                    {L("Compartilhar", "Share", "Compartir")}
                  </Button>
                </div>
              </div>
            </div>

            <p className="text-center text-[10px] text-muted-foreground mt-4">
              {L("Verificado pela plataforma DeFarm", "Verified by the DeFarm platform", "Verificado por la plataforma DeFarm")}
            </p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
