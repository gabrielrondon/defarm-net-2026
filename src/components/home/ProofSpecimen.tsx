import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnchorStatus } from "@/components/proof";

// Espécime de prova — card "vivo": rotaciona itens a cada ~4.2s com um fade
// elegante. Privilegia bovinos, mas roda outras cadeias EUDR-ready (cacau, café,
// soja). O ID secundário (SISBOV/CEPLAC/CAR…) aparece mascarado no meio.
// "{n} assinaturas" = nº de elos que já assinaram eventos neste item (não redes).
// Em produção, alimentar SPECIMENS por props/API; manter a regra de honestidade
// do AnchorStatus (só "confirmado" quando a confirmação existe).

type Specimen = {
  code: "beef" | "cocoa" | "coffee" | "soy";
  country: string;
  dfid: string; idLabel: string; idValue: string;
  issued: string; area: string; signers: number;
};

const SPECIMENS: Specimen[] = [
  { code: "beef",   country: "BR", dfid: "DFID-BEEF-BR-2026-001106-b0e4d7",   idLabel: "SISBOV",    idValue: "076000000099004", issued: "13.06.2026", area: "1247.5", signers: 4 },
  { code: "cocoa",  country: "BR", dfid: "DFID-COCOA-BR-2026-004412-3fa9c1",  idLabel: "CEPLAC",    idValue: "14025500030017",  issued: "02.05.2026", area: "318.2",  signers: 3 },
  { code: "beef",   country: "UY", dfid: "DFID-BEEF-UY-2026-002471-9c3e80",   idLabel: "SNIG",      idValue: "858001204477190", issued: "07.06.2026", area: "1980.0", signers: 4 },
  { code: "coffee", country: "BR", dfid: "DFID-COFFEE-BR-2026-002088-7d2e44", idLabel: "CERTIFICA", idValue: "31067200081124",  issued: "28.04.2026", area: "76.4",   signers: 4 },
  { code: "beef",   country: "FR", dfid: "DFID-BEEF-FR-2026-000934-1ab7d2",   idLabel: "IPG",       idValue: "FR4412800153",    issued: "05.06.2026", area: "640.0",  signers: 5 },
  { code: "beef",   country: "BR", dfid: "DFID-BEEF-BR-2026-001204-c2f0a9",   idLabel: "SISBOV",    idValue: "076000000208841", issued: "09.06.2026", area: "1530.7", signers: 4 },
  { code: "soy",    country: "BR", dfid: "DFID-SOY-BR-2026-008730-aa1b90",    idLabel: "CAR",       idValue: "51002500004203",  issued: "21.03.2026", area: "4120.0", signers: 3 },
  { code: "beef",   country: "PT", dfid: "DFID-BEEF-PT-2026-000218-5e0fa4",   idLabel: "SNIRA",     idValue: "PT612009941187",  issued: "03.06.2026", area: "212.5",  signers: 3 },
];

function maskId(s: string) {
  return s.length <= 9 ? s : `${s.slice(0, 4)} •••• ${s.slice(-4)}`;
}

// Glifo DECORATIVO (não é um QR escaneável) — padrão generativo único por
// espécime. Sem os cantos de "finder" pra não se passar por código real.
// Quando houver DFIDs reais (T3), trocar por um QR de verdade -> /i/:dfid.
function ProofGlyph({ size = 76, seed = 0 }: { size?: number; seed?: number }) {
  const n = 8, c = size / (n + 1);
  const rnd = (x: number, y: number) =>
    ((Math.imul(((x + 1) * 73856093) ^ ((y + 1) * 19349663) ^ ((seed + 1) * 83492791), 2654435761) >>> 0) % 1000) / 1000;
  const dens = 0.34 + ((seed * 37) % 26) / 100; // densidade varia por espécime
  const cells: [number, number][] = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (rnd(x, y) < dens) cells.push([x, y]);
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <rect width={size} height={size} rx="8" fill="hsl(var(--primary) / 0.08)" />
      {cells.map(([x, y], k) => (
        <rect key={k} x={c * (x + 0.5)} y={c * (y + 0.5)} width={c * 0.82} height={c * 0.82} rx="1.5" fill="hsl(var(--primary))" />
      ))}
    </svg>
  );
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
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-primary" title={t("spec.signers_hint")}>
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          {s.signers} {t("spec.signers")}
        </span>
      </div>

      <div key={i} className="spec-rotate">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full border border-border px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-foreground/70">{t(`spec.c_${s.code}`)}</span>
          <span className="rounded-full border border-border px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-foreground/70">{s.country}</span>
          <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />{t("spec.status")}
          </span>
        </div>
        <div className="mb-1 break-all font-mono text-[15px] font-medium tracking-tight sm:text-[17px]">{s.dfid}</div>
        <div className="mb-4 font-mono text-[12px] text-muted-foreground">{s.idLabel}: {maskId(s.idValue)}</div>

        <div className="mb-4 flex items-center gap-4 rounded-xl bg-muted p-3">
          <ProofGlyph size={76} seed={i + 1} />
          <div className="min-w-0">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
              <span>{t("spec.issued")}</span><span className="text-foreground">{s.issued}</span>
              <span>area_ha</span><span className="text-foreground">{s.area}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <AnchorStatus status="confirmed" compact />
          <span className="rounded-full border border-transparent bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-primary">{t("spec.eudr")}</span>
        </div>
      </div>
    </div>
  );
}
