import { useState } from "react";
import { X, Download, Share2, ExternalLink, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const latestCidUrl = latestCid ? `https://gateway.pinata.cloud/ipfs/${latestCid}` : null;
  const identityHashUrl = identityHash
    ? `https://stellar.expert/explorer/public/tx/${identityHash}`
    : null;
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

export function AssetQRCode({
  dfid,
  canonicalIdLabel,
  canonicalIdValue,
  identityHash,
  latestCid,
  className = "",
}: AssetQRCodeProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const publicUrl = `https://defarm.net/i/${dfid}`;

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

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // no-op; keep UI simple in public view
    }
  };

  const shorten = (value: string, head = 10, tail = 8) => {
    if (value.length <= head + tail + 3) return value;
    return `${value.slice(0, head)}...${value.slice(-tail)}`;
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
                          onClick={() => void handleCopy(identityHash)}
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
                          onClick={() => void handleCopy(latestCid)}
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
