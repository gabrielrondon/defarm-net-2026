import { useState } from "react";
import { X, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AssetQRCodeProps {
  dfid: string;
  className?: string;
}

function buildQrUrl(dfid: string, size = 480): string {
  const publicUrl = `https://ms.defarm.net/${dfid}`;
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

export function AssetQRCode({ dfid, className = "" }: AssetQRCodeProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const publicUrl = `https://ms.defarm.net/${dfid}`;

  const handleShare = async () => {
    const shareData = {
      title: `Rastreabilidade ${dfid}`,
      text: `Confira a rastreabilidade verificada deste ativo: ${publicUrl}`,
      url: publicUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareData.text)}`, "_blank");
      }
    } catch {
      await navigator.clipboard.writeText(publicUrl);
    }
  };

  const handleDownload = () => {
    const svg = `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <rect x="22" y="22" width="76" height="76" rx="18" fill="#27C268" transform="rotate(45 60 60)"/>
      <rect x="32" y="32" width="56" height="56" rx="14" fill="white" stroke="white" stroke-width="6" transform="rotate(45 60 60) translate(5 -5)"/>
      <image x="34" y="34" width="52" height="52" href="${buildQrUrl(dfid, 480)}" transform="rotate(45 60 60) translate(5 -5)"/>
    </svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dfid}-qrcode.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Compact card */}
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
          </div>
        </div>
        <div className="absolute inset-0 rounded-2xl bg-foreground/0 group-hover:bg-foreground/[0.02] transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border">
            Clique para expandir
          </span>
        </div>
      </div>

      {/* Fullscreen overlay */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center animate-fade-in"
          onClick={() => setFullscreen(false)}
        >
          <div
            className="relative w-full max-w-sm mx-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setFullscreen(false)}
              className="absolute -top-12 right-0 p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Card */}
            <div className="rounded-3xl border border-border bg-gradient-to-b from-primary/8 via-background to-background p-8 shadow-2xl">
              <div className="flex flex-col items-center gap-6">
                <DiamondQR dfid={dfid} size={220} />

                <div className="text-center space-y-1">
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
                    Certificado de Rastreabilidade
                  </p>
                  <p className="text-sm font-mono text-foreground font-medium break-all">{dfid}</p>
                  <p className="text-xs text-muted-foreground">{publicUrl}</p>
                </div>

                <div className="flex items-center gap-3 w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={handleDownload}
                  >
                    <Download className="h-4 w-4 mr-1.5" />
                    Baixar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={handleShare}
                  >
                    <Share2 className="h-4 w-4 mr-1.5" />
                    Compartilhar
                  </Button>
                </div>
              </div>
            </div>

            <p className="text-center text-[10px] text-muted-foreground mt-4">
              Verificado pela plataforma DeFarm
            </p>
          </div>
        </div>
      )}
    </>
  );
}
