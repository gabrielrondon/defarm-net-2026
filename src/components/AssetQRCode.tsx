import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Download, Share2, ExternalLink, Copy, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface AssetQRCodeProps {
  dfid: string;
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
  canonicalIdLabel,
  canonicalIdValue,
  identityHash,
  latestCid,
  className = "",
}: AssetQRCodeProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const { toast } = useToast();

  const publicUrl = `https://defarm.net/i/${dfid}`;
  const latestCidUrl = latestCid ? `https://gateway.pinata.cloud/ipfs/${latestCid}` : null;
  const identityHashUrl = identityHash
    ? `https://stellar.expert/explorer/public/tx/${identityHash}`
    : null;

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} copiado` });
    } catch {
      toast({ title: `Falha ao copiar ${label.toLowerCase()}`, variant: "destructive" });
    }
  };

  const fetchQrPngBlob = async (size = 1200) => {
    const response = await fetch(buildQrUrl(dfid, size));
    if (!response.ok) throw new Error("Falha ao gerar QR");
    return await response.blob();
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

  const shareBlob = async (blob: Blob, fileName: string, title: string) => {
    const file = new File([blob], fileName, { type: blob.type || "application/octet-stream" });
    const shareData: ShareData = {
      title,
      text: `${title} - ${dfid}`,
      url: publicUrl,
      files: [file],
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(publicUrl);
        toast({ title: "Link copiado", description: "Seu dispositivo não suporta compartilhamento de arquivo." });
      }
    } catch {
      toast({ title: "Compartilhamento cancelado", variant: "destructive" });
    }
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

  const onSharePng = async () => {
    try {
      const blob = await generatePngCardBlob();
      await shareBlob(blob, `${dfid}-certificado.png`, "Certificado PNG");
    } catch (err) {
      toast({ title: "Falha ao compartilhar PNG", description: err instanceof Error ? err.message : "Erro", variant: "destructive" });
    }
  };

  const onSharePdf = async () => {
    try {
      const blob = await generatePdfBlob();
      await shareBlob(blob, `${dfid}-certificado.pdf`, "Certificado PDF");
    } catch (err) {
      toast({ title: "Falha ao compartilhar PDF", description: err instanceof Error ? err.message : "Erro", variant: "destructive" });
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
        className={`group relative rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-background to-primary/3 p-6 cursor-pointer transition-all hover:shadow-lg hover:border-primary/20 ${className}`}
        onClick={() => setFullscreen(true)}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="transition-transform group-hover:scale-105">
            <DiamondQR dfid={dfid} size={140} />
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Escaneie para rastrear</p>
            <p className="text-xs font-mono text-foreground/70 mt-1 break-all">{dfid}</p>
            {canonicalIdLabel && canonicalIdValue ? (
              <p className="text-[11px] text-muted-foreground mt-1 break-all">
                {canonicalIdLabel}: <span className="font-mono text-foreground/80">{canonicalIdValue}</span>
              </p>
            ) : null}
          </div>
        </div>
        <div className="absolute inset-0 rounded-2xl bg-foreground/0 group-hover:bg-foreground/[0.02] transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border">
            Clique para expandir
          </span>
        </div>
      </div>

      {fullscreen && createPortal(
        <div
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
            >
              <X className="h-6 w-6" />
            </button>

            <div className="rounded-3xl border border-border bg-gradient-to-b from-primary/8 via-background to-background p-8 shadow-2xl">
              <div className="flex flex-col items-center gap-6">
                <DiamondQR dfid={dfid} size={220} />

                <div className="text-center space-y-1">
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
                    Certificado de Rastreabilidade
                  </p>
                  <p className="text-sm font-mono text-foreground font-medium break-all">{dfid}</p>
                  {canonicalIdLabel && canonicalIdValue ? (
                    <p className="text-xs text-muted-foreground break-all">
                      {canonicalIdLabel}: <span className="font-mono">{canonicalIdValue}</span>
                    </p>
                  ) : null}
                  {identityHash ? (
                    <div className="text-[11px] text-muted-foreground break-all">
                      <p>Registro de identidade:</p>
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
                      <p>Último registro de conteúdo:</p>
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

                <div className="flex items-center gap-3 w-full">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Download className="h-4 w-4 mr-1.5" />
                        Baixar
                        <ChevronDown className="h-4 w-4 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-52">
                      <DropdownMenuItem onClick={() => void onDownloadPng()}>PNG (QR + dados)</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void onDownloadPdf()}>PDF (QR + dados + links)</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Share2 className="h-4 w-4 mr-1.5" />
                        Compartilhar
                        <ChevronDown className="h-4 w-4 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => void handleCopy(publicUrl, "Link")}>
                        <Copy className="h-4 w-4 mr-2" /> Copiar link
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void onShareLink()}>
                        <Share2 className="h-4 w-4 mr-2" /> Compartilhar… (WhatsApp, etc.)
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => void onSharePng()}>PNG (QR + dados)</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void onSharePdf()}>PDF (QR + dados + links)</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            <p className="text-center text-[10px] text-muted-foreground mt-4">
              Verificado pela plataforma DeFarm
            </p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
