/* Números e datas pt-BR conforme copy-deck regra 7: `14.280` · `R$ 4.812,00` · `12 set` / `12 set 2026` · `14:32`. */
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function fmtNum(n: number): string {
  return new Intl.NumberFormat("pt-BR").format(n);
}

export function fmtDate(iso: string, withYear = true): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dia = d.getDate();
  const mes = MESES[d.getMonth()];
  return withYear ? `${dia} ${mes} ${d.getFullYear()}` : `${dia} ${mes}`;
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${fmtDate(iso)}, ${hh}:${mm}`;
}

/** "há 2 h", "há 3 dias": para o badge de prova viva. */
export function fmtAgo(iso: string, now = Date.now()): string {
  const ms = now - new Date(iso).getTime();
  const h = Math.floor(ms / 3600000);
  if (h < 1) return "há minutos";
  if (h < 48) return `há ${h} h`;
  return `há ${Math.floor(h / 24)} dias`;
}
