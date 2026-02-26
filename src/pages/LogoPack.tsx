import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import brandIcon from "@/assets/brand/icon.png";
import brandLockup from "@/assets/brand/lockup.png";

const assets = [
  {
    id: "icon",
    src: brandIcon,
    labelKey: "logopack.icon",
    filename: "defarm-icon.png",
  },
  {
    id: "lockup",
    src: brandLockup,
    labelKey: "logopack.lockup",
    filename: "defarm-lockup.png",
  },
];

function downloadImage(src: string, filename: string) {
  const a = document.createElement("a");
  a.href = src;
  a.download = filename;
  a.click();
}

export default function LogoPack() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 section-container py-20">
        <h1 className="text-4xl font-bold mb-2">{t("logopack.title")}</h1>
        <p className="text-muted-foreground mb-12 max-w-xl">
          {t("logopack.description")}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="border-4 border-foreground rounded-2xl p-8 flex flex-col items-center gap-6 bg-white"
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
                {t("logopack.download")}
              </button>
            </div>
          ))}
        </div>

        <section className="mt-16 border-t border-border pt-12">
          <h2 className="text-2xl font-bold mb-6">{t("logopack.guidelinesTitle")}</h2>
          <ul className="space-y-3 text-muted-foreground list-disc list-inside max-w-xl">
            <li>{t("logopack.rule1")}</li>
            <li>{t("logopack.rule2")}</li>
            <li>{t("logopack.rule3")}</li>
            <li>{t("logopack.rule4")}</li>
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  );
}
