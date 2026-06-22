import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Loader2, AlertCircle, Coins } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import { getEudrPolygonReport } from "@/lib/api/products";
import {
  normalizeCheckReport,
  coerceLocale,
  type EudrReportData,
  type Locale,
} from "@/lib/eudr-report";
import { EudrReportView, EudrReportSkeleton } from "@/components/eudr/EudrReportView";
import { downloadEudrReportPdf } from "@/lib/eudr-report-pdf";

const COPY = {
  "pt-BR": {
    title: "Análise de desmatamento por polígono (EUDR)",
    subtitle: "Cole um polígono (GeoJSON) e rode a análise. Consome créditos do workspace.",
    region: "Região (ajusta as fontes)",
    regionHint: "Só muda as fontes pra BR (adiciona PRODES/CAR). Fora do BR, o satélite (Hansen + GFW) roda igual.",
    geojson: "GeoJSON (Polygon, Feature ou FeatureCollection)",
    examples: "Exemplos pelo mundo",
    run: "Analisar",
    running: "Analisando…",
    empty: "Informe um polígono e rode a análise — o report aparece aqui.",
    invalid: "GeoJSON inválido. Confira a geometria.",
    errTemp: "Falha temporária ao consultar as fontes. Tente de novo.",
    errGeom: "Não foi possível ler o polígono. Confira a geometria.",
    noCredits: "Você precisa de créditos para rodar esta análise.",
    notProvisioned: "Workspace ainda não provisionado para análises. Fale com a DeFarm.",
    inactive: "Workspace inativo para análises. Fale com a DeFarm.",
    charged: "Créditos consumidos",
    balance: "saldo",
  },
  en: {
    title: "Polygon deforestation analysis (EUDR)",
    subtitle: "Paste a polygon (GeoJSON) and run the analysis. Consumes workspace credits.",
    region: "Region (adjusts sources)",
    regionHint: "Only changes sources for BR (adds PRODES/CAR). Outside BR, satellite (Hansen + GFW) runs the same.",
    geojson: "GeoJSON (Polygon, Feature or FeatureCollection)",
    examples: "Examples worldwide",
    run: "Analyze",
    running: "Analyzing…",
    empty: "Provide a polygon and run the analysis — the report shows here.",
    invalid: "Invalid GeoJSON. Check the geometry.",
    errTemp: "Temporary failure querying the sources. Try again.",
    errGeom: "Could not read the polygon. Check the geometry.",
    noCredits: "You need credits to run this analysis.",
    notProvisioned: "Workspace not yet provisioned for analyses. Contact DeFarm.",
    inactive: "Workspace inactive for analyses. Contact DeFarm.",
    charged: "Credits used",
    balance: "balance",
  },
} as const;

const REGIONS = ["*", "ID", "MY", "VN", "TH", "CI", "GH", "CM", "NG", "BR"];

function box(lon: number, lat: number, d: number) {
  return {
    type: "Polygon",
    coordinates: [[[lon, lat], [lon + d, lat], [lon + d, lat + d], [lon, lat + d], [lon, lat]]],
  };
}
const EXAMPLES = [
  { label: "🟢 Amazônia central (conforme)", country: "*", geom: box(-64.5, -3.0, 0.01) },
  { label: "🟡 PN do Jaú (limítrofe)", country: "*", geom: box(-62.05, -1.95, 0.03) },
  { label: "🇮🇩 Sumatra (palma)", country: "ID", geom: box(101.5, 0.5, 0.05) },
  { label: "🇧🇷 Pará (arco do desmate)", country: "BR", geom: box(-51.5, -3.5, 0.05) },
  { label: "🇨🇮 Costa do Marfim (cacau)", country: "CI", geom: box(-7.0, 5.8, 0.05) },
];

export default function EudrPolygonReport() {
  const { i18n } = useTranslation();
  const locale: Locale = coerceLocale(i18n.language);
  const c = COPY[locale];

  const [geojson, setGeojson] = useState("");
  const [country, setCountry] = useState("*");
  const [parseError, setParseError] = useState<string | null>(null);
  const [funnel, setFunnel] = useState<string | null>(null);
  const [data, setData] = useState<EudrReportData | null>(null);

  const mutation = useMutation({
    mutationFn: async (vars: { geometry: unknown; country: string }) =>
      getEudrPolygonReport(vars.geometry, vars.country),
    onMutate: () => {
      setParseError(null);
      setFunnel(null);
      setData(null);
    },
    onSuccess: (resp, vars) => {
      if (!resp.ok) {
        const map: Record<string, string> = {
          insufficient_credits: c.noCredits,
          not_provisioned: c.notProvisioned,
          inactive: c.inactive,
        };
        setFunnel(map[resp.reason ?? ""] ?? c.errTemp);
        return;
      }
      if (resp.report) {
        setData(normalizeCheckReport(resp.report, vars.geometry, vars.country));
      }
    },
  });

  function run() {
    setParseError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(geojson);
    } catch {
      setParseError(c.invalid);
      return;
    }
    mutation.mutate({ geometry: parsed, country });
  }

  function pickExample(ex: (typeof EXAMPLES)[number]) {
    setGeojson(JSON.stringify(ex.geom));
    setCountry(ex.country);
    setParseError(null);
  }

  const httpErr = mutation.error as ApiError | null;
  const httpMsg = httpErr ? (httpErr.status === 400 ? c.errGeom : c.errTemp) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{c.title}</h1>
        <p className="text-muted-foreground text-sm mt-1">{c.subtitle}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{c.geojson}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="region" className="text-xs uppercase text-muted-foreground">
                {c.region}
              </Label>
              <select
                id="region"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r === "*" ? (locale === "en" ? "Global (non-BR)" : "Global (não-BR)") : r}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">{c.regionHint}</p>
            </div>

            <div>
              <Label className="text-xs uppercase text-muted-foreground">{c.examples}</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex.label}
                    type="button"
                    onClick={() => pickExample(ex)}
                    className="text-xs font-medium px-2.5 py-1 rounded-full border border-border hover:border-primary hover:text-primary transition-colors"
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="geo" className="text-xs uppercase text-muted-foreground">
                {c.geojson}
              </Label>
              <Textarea
                id="geo"
                value={geojson}
                onChange={(e) => setGeojson(e.target.value)}
                placeholder='{"type":"Polygon","coordinates":[[[101.5,0.5],[101.55,0.5],[101.55,0.55],[101.5,0.55],[101.5,0.5]]]}'
                className="mt-1 min-h-[180px] font-mono text-xs"
              />
            </div>

            <Button onClick={run} disabled={mutation.isPending || !geojson.trim()} className="w-full">
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> {c.running}
                </>
              ) : (
                c.run
              )}
            </Button>
            {parseError && <p className="text-sm text-destructive">{parseError}</p>}
          </CardContent>
        </Card>

        {/* Resultado */}
        <div>
          {mutation.isPending && <EudrReportSkeleton />}

          {!mutation.isPending && funnel && (
            <Card className="border-amber-300">
              <CardContent className="p-6 flex items-start gap-3">
                <Coins className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{funnel}</p>
                  <a href="/contato" className="text-sm text-primary hover:underline mt-1 inline-block">
                    {locale === "en" ? "Talk to DeFarm" : "Falar com a DeFarm"}
                  </a>
                </div>
              </CardContent>
            </Card>
          )}

          {!mutation.isPending && httpMsg && !funnel && (
            <Card className="border-destructive/40">
              <CardContent className="p-6 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{httpMsg}</p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={run}>
                    {locale === "en" ? "Try again" : "Tentar de novo"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!mutation.isPending && data && (
            <>
              {typeof mutation.data?.charged_credits === "number" && mutation.data.charged_credits > 0 && (
                <p className="text-xs text-muted-foreground mb-2">
                  {c.charged}: {mutation.data.charged_credits}
                  {typeof mutation.data.balance_remaining === "number"
                    ? ` · ${c.balance}: ${mutation.data.balance_remaining}`
                    : ""}
                </p>
              )}
              <EudrReportView
                data={data}
                locale={locale}
                onDownloadPdf={() => downloadEudrReportPdf(data, locale)}
              />
            </>
          )}

          {!mutation.isPending && !data && !funnel && !httpMsg && (
            <Card>
              <CardContent className="p-10 text-center text-muted-foreground">{c.empty}</CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
