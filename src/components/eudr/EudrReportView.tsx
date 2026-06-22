import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MinusCircle,
  Download,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EudrMap } from "./EudrMap";
import {
  VERDICT,
  STATUS,
  labelOf,
  formatHa,
  formatCount,
  verdictPhrase,
  sourceMessage,
  type EudrReportData,
  type EudrSourceN,
  type Locale,
} from "@/lib/eudr-report";

const verdictIcon = {
  COMPLIANT: CheckCircle2,
  PARTIAL: AlertTriangle,
  NON_COMPLIANT: XCircle,
} as const;

// ── Banner herói ──────────────────────────────────────────────────────────
function VerdictBanner({
  data,
  locale,
  onDownloadPdf,
}: {
  data: EudrReportData;
  locale: Locale;
  onDownloadPdf?: () => void;
}) {
  const v = VERDICT[data.verdict];
  const Icon = verdictIcon[data.verdict];
  const dt = data.metadata.generatedAt
    ? new Date(data.metadata.generatedAt).toLocaleDateString(locale === "en" ? "en-US" : "pt-BR")
    : "";
  const idShort = data.metadata.checkId ? `Check ${data.metadata.checkId.slice(0, 8)}…` : "";
  return (
    <div className="rounded-xl border p-5" style={{ backgroundColor: v.bg, borderColor: v.color }}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Icon style={{ color: v.color }} className="h-7 w-7 shrink-0" aria-hidden />
          <div>
            <div className="text-lg font-bold" style={{ color: v.color }}>
              {v.label[locale]}
            </div>
            <div className="text-sm text-foreground/80 mt-0.5">{verdictPhrase(data, locale)}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold" style={{ color: v.color }}>
            score {Math.round(data.score)}/100
          </span>
          {onDownloadPdf && (
            <Button size="sm" variant="outline" onClick={onDownloadPdf}>
              <Download className="h-4 w-4 mr-1" /> {locale === "en" ? "Download PDF" : "Baixar PDF"}
            </Button>
          )}
        </div>
      </div>
      <div className="text-xs text-muted-foreground mt-3 flex gap-2 flex-wrap">
        {data.metadata.country && <span>{data.metadata.country === "*" ? "Global" : data.metadata.country}</span>}
        <span>· {formatHa(data.metadata.areaHa, locale)}</span>
        {idShort && <span>· {idShort}</span>}
        {dt && <span>· {dt}</span>}
      </div>
    </div>
  );
}

// ── Mini-viz ────────────────────────────────────────────────────────────
function YearBars({ data, locale }: { data: Record<string, number>; locale: Locale }) {
  const entries = Object.entries(data)
    .map(([y, v]) => [y, Number(v) || 0] as [string, number])
    .sort((a, b) => a[0].localeCompare(b[0]));
  if (!entries.length) return null;
  const max = Math.max(...entries.map(([, v]) => v), 1);
  const aria = entries.map(([y, v]) => `${y}: ${formatHa(v, locale)}`).join("; ");
  return (
    <div className="mt-2" role="img" aria-label={aria}>
      <div className="text-xs text-muted-foreground mb-1">{labelOf("by_year", locale)}</div>
      <div className="space-y-1">
        {entries.map(([y, v]) => (
          <div key={y} className="flex items-center gap-2 text-xs">
            <span className="w-10 tabular-nums text-muted-foreground">{y}</span>
            <div className="flex-1 bg-muted rounded h-2 overflow-hidden">
              <div className="h-2 rounded" style={{ width: `${(v / max) * 100}%`, backgroundColor: "#b42318" }} />
            </div>
            <span className="w-20 text-right tabular-nums">{formatHa(v, locale)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfidenceTable({
  data,
  locale,
}: {
  data: Record<string, { area_ha: number; count?: number }>;
  locale: Locale;
}) {
  const entries = Object.entries(data);
  if (!entries.length) return null;
  return (
    <div className="mt-2">
      <div className="text-xs text-muted-foreground mb-1">{labelOf("by_confidence", locale)}</div>
      <table className="w-full text-xs">
        <tbody>
          {entries.map(([conf, val]) => (
            <tr key={conf} className="border-t border-border">
              <td className="py-1 capitalize">{conf}</td>
              <td className="py-1 text-right tabular-nums">{formatHa(val.area_ha ?? 0, locale)}</td>
              {typeof val.count === "number" && (
                <td className="py-1 text-right tabular-nums text-muted-foreground">{formatCount(val.count, locale)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// chaves escalares numéricas mostradas como KV
const SCALAR_HA = ["loss_post_2020_ha", "total_loss_ha", "alerts_high_area_ha", "total_area_ha", "prodes_intersection_ha", "de_minimis_ha"];
const SCALAR_COUNT = ["alerts_high", "alerts_nominal", "cars_matched"];

function SourceDetails({ source, locale }: { source: EudrSourceN; locale: Locale }) {
  const d = source.details;
  return (
    <div className="mt-2 space-y-1">
      {SCALAR_HA.filter((k) => typeof d[k] === "number").map((k) => (
        <div key={k} className="flex justify-between text-sm">
          <span className="text-muted-foreground">{labelOf(k, locale)}</span>
          <span className="tabular-nums">{formatHa(d[k] as number, locale)}</span>
        </div>
      ))}
      {SCALAR_COUNT.filter((k) => typeof d[k] === "number").map((k) => (
        <div key={k} className="flex justify-between text-sm">
          <span className="text-muted-foreground">{labelOf(k, locale)}</span>
          <span className="tabular-nums">{formatCount(d[k] as number, locale)}</span>
        </div>
      ))}
      {d.by_year && <YearBars data={d.by_year} locale={locale} />}
      {d.by_confidence && <ConfidenceTable data={d.by_confidence} locale={locale} />}
    </div>
  );
}

function SourceCard({ source, locale }: { source: EudrSourceN; locale: Locale }) {
  const st = STATUS[source.status];
  const open = source.status === "FAIL" || source.status === "WARNING";
  return (
    <Card>
      <CardContent className="p-4">
        <details open={open}>
          <summary className="flex items-center justify-between gap-2 cursor-pointer list-none">
            <span className="font-semibold text-sm">{source.name}</span>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
              style={{ color: st.color, backgroundColor: st.bg }}
            >
              {st.label[locale]}
            </span>
          </summary>
          <p className="text-sm text-foreground/80 mt-2">{sourceMessage(source, locale)}</p>
          <SourceDetails source={source} locale={locale} />
          {source.evidence?.url && (
            <a
              href={source.evidence.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs mt-2 text-primary hover:underline"
            >
              {source.evidence.dataSource || source.evidence.url}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {source.evidence?.lastUpdate && (
            <div className="text-xs text-muted-foreground mt-1">
              {locale === "en" ? "Updated" : "Atualizado"} {source.evidence.lastUpdate}
            </div>
          )}
        </details>
      </CardContent>
    </Card>
  );
}

// ── Metodologia (texto fixo por fonte presente) ───────────────────────────
const METHODOLOGY: Record<string, Record<Locale, string>> = {
  hansen: {
    "pt-BR": "Perda anual de cobertura arbórea (30 m) desde 2000, derivada de Landsat. Detecta desmate acumulado e pós-2020.",
    en: "Annual tree cover loss (30 m) since 2000 from Landsat. Detects accumulated and post-2020 deforestation.",
  },
  gfw_integrated: {
    "pt-BR": "Alertas quase em tempo real combinando GLAD-L (Landsat), GLAD-S2 (Sentinel-2) e RADD (radar Sentinel-1). Aplica limiar de minimis pra filtrar ruído.",
    en: "Near-real-time alerts combining GLAD-L (Landsat), GLAD-S2 (Sentinel-2) and RADD (Sentinel-1 radar). Applies a de minimis threshold to filter noise.",
  },
  car_prodes: {
    "pt-BR": "Interseção do polígono com alertas PRODES/INPE dentro do CAR. Específico do Brasil.",
    en: "Intersection of the polygon with PRODES/INPE alerts inside the CAR. Brazil-specific.",
  },
  polygon_car_match: {
    "pt-BR": "Quantos CARs registrados sobrepõem o polígono (rastreabilidade fundiária).",
    en: "How many registered CARs overlap the polygon (land traceability).",
  },
};

function MethodologyBlock({ sources, locale }: { sources: EudrSourceN[]; locale: Locale }) {
  const keys = Array.from(new Set(sources.map((s) => s.key))).filter((k) => METHODOLOGY[k]);
  const glossary =
    locale === "en"
      ? [
          ["PASS", "no relevant post-2020 deforestation in that source."],
          ["WARNING", "evidence below the de minimis threshold — likely noise; manual review (does not fail alone)."],
          ["FAIL", "post-2020 deforestation above the threshold → EUDR non-compliance."],
          ["N/A", "source not applicable to the region."],
          ["Unavailable", "source down at check time (≠ fail; re-run)."],
        ]
      : [
          ["OK", "sem indício relevante de desmate pós-2020 naquela fonte."],
          ["Atenção", "indício abaixo do limiar de minimis — provável ruído; revisão manual (não reprova sozinho)."],
          ["Reprovado", "desmate pós-2020 acima do limiar → não-conformidade EUDR."],
          ["N/A", "fonte não se aplica à região."],
          ["Indisponível", "fonte fora do ar na checagem (≠ reprovado; re-rodar)."],
        ];
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-semibold text-sm mb-2">{locale === "en" ? "Methodology & confidence" : "Metodologia e confiança"}</h3>
        <div className="space-y-2">
          {keys.map((k) => {
            const name = sources.find((s) => s.key === k)?.name ?? k;
            return (
              <div key={k} className="text-xs">
                <span className="font-semibold">{name}.</span>{" "}
                <span className="text-muted-foreground">{METHODOLOGY[k][locale]}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 pt-3 border-t border-border space-y-1">
          {glossary.map(([k, v]) => (
            <div key={k} className="text-xs">
              <span className="font-semibold">{k}</span> — <span className="text-muted-foreground">{v}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Audit log ─────────────────────────────────────────────────────────────
function AuditLog({ sources, locale }: { sources: EudrSourceN[]; locale: Locale }) {
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-semibold text-sm mb-2">{locale === "en" ? "Audit log" : "Trilha de auditoria"}</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{locale === "en" ? "Source" : "Fonte"}</TableHead>
              <TableHead>{locale === "en" ? "Status" : "Status"}</TableHead>
              <TableHead>Dataset</TableHead>
              <TableHead>{locale === "en" ? "Updated" : "Atualizado"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.map((s) => (
              <TableRow key={s.key}>
                <TableCell className="text-xs">{s.name}</TableCell>
                <TableCell className="text-xs" style={{ color: STATUS[s.status].color }}>
                  {STATUS[s.status].label[locale]}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{s.evidence?.dataSource ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{s.evidence?.lastUpdate ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ── Orquestrador ──────────────────────────────────────────────────────────
export function EudrReportView({
  data,
  locale,
  onDownloadPdf,
}: {
  data: EudrReportData;
  locale: Locale;
  onDownloadPdf?: () => void;
}) {
  return (
    <div className="space-y-4">
      <VerdictBanner data={data} locale={locale} onDownloadPdf={onDownloadPdf} />
      <div className="grid gap-4 md:grid-cols-2">
        <EudrMap
          geometry={data.metadata.geometry}
          areaHa={data.metadata.areaHa}
          alertOverlay={data.metadata.alertOverlay}
          locale={locale}
          className="h-[280px] md:h-full md:min-h-[320px]"
        />
        <div className="space-y-3">
          {data.sources.map((s) => (
            <SourceCard key={s.key} source={s} locale={locale} />
          ))}
        </div>
      </div>
      <MethodologyBlock sources={data.sources} locale={locale} />
      <AuditLog sources={data.sources} locale={locale} />
    </div>
  );
}

export function EudrReportSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-[280px] w-full rounded-xl" />
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
