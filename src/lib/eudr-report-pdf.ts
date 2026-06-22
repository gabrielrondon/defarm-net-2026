// PDF do report de análise de polígono (EUDR) — artefato baixável pro auditor/BV.
// Modelado do EudrReportData (não da DDS; o DDS tem o downloadEudrPdf separado).
// Reusa o estilo visual (barra verde, line/rule) do gerador da DDS.
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
} from "./eudr-report";

const SCALAR_HA = ["loss_post_2020_ha", "total_loss_ha", "alerts_high_area_ha", "total_area_ha", "prodes_intersection_ha", "de_minimis_ha"];
const SCALAR_COUNT = ["alerts_high", "alerts_nominal", "cars_matched"];

export async function downloadEudrReportPdf(data: EudrReportData, locale: Locale): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  let y = M;
  const line = (txt: string, size = 10, bold = false, color = "#1c1917") => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(color);
    for (const ln of doc.splitTextToSize(txt, W - M * 2)) {
      if (y > H - M) {
        doc.addPage();
        y = M;
      }
      doc.text(ln, M, y);
      y += size + 4;
    }
  };
  const rule = () => {
    doc.setDrawColor("#e7e5e4");
    doc.line(M, y, W - M, y);
    y += 12;
  };

  const v = VERDICT[data.verdict];
  const t = (pt: string, en: string) => (locale === "en" ? en : pt);

  doc.setFillColor("#1e6b46");
  doc.rect(0, 0, W, 6, "F");
  line("DeFarm", 18, true, "#1e6b46");
  line(t("Análise de Desmatamento por Polígono (EUDR)", "Polygon Deforestation Analysis (EUDR)"), 12, true);
  y += 4;

  // Veredito
  line(v.label[locale], 14, true, v.color);
  line(verdictPhrase(data, locale), 10);
  line(
    `${t("Score", "Score")}: ${Math.round(data.score)}/100  ·  ${t("Área", "Area")}: ${formatHa(data.metadata.areaHa, locale)}` +
      (data.metadata.country ? `  ·  ${data.metadata.country === "*" ? "Global" : data.metadata.country}` : ""),
    10,
  );
  if (data.metadata.checkId) line(`Check: ${data.metadata.checkId}`, 8, false, "#78716c");
  if (data.metadata.generatedAt) {
    const dt = new Date(data.metadata.generatedAt).toLocaleString(locale === "en" ? "en-US" : "pt-BR");
    line(`${t("Gerado em", "Generated at")}: ${dt}`, 8, false, "#78716c");
  }
  y += 6;
  rule();

  // Fontes
  line(t("Fontes consultadas", "Checked sources"), 12, true);
  for (const s of data.sources) {
    const st = STATUS[s.status];
    line(`${s.name} — ${st.label[locale]}`, 10, true, st.color);
    const msg = sourceMessage(s, locale);
    if (msg) line(msg, 9, false, "#57534e");
    const d = s.details as Record<string, unknown>;
    for (const k of SCALAR_HA) {
      if (typeof d[k] === "number") line(`   • ${labelOf(k, locale)}: ${formatHa(d[k] as number, locale)}`, 9, false, "#57534e");
    }
    for (const k of SCALAR_COUNT) {
      if (typeof d[k] === "number") line(`   • ${labelOf(k, locale)}: ${formatCount(d[k] as number, locale)}`, 9, false, "#57534e");
    }
    const by = (s as EudrSourceN).details.by_year;
    if (by) {
      const years = Object.entries(by)
        .filter(([, val]) => Number(val) > 0)
        .map(([yr, val]) => `${yr}: ${formatHa(Number(val), locale)}`)
        .join(", ");
      if (years) line(`   • ${labelOf("by_year", locale)}: ${years}`, 9, false, "#57534e");
    }
    if (s.evidence?.dataSource) line(`   ${s.evidence.dataSource}${s.evidence.lastUpdate ? ` · ${s.evidence.lastUpdate}` : ""}`, 8, false, "#78716c");
    y += 2;
  }
  y += 4;
  rule();

  line(
    t(
      "Metodologia: desmate por satélite (Hansen 30 m + GFW Integrated Alerts GLAD/RADD). Alertas confirmados abaixo do limiar de minimis são tratados como possível ruído (WARNING), não como não-conformidade. Fonte indisponível não conta como reprovação.",
      "Methodology: satellite deforestation (Hansen 30 m + GFW Integrated Alerts GLAD/RADD). Confirmed alerts below the de minimis threshold are treated as possible noise (WARNING), not non-compliance. An unavailable source does not count as a failure.",
    ),
    8,
    false,
    "#78716c",
  );

  doc.save(`EUDR-poligono-${(data.metadata.checkId || "report").slice(0, 8)}.pdf`);
}
