import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import { AnchorStatus } from "@/components/proof";
import { getCarPublicMeta, type CarPublicMeta } from "@/lib/check-api/car";

// Espécime de prova — card "vivo": rotaciona DFIDs REAIS a cada ~4.2s com fade.
// São itens reais da rede (cadeia DEFARM), ancorados on-chain e verificáveis em
// /i/:dfid — o QR é REAL (escaneia pra página de verificação) e o card é clicável.
// Variedade por REGIÃO (UF), com CAR real. Honestidade: AnchorStatus só
// "confirmado" porque os 5 estão de fato confirmados on-chain (T3, provisionados).
type Specimen = {
  dfid: string;
  uf: string;
  municipality: string;
  farm: string;
  car: string;
  issued: string; // dd.mm.aaaa
  area: string;
};

const SPECIMENS: Specimen[] = [
  { dfid: "DFID-DEFARM-BR-2026-009280-9c94cf", uf: "TO", municipality: "Rio Sono",    farm: "Fazenda Buriti",     car: "TO-1718758-BF8D952CAC174300918130F14E599D22", issued: "12.05.2023", area: "139.41" },
  { dfid: "DFID-DEFARM-BR-2026-009281-a66ac0", uf: "MS", municipality: "Alcinópolis", farm: "Fazenda Água Clara",  car: "MS-5000252-A65CFC4F28D8412BA85E1B36B69308A5", issued: "03.04.2023", area: "1000.11" },
  { dfid: "DFID-DEFARM-BR-2026-009282-bb5883", uf: "RS", municipality: "Alegrete",    farm: "Estância São Pedro", car: "RS-4300406-BAE8947E4DA043E39AAD46F953E5976D", issued: "18.06.2023", area: "48.68" },
  { dfid: "DFID-DEFARM-BR-2026-009283-290f40", uf: "MG", municipality: "Pimenta",     farm: "Fazenda Boa Vista",  car: "MG-3150505-72DDA84763B84AF8BE7205D04B92E60E", issued: "21.04.2023", area: "57.63" },
  { dfid: "DFID-DEFARM-BR-2026-009284-e86ba7", uf: "GO", municipality: "Formosa",     farm: "Estância Cerrado",   car: "GO-5208004-90C627357F86446AA45F56A293BB2B37", issued: "28.03.2023", area: "72.01" },
];

function maskId(s: string) {
  return s.length <= 9 ? s : `${s.slice(0, 4)} •••• ${s.slice(-4)}`;
}

export function ProofSpecimen() {
  const { t } = useTranslation();
  const [i, setI] = useState(0);
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const PERIOD = 4200;
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setI((v) => (v + 1) % SPECIMENS.length), PERIOD);
    return () => clearInterval(id);
  }, [reduce]);
  const s = SPECIMENS[i];
  const verifyPath = `/i/${s.dfid}`;
  const verifyUrl = `https://defarm.net${verifyPath}`;

  // #42: área/UF/município REAIS da fonte (SICAR via /car/:car/geojson), por CAR,
  // com cache. Fallback nos valores curados enquanto carrega / se a Check falhar.
  // (DFID e fazenda seguem curados: propertyName não existe no SICAR.)
  const [meta, setMeta] = useState<Record<string, CarPublicMeta>>({});
  useEffect(() => {
    const car = s.car;
    if (meta[car]) return;
    let cancelled = false;
    getCarPublicMeta(car)
      .then((m) => { if (!cancelled) setMeta((prev) => ({ ...prev, [car]: m })); })
      .catch(() => { /* mantém os valores curados */ });
    return () => { cancelled = true; };
  }, [s.car, meta]);
  const live = meta[s.car];
  const ufDisplay = live?.state ?? s.uf;
  const muniDisplay = live?.municipality ?? s.municipality;
  const areaDisplay = live?.areaHa != null ? String(live.areaHa) : s.area;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)]">
      {/* cycle progress line — restarts each swap */}
      {!reduce && (
        <div
          key={`p${i}`}
          className="spec-prog absolute left-0 top-0 h-[2px] w-full"
          style={{ background: "hsl(var(--primary) / 0.5)", animationDuration: `${PERIOD}ms` }}
        />
      )}

      <div className="mb-4 flex items-center justify-between border-b border-dashed border-border pb-4">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{t("spec.label")}</span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          {t("spec.live")}
        </span>
      </div>

      <div key={i} className="spec-rotate">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full border border-border px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-foreground/70">{ufDisplay}</span>
          <span className="rounded-full border border-border px-2.5 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-foreground/70">{muniDisplay}</span>
          <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />{t("spec.status")}
          </span>
        </div>
        <div className="mb-1 break-all font-mono text-[15px] font-medium tracking-tight sm:text-[17px]">{s.dfid}</div>
        <div className="mb-4 font-mono text-[12px] text-muted-foreground">{s.farm} · CAR {maskId(s.car)}</div>

        <Link
          to={verifyPath}
          className="mb-4 flex items-center gap-4 rounded-xl bg-muted p-3 transition-colors hover:bg-muted/70"
          title={t("spec.verify")}
        >
          <span className="shrink-0 rounded-lg bg-white p-1.5">
            <QRCodeSVG value={verifyUrl} size={68} level="M" fgColor="#1e6b46" bgColor="#ffffff" />
          </span>
          <div className="min-w-0">
            <div className="mb-1.5 text-[12px] font-semibold text-foreground">{t("spec.verify")}</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
              <span>{t("spec.issued")}</span><span className="text-foreground">{s.issued}</span>
              <span>area_ha</span><span className="text-foreground">{areaDisplay}</span>
            </div>
          </div>
        </Link>

        <div className="flex items-center justify-between">
          <AnchorStatus status="confirmed" compact />
          <span className="rounded-full border border-transparent bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-primary">{t("spec.eudr")}</span>
        </div>
      </div>
    </div>
  );
}
