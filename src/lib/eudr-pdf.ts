import type { EudrStatement } from "./api/products";

// Gerador do PDF formal da DDS (EUDR), compartilhado entre a verificação pública
// (/eudr/v/:dfid — sempre mascarado) e o "Minhas DDS" logado (que pode pedir o
// PDF COMPLETO via /full, passando operatorOverride com o CNPJ/CPF cru). Por
// padrão usa o que está no statement (mascarado); só revela cru quando o backend
// autorizou e o chamador passou operatorOverride/previousParties.

export interface EudrPdfLabels {
  title: string;
  generated: string;
  ready: string;
  partial: string;
  share_t: string;
  origin_t: string;
  dd_t: string;
  proof_t: string;
  proof_tx: string;
  proof_cid: string;
  note: string;
  operator: string; // rótulo "Operador"
}

export interface RawParty {
  identifier_type: string;
  identifier: string;
  role: string;
  car?: string | null;
}

export interface EudrPdfOptions {
  statement: EudrStatement;
  dfid: string;
  emittedAt: string; // já formatado (ex.: "2026-06-17 23:59Z")
  labels: EudrPdfLabels;
  qrDataUrl?: string;
  /** CNPJ/CPF cru do operador atual (export PLENO autorizado). Sem ele, usa o mascarado. */
  operatorOverride?: string;
  /** Donos/operadores anteriores crus (só admin/autoridade). */
  previousParties?: RawParty[];
}

export async function downloadEudrPdf(opts: EudrPdfOptions): Promise<void> {
  const { statement: stmt, dfid, emittedAt, labels: L, qrDataUrl, operatorOverride, previousParties } = opts;
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;
  let y = M;
  const line = (txt: string, size = 10, bold = false, color = "#1c1917") => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(color);
    for (const ln of doc.splitTextToSize(txt, W - M * 2)) {
      if (y > doc.internal.pageSize.getHeight() - M) {
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

  doc.setFillColor("#1e6b46");
  doc.rect(0, 0, W, 6, "F");
  line("DeFarm", 18, true, "#1e6b46");
  line(L.title, 12, true);
  line(`DFID: ${dfid}`, 10);
  line(
    `${L.generated}: ${emittedAt}  ·  ${stmt.eudr_ready ? L.ready : L.partial}`,
    10,
    false,
    stmt.eudr_ready ? "#1e6b46" : "#b45309",
  );
  y += 6;
  rule();

  const verifyUrl = `https://defarm.net/eudr/v/${encodeURIComponent(dfid)}`;
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, "PNG", W - M - 96, y, 96, 96);
    } catch {
      /* ignore */
    }
  }
  line(L.share_t, 11, true);
  line(verifyUrl, 9, false, "#1e6b46");
  y += 84;
  rule();

  // Origem (CARs — origem + trajetória)
  line(L.origin_t, 12, true);
  for (const o of stmt.origin || []) {
    const c = o.compliance;
    line(`CAR ${o.car}${o.area_ha ? ` · ${o.area_ha} ha` : ""}`, 10, true);
    if (c)
      line(
        `${c.status === "ok" ? "COMPLIANT" : c.summary || c.status}${c.score != null ? ` · ${c.score}` : ""}`,
        10,
        false,
        c.status === "ok" ? "#1e6b46" : "#b45309",
      );
  }
  y += 4;
  rule();

  // Trilho de due diligence
  line(L.dd_t, 12, true);
  for (const dd of stmt.due_diligence || []) {
    line(
      `${dd.identifier_type}: ${dd.identifier}${dd.verdict ? `  →  ${dd.verdict}${dd.score != null ? ` · ${dd.score}` : ""}` : ""}`,
      10,
      true,
    );
    for (const ch of dd.checks || []) line(`   • ${ch.source} — ${ch.status}`, 9, false, "#57534e");
  }
  // Operador: cru quando autorizado (operatorOverride), senão o mascarado do statement.
  if (stmt.operator) {
    const id = operatorOverride || stmt.operator.identifier;
    line(`${L.operator}: ${stmt.operator.identifier_type} ${id} (${stmt.operator.role})`, 9, false, "#57534e");
  }
  for (const p of previousParties || []) {
    line(`${L.operator} (anterior): ${p.identifier_type} ${p.identifier} (${p.role})${p.car ? ` · ${p.car}` : ""}`, 9, false, "#57534e");
  }
  y += 4;
  rule();

  // Imutabilidade
  line(L.proof_t, 12, true);
  line(`${L.proof_tx}: ${stmt.immutability.anchor_tx || "—"}`, 9, false, "#57534e");
  line(`${L.proof_cid}: ${stmt.immutability.latest_cid || "—"}`, 9, false, "#57534e");
  line(`Chain: ${stmt.immutability.chain || "stellar"} · ${stmt.immutability.anchor_status || ""}`, 9, false, "#57534e");
  y += 8;
  line(L.note, 8, false, "#78716c");

  const suffix = operatorOverride ? "-completo" : "";
  doc.save(`DDS-EUDR-${dfid}${suffix}.pdf`);
}
