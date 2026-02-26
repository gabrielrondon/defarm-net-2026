import { useTranslation } from "react-i18next";
import { Download, Copy, Check } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import brandIcon from "@/assets/brand/icon.png";
import brandLockup from "@/assets/brand/lockup.png";
import { useState } from "react";

const assets = [
  {
    id: "icon",
    src: brandIcon,
    labelKey: "branding.icon",
    filename: "defarm-icon.png",
  },
  {
    id: "lockup",
    src: brandLockup,
    labelKey: "branding.lockup",
    filename: "defarm-lockup.png",
  },
];

const brandColors = [
  { name: "Primary Green", hex: "#28c268", hsl: "145 65% 47%", token: "--primary" },
  { name: "Foreground", hex: "#1a1a1a", hsl: "0 0% 10%", token: "--foreground" },
  { name: "Background", hex: "#ffffff", hsl: "0 0% 100%", token: "--background" },
  { name: "Muted", hex: "#f5f5f5", hsl: "0 0% 96%", token: "--muted" },
  { name: "Muted Text", hex: "#6b6b6b", hsl: "0 0% 42%", token: "--muted-foreground" },
  { name: "Border", hex: "#e6e6e6", hsl: "0 0% 90%", token: "--border" },
];

const greenShades = [
  { name: "50", hex: "#e8f9ef" },
  { name: "100", hex: "#c6f0d5" },
  { name: "200", hex: "#8fe0ac" },
  { name: "300", hex: "#57d083" },
  { name: "400", hex: "#28c268" },
  { name: "500", hex: "#1fa855" },
  { name: "600", hex: "#188c45" },
  { name: "700", hex: "#126f37" },
  { name: "800", hex: "#0d5329" },
  { name: "900", hex: "#08371b" },
];

function downloadImage(src: string, filename: string) {
  const a = document.createElement("a");
  a.href = src;
  a.download = filename;
  a.click();
}

function ColorSwatch({ name, hex, copyValue }: { name: string; hex: string; copyValue: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(copyValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="group flex flex-col items-start gap-2 text-left transition-transform hover:scale-105"
    >
      <div
        className="w-full aspect-square rounded-xl border border-border shadow-sm"
        style={{ backgroundColor: hex }}
      />
      <div className="w-full">
        <p className="text-sm font-semibold text-foreground">{name}</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="font-mono">{hex}</span>
          {copied ? (
            <Check className="h-3 w-3 text-primary" />
          ) : (
            <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>
    </button>
  );
}

export default function LogoPack() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 section-container py-20">
        {/* Hero */}
        <h1 className="text-4xl font-bold mb-2">{t("branding.title")}</h1>
        <p className="text-muted-foreground mb-16 max-w-xl">
          {t("branding.description")}
        </p>

        {/* Logos */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8">{t("branding.logosTitle")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="border-4 border-foreground rounded-2xl p-8 flex flex-col items-center gap-6 bg-card"
              >
                <div className="h-40 flex items-center justify-center">
                  <img
                    src={asset.src}
                    alt={t(asset.labelKey)}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <p className="font-semibold text-lg">{t(asset.labelKey)}</p>
                <button
                  onClick={() => downloadImage(asset.src, asset.filename)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
                >
                  <Download className="h-4 w-4" />
                  {t("branding.download")}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Color Palette */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-2">{t("branding.colorsTitle")}</h2>
          <p className="text-muted-foreground mb-8">{t("branding.colorsDescription")}</p>

          <h3 className="text-lg font-semibold mb-4">{t("branding.coreColors")}</h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 mb-10">
            {brandColors.map((c) => (
              <ColorSwatch key={c.token} name={c.name} hex={c.hex} copyValue={c.hex} />
            ))}
          </div>

          <h3 className="text-lg font-semibold mb-4">{t("branding.greenScale")}</h3>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
            {greenShades.map((s) => (
              <ColorSwatch key={s.name} name={s.name} hex={s.hex} copyValue={s.hex} />
            ))}
          </div>
        </section>

        {/* Typography */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-2">{t("branding.typographyTitle")}</h2>
          <p className="text-muted-foreground mb-8">{t("branding.typographyDescription")}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border border-border rounded-xl p-8">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                {t("branding.headings")}
              </p>
              <p className="text-4xl font-bold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                DM Sans
              </p>
              <p className="text-2xl font-bold mt-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Aa Bb Cc 0123
              </p>
              <p className="text-sm text-muted-foreground mt-3">Bold · 700</p>
            </div>
            <div className="border border-border rounded-xl p-8">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                {t("branding.body")}
              </p>
              <p className="text-4xl font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>
                Inter
              </p>
              <p className="text-2xl mt-2" style={{ fontFamily: "'Inter', sans-serif" }}>
                Aa Bb Cc 0123
              </p>
              <p className="text-sm text-muted-foreground mt-3">Regular 400 · Medium 500 · Semibold 600</p>
            </div>
          </div>
        </section>

        {/* Guidelines */}
        <section className="border-t border-border pt-12">
          <h2 className="text-2xl font-bold mb-6">{t("branding.guidelinesTitle")}</h2>
          <ul className="space-y-3 text-muted-foreground list-disc list-inside max-w-xl">
            <li>{t("branding.rule1")}</li>
            <li>{t("branding.rule2")}</li>
            <li>{t("branding.rule3")}</li>
            <li>{t("branding.rule4")}</li>
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  );
}
