// Partner Request Log — captura requests/responses da API parceira para
// exibir no portal do parceiro como histórico de interações.

export interface PartnerRequestLogEntry {
  id: string;
  timestamp: string;
  method: string;
  endpoint: string;
  status: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  durationMs: number;
  requestBody: string | null;
  /** Resumo curto do body de resposta (para não estourar memória) */
  responseSummary: string | null;
  responseBody: string | null;
}

const MAX_ENTRIES = 200;
let entries: PartnerRequestLogEntry[] = [];
let listeners: Array<() => void> = [];
const STORAGE_KEY = "defarm_partner_request_log";

function loadFromStorage() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    entries = parsed
      .filter((e) => e && typeof e === "object" && typeof e.id === "string")
      .slice(0, MAX_ENTRIES);
    const highest = entries.reduce((max, e) => Math.max(max, Number(e.id) || 0), 0);
    nextId = highest + 1;
  } catch {
    // ignore storage parse errors
  }
}

function saveToStorage() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore quota/storage errors
  }
}

function notify() {
  for (const fn of listeners) fn();
}

let nextId = 1;
loadFromStorage();

export function addLogEntry(entry: Omit<PartnerRequestLogEntry, "id">) {
  entries = [{ ...entry, id: String(nextId++) }, ...entries].slice(0, MAX_ENTRIES);
  saveToStorage();
  notify();
}

export function getLogEntries(): PartnerRequestLogEntry[] {
  return entries;
}

export function clearLog() {
  entries = [];
  saveToStorage();
  notify();
}

export function subscribeLog(fn: () => void): () => void {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

/** Gera resumo curto de uma resposta JSON */
export function summarizeResponse(data: unknown): string {
  if (data == null) return "(vazio)";
  if (typeof data !== "object") return String(data).slice(0, 120);
  const obj = data as Record<string, unknown>;

  // PartnerIntakeResponse
  if (obj.summary && typeof obj.summary === "object") {
    const s = obj.summary as Record<string, unknown>;
    const dryRunPrefix = obj.dry_run === true ? "preview · " : "";
    return `${dryRunPrefix}status=${s.status} · ${s.total_rows} linhas · ${s.routes} rotas · ${s.items} itens · ${s.unresolved_rows} pendências`;
  }
  // ListRawPayloadsResponse
  if ("rows" in obj && "count" in obj) {
    return `${obj.count} registros`;
  }
  // RoutingIssuesResponse
  if ("issues" in obj && "count" in obj) {
    return `${obj.count} pendência(s)`;
  }
  // Array
  if (Array.isArray(obj)) {
    return `${obj.length} item(ns)`;
  }
  // Generic
  return JSON.stringify(obj).slice(0, 120);
}

function safeTruncate(value: string, maxLen = 12000): string {
  if (value.length <= maxLen) return value;
  return `${value.slice(0, maxLen)}... [truncado ${value.length - maxLen} chars]`;
}

export function serializeRequestBody(body: unknown): string | null {
  if (body == null) return null;
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    const fields: Array<Record<string, unknown>> = [];
    body.forEach((value, key) => {
      if (typeof File !== "undefined" && value instanceof File) {
        fields.push({
          field: key,
          kind: "file",
          name: value.name,
          size: value.size,
          type: value.type || "application/octet-stream",
        });
      } else {
        fields.push({ field: key, kind: "value", value: String(value) });
      }
    });
    return safeTruncate(JSON.stringify({ formData: fields }, null, 2));
  }
  if (typeof body === "string") {
    return safeTruncate(body);
  }
  if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) {
    return safeTruncate(body.toString());
  }
  if (typeof Blob !== "undefined" && body instanceof Blob) {
    return `Blob ${body.type || "application/octet-stream"} (${body.size} bytes)`;
  }
  try {
    return safeTruncate(JSON.stringify(body, null, 2));
  } catch {
    return safeTruncate(String(body));
  }
}

export function serializeResponseBody(data: unknown): string | null {
  if (data == null) return null;
  if (typeof data === "string") return safeTruncate(data);
  try {
    return safeTruncate(JSON.stringify(data, null, 2));
  } catch {
    return safeTruncate(String(data));
  }
}
