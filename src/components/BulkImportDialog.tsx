import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, FileText, Download, CheckCircle2, AlertTriangle, Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import {
  getCircuits,
  bulkIngestItems,
  listIngestionTemplates,
  createIngestionTemplate,
} from "@/lib/defarm-api";
import type { IngestionReceipt, IngestionTemplate } from "@/lib/api/types";

const CSV_TEMPLATE = `value_chain,country,year,sisbov,chip,lote,raca,peso,data_nasc,data_entrada,fazenda
BEEF,BR,2026,105500497219983,900264000319233,Bezerros serra,Brangus,210,10/12/2025,09/01/2026,Faz. Santa Fé
BEEF,BR,2026,105500497219984,900264000319234,Bezerros serra,Nelore,230,12/12/2025,10/01/2026,Faz. Santa Fé`;

const JSON_TEMPLATE = JSON.stringify(
  [
    {
      value_chain: "BEEF",
      country: "BR",
      year: 2026,
      metadata: {
        sisbov: "105500497219983",
        chip: "900264000319233",
        lote: "Bezerros serra",
        raca: "Brangus",
        peso: 210,
        data_nasc: "10/12/2025",
        data_entrada: "09/01/2026",
        fazenda: "Faz. Santa Fé",
      },
    },
  ],
  null,
  2
);

function downloadTemplate(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const DEFAULT_VALUE_CHAIN = "BEEF";
const DEFAULT_COUNTRY = "BR";
const PREVIEW_LIMIT = 50;
const CANONICAL_TYPES = [
  { label: "SISBOV", value: "sisbov" },
  { label: "CPF", value: "cpf" },
  { label: "CHIP", value: "chip" },
];

const TARGET_FIELDS = [
  "sisbov",
  "chip",
  "cpf",
  "cnpj",
  "ear_tag",
  "birth_date",
  "entry_date",
  "weight_kg",
  "sex",
  "lot_name",
  "zone_name",
  "origin_car",
  "source_system",
] as const;

const TARGET_LABELS: Record<string, string> = {
  sisbov: "SISBOV",
  chip: "CHIP/RFID",
  cpf: "CPF",
  cnpj: "CNPJ",
  ear_tag: "Brinco",
  birth_date: "Data de nascimento",
  entry_date: "Data de entrada",
  weight_kg: "Peso (kg)",
  sex: "Sexo",
  lot_name: "Lote",
  zone_name: "Zona/Pasto",
  origin_car: "CAR origem",
  source_system: "Sistema origem",
};

const TARGET_ALIASES: Record<string, string[]> = {
  sisbov: ["sisbov", "bnd", "bovino_id", "sis_bov"],
  chip: ["chip", "rfid", "microchip", "transponder"],
  cpf: ["cpf", "doc_cpf", "produtor_cpf"],
  cnpj: ["cnpj", "doc_cnpj"],
  ear_tag: ["brinco", "ear_tag", "etiqueta", "numero_brinco"],
  birth_date: ["birth_date", "data_nasc", "data_nascimento", "nascimento", "dt_nasc"],
  entry_date: ["entry_date", "data_entrada", "ingresso", "dt_entrada"],
  weight_kg: ["weight_kg", "peso", "peso_kg", "kg", "peso_vivo"],
  sex: ["sexo", "sex", "genero"],
  lot_name: ["lote", "lot_name", "lote_nome"],
  zone_name: ["zona", "zone_name", "pasto", "piquete"],
  origin_car: ["origin_car", "car_origem", "car"],
  source_system: ["source_system", "origem_sistema", "sistema_origem", "provider"],
};

type DetectionResult = {
  target: string;
  confidence: number;
  alternatives: Array<{ target: string; confidence: number }>;
};

const HEADER_ALIASES: Record<string, string> = {
  data_nasc: "data_nasc",
  data_nascimento: "data_nasc",
  data_de_nascimento: "data_nasc",
  data_entrada: "data_entrada",
  data_de_entrada: "data_entrada",
  data_ingresso: "data_entrada",
  data_ultima_pesagem: "data_pesagem",
  data_ultima_peso: "data_pesagem",
  data_ultima_pesagem_: "data_pesagem",
  data_pesagem: "data_pesagem",
  data_peso: "data_pesagem",
  ultima_pesagem: "data_pesagem",
  ultimo_peso: "peso",
  ultimo_peso_kg: "peso",
  peso_ultimo: "peso",
  peso_kg: "peso",
  raca: "raca",
  raça: "raca",
  sisbov: "sisbov",
  bnd: "bnd",
  chip: "chip",
  rfid: "chip",
  lote: "lote",
  numero_animal: "numero_animal",
  n_animal: "numero_animal",
  no_animal: "numero_animal",
  numero_matriz: "numero_matriz",
  no_matriz: "numero_matriz",
};

function normalizeHeader(raw: string, fallbackIndex: number): string {
  const trimmed = raw.trim();
  if (!trimmed) return `col_${fallbackIndex + 1}`;
  const noDiacritics = trimmed.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const cleaned = noDiacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!cleaned) return `col_${fallbackIndex + 1}`;
  return HEADER_ALIASES[cleaned] ?? cleaned;
}

function dedupeHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((h) => {
    const count = seen.get(h) ?? 0;
    seen.set(h, count + 1);
    return count === 0 ? h : `${h}_${count + 1}`;
  });
}

function scoreHeaderToTarget(header: string, target: string): number {
  const normalized = normalizeHeader(header, 0);
  const aliases = TARGET_ALIASES[target] ?? [];
  if (normalized === target) return 1.0;
  if (aliases.includes(normalized)) return 0.95;
  if (normalized.includes(target) || target.includes(normalized)) return 0.8;
  const tokenHit = aliases.some(
    (alias) =>
      alias.length >= 4 &&
      (normalized.includes(alias) || alias.includes(normalized))
  );
  if (tokenHit) return 0.7;
  return 0;
}

function detectMappingForHeader(header: string): DetectionResult | null {
  const ranked = TARGET_FIELDS.map((target) => ({
    target,
    confidence: scoreHeaderToTarget(header, target),
  }))
    .filter((entry) => entry.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence);

  if (!ranked.length) return null;
  return {
    target: ranked[0].target,
    confidence: ranked[0].confidence,
    alternatives: ranked.slice(1, 4),
  };
}

function applyColumnMapping(
  headers: string[],
  rows: string[][],
  columnMapping: Record<string, string>
): { headers: string[]; rows: string[][] } {
  const mappedHeaders = headers.map((h) => {
    const mapped = columnMapping[h];
    return mapped && mapped !== "__ignore__" ? mapped : h;
  });
  return { headers: dedupeHeaders(mappedHeaders), rows };
}

function detectHeaderRow(rows: string[][]): number {
  let bestIndex = -1;
  let bestScore = -1;
  const keywords = ["sisbov", "data", "chip", "lote", "raca", "peso", "nasc"];

  rows.forEach((row, index) => {
    const nonEmpty = row.filter((cell) => cell.trim().length > 0).length;
    if (nonEmpty < 3) return;
    const normalizedRow = row.map((cell, idx) => normalizeHeader(cell, idx));
    const keywordHits = normalizedRow.filter((cell) =>
      keywords.some((k) => cell.includes(k))
    ).length;
    const score = nonEmpty + keywordHits * 2;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function csvEscape(value: string): string {
  if (value.includes("\"") || value.includes(",") || value.includes("\n")) {
    return `"${value.replace(/\"/g, "\"\"")}"`;
  }
  return value;
}

function rowsToCsv(headers: string[], rows: string[][]): string {
  const lines = [];
  lines.push(headers.map(csvEscape).join(","));
  for (const row of rows) {
    const normalizedRow = headers.map((_, idx) => csvEscape(row[idx] ?? ""));
    lines.push(normalizedRow.join(","));
  }
  return lines.join("\n");
}

function buildIdempotencyKey(file: File | null, circuitId: string): string {
  if (!file) return `bulk-${circuitId}-${Date.now()}`;
  const base = `${circuitId}:${file.name}:${file.size}:${file.lastModified}`;
  return `bulk-${base}`.slice(0, 120);
}

function detectDelimiter(lines: string[]): string {
  const sample = lines.filter((line) => line.trim().length > 0).slice(0, 20);
  const countDelim = (line: string, delimiter: string): number => {
    let inQuotes = false;
    let count = 0;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === "\"") {
        const nextChar = line[i + 1];
        if (inQuotes && nextChar === "\"") {
          i += 1;
          continue;
        }
        inQuotes = !inQuotes;
      } else if (ch === delimiter && !inQuotes) {
        count += 1;
      }
    }
    return count;
  };
  const counts = [
    { d: ";", c: sample.reduce((acc, line) => acc + countDelim(line, ";"), 0) },
    { d: ",", c: sample.reduce((acc, line) => acc + countDelim(line, ","), 0) },
    { d: "\t", c: sample.reduce((acc, line) => acc + countDelim(line, "\t"), 0) },
  ];
  counts.sort((a, b) => b.c - a.c);
  return counts[0].c > 0 ? counts[0].d : ",";
}

function decodeTextFromArrayBuffer(buffer: ArrayBuffer): { text: string; binary: boolean } {
  const bytes = new Uint8Array(buffer);
  // Heuristic: if there are many null bytes, treat as binary Excel
  const nullCount = bytes.reduce((acc, b) => (b === 0 ? acc + 1 : acc), 0);
  if (nullCount > 0) {
    return { text: "", binary: true };
  }

  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  if (utf8.includes("\uFFFD")) {
    const latin = new TextDecoder("windows-1252", { fatal: false }).decode(buffer);
    return { text: latin, binary: false };
  }
  return { text: utf8, binary: false };
}

function parseCsvText(text: string) {
  const normalizedText = text.replace(/^\uFEFF/, "");
  const lines = normalizedText.split(/\r?\n/);
  const delimiter = detectDelimiter(lines);
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < normalizedText.length; i += 1) {
    const char = normalizedText[i];
    const nextChar = normalizedText[i + 1];

    if (char === "\"") {
      if (inQuotes && nextChar === "\"") {
        current += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i += 1;
      }
      row.push(current);
      if (row.some((cell) => cell.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  row.push(current);
  if (row.some((cell) => cell.trim().length > 0)) {
    rows.push(row);
  }

  return { rows, delimiter };
}

function ensureDefaults(
  headers: string[],
  rows: string[][]
): { headers: string[]; rows: string[][] } {
  const headerSet = new Set(headers);
  let updatedHeaders = [...headers];
  if (!headerSet.has("value_chain")) {
    updatedHeaders = ["value_chain", ...updatedHeaders];
    rows = rows.map((row) => [DEFAULT_VALUE_CHAIN, ...row]);
  }
  if (!headerSet.has("country")) {
    const idx = updatedHeaders.indexOf("value_chain");
    updatedHeaders = [
      ...updatedHeaders.slice(0, idx + 1),
      "country",
      ...updatedHeaders.slice(idx + 1),
    ];
    rows = rows.map((row) => {
      const copy = [...row];
      copy.splice(idx + 1, 0, DEFAULT_COUNTRY);
      return copy;
    });
  }
  return { headers: updatedHeaders, rows };
}

function applyCanonicalOverride(
  headers: string[],
  rows: string[][],
  canonicalColumn?: string,
  canonicalType?: string
): { headers: string[]; rows: string[][] } {
  if (!canonicalColumn || !canonicalType) {
    return { headers, rows };
  }
  const index = headers.indexOf(canonicalColumn);
  if (index < 0) {
    return { headers, rows };
  }
  const updatedHeaders = [...headers];
  updatedHeaders[index] = canonicalType;
  return { headers: updatedHeaders, rows };
}

function buildCsvFromObjects(objects: Array<Record<string, any>>): string {
  const rows: Record<string, string>[] = objects.map((item) => {
    const row: Record<string, string> = {};
    Object.entries(item).forEach(([key, value]) => {
      if (value == null) return;
      if (key === "metadata" && typeof value === "object" && !Array.isArray(value)) {
        Object.entries(value).forEach(([metaKey, metaValue]) => {
          if (metaValue == null) return;
          row[normalizeHeader(metaKey, 0)] = String(metaValue);
        });
        return;
      }
      if (key === "identifiers" && Array.isArray(value)) {
        value.forEach((identifier: any) => {
          const type = identifier?.identifier_type || identifier?.type;
          const val = identifier?.value;
          if (type && val != null) {
            row[normalizeHeader(String(type), 0)] = String(val);
          }
        });
        return;
      }
      row[normalizeHeader(key, 0)] = String(value);
    });

    if (!row.value_chain) row.value_chain = DEFAULT_VALUE_CHAIN;
    if (!row.country) row.country = DEFAULT_COUNTRY;
    return row;
  });

  const headerSet = new Set<string>();
  rows.forEach((row) => Object.keys(row).forEach((key) => headerSet.add(key)));
  const orderedHeaders = [
    "value_chain",
    "country",
    "year",
    ...Array.from(headerSet).filter(
      (h) => h !== "value_chain" && h !== "country" && h !== "year"
    ),
  ];

  const dataRows = rows.map((row) => orderedHeaders.map((h) => row[h] ?? ""));
  const { headers, rows: normalizedRows } = ensureDefaults(
    dedupeHeaders(orderedHeaders),
    dataRows
  );
  return rowsToCsv(headers, normalizedRows);
}

async function fileToCsv(
  file: File,
  canonicalColumn?: string,
  canonicalType?: string
): Promise<File> {
  const fileName = file.name.toLowerCase();
  const isJson = fileName.endsWith(".json");
  const isExcel = fileName.endsWith(".xls") || fileName.endsWith(".xlsx");

  if (isJson) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const items = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.items)
      ? parsed.items
      : [];
    if (!items.length) {
      throw new Error("JSON inválido: informe um array de itens.");
    }
    const csv = buildCsvFromObjects(items);
    const { rows } = parseCsvText(csv);
    const headers = rows[0] ?? [];
    const dataRows = rows.slice(1);
    const normalized = applyCanonicalOverride(headers, dataRows, canonicalColumn, canonicalType);
    const finalCsv = rowsToCsv(normalized.headers, normalized.rows);
    return new File([finalCsv], file.name.replace(/\.json$/i, ".csv"), { type: "text/csv" });
  }

  const buffer = await file.arrayBuffer();
  const decoded = decodeTextFromArrayBuffer(buffer);
  if (decoded.binary && isExcel) {
    throw new Error("Planilha Excel binária detectada. Exporte para CSV e tente novamente.");
  }
  const text = decoded.text || new TextDecoder("utf-8").decode(buffer);
  const { rows } = parseCsvText(text);
  const headerIndex = detectHeaderRow(rows);
  if (headerIndex < 0) {
    if (isExcel) {
      throw new Error("Planilha Excel detectada. Por favor exporte para CSV e tente novamente.");
    }
    return file;
  }
  const rawHeaders = rows[headerIndex];
  const normalizedHeaders = dedupeHeaders(
    rawHeaders.map((h, idx) => normalizeHeader(h, idx))
  );
  const dataRows = rows
    .slice(headerIndex + 1)
    .filter((row) => row.some((cell) => cell.trim().length > 0));
  const { headers, rows: normalizedRows } = ensureDefaults(normalizedHeaders, dataRows);
  const canonicalized = applyCanonicalOverride(headers, normalizedRows, canonicalColumn, canonicalType);
  const csv = rowsToCsv(canonicalized.headers, canonicalized.rows);
  return new File([csv], file.name.replace(/\.csv$/i, ".csv"), { type: "text/csv" });
}

async function buildPreview(file: File) {
  const fileName = file.name.toLowerCase();
  const isJson = fileName.endsWith(".json");
  const isExcel = fileName.endsWith(".xls") || fileName.endsWith(".xlsx");

  if (isJson) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const items = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.items)
      ? parsed.items
      : [];
    if (!items.length) {
      throw new Error("JSON inválido: informe um array de itens.");
    }
    const csv = buildCsvFromObjects(items);
    const { rows } = parseCsvText(csv);
    const headerIndex = 0;
    const headers = rows[headerIndex] ?? [];
    const dataRows = rows.slice(headerIndex + 1);
    return { headers, rows: dataRows, totalRows: dataRows.length };
  }

  const buffer = await file.arrayBuffer();
  const decoded = decodeTextFromArrayBuffer(buffer);
  if (decoded.binary && isExcel) {
    throw new Error("Planilha Excel binária detectada. Exporte para CSV e tente novamente.");
  }
  const text = decoded.text || new TextDecoder("utf-8").decode(buffer);
  const { rows } = parseCsvText(text);
  const headerIndex = detectHeaderRow(rows);
  if (headerIndex < 0) {
    if (isExcel) {
      throw new Error("Planilha Excel detectada. Por favor exporte para CSV e tente novamente.");
    }
    throw new Error("Não foi possível localizar o cabeçalho do CSV.");
  }
  const rawHeaders = rows[headerIndex];
  const normalizedHeaders = dedupeHeaders(
    rawHeaders.map((h, idx) => normalizeHeader(h, idx))
  );
  const dataRows = rows
    .slice(headerIndex + 1)
    .filter((row) => row.some((cell) => cell.trim().length > 0));
  const { headers, rows: normalizedRows } = ensureDefaults(normalizedHeaders, dataRows);
  return { headers, rows: normalizedRows, totalRows: normalizedRows.length };
}

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface PreviewData {
  headers: string[];
  rows: string[][];
  preparedFile: File;
}

export function BulkImportDialog({ open, onOpenChange, onSuccess }: BulkImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [circuitId, setCircuitId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [receipt, setReceipt] = useState<IngestionReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [canonicalColumn, setCanonicalColumn] = useState("");
  const [canonicalType, setCanonicalType] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [detectionMap, setDetectionMap] = useState<Record<string, DetectionResult>>({});
  const [ambiguousHeaders, setAmbiguousHeaders] = useState<string[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [templateSourceHint, setTemplateSourceHint] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: circuits = [] } = useQuery({
    queryKey: ["circuits"],
    queryFn: () => getCircuits(),
    enabled: open,
  });

  const { data: templates = [], refetch: refetchTemplates } = useQuery({
    queryKey: ["ingestion-templates"],
    queryFn: () => listIngestionTemplates(),
    enabled: open,
  });

  const reset = useCallback(() => {
    setFile(null);
    setCircuitId("");
    setUploading(false);
    setReceipt(null);
    setError(null);
    setPreview(null);
    setPreviewError(null);
    setCanonicalColumn("");
    setCanonicalType("");
    setParsing(false);
    setColumnMapping({});
    setDetectionMap({});
    setAmbiguousHeaders([]);
    setTemplateName("");
    setTemplateSourceHint("");
    setSelectedTemplateId("");
    setSavingTemplate(false);
  }, []);

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (
      f &&
      (f.name.endsWith(".csv") ||
        f.name.endsWith(".json") ||
        f.name.endsWith(".xls") ||
        f.name.endsWith(".xlsx"))
    ) {
      setFile(f);
      setError(null);
    } else {
      setError("Formato inválido. Use .csv, .json, .xls ou .xlsx");
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setError(null);
    }
  };

  const applyTemplate = (template: IngestionTemplate) => {
    const mapping = (template.mapping ?? {}) as Record<string, unknown>;
    const columns = (mapping.columns ?? {}) as Record<string, string>;
    if (Object.keys(columns).length > 0) {
      setColumnMapping(columns);
    }
    if (template.canonical_type) setCanonicalType(template.canonical_type);
    if (template.canonical_column) setCanonicalColumn(template.canonical_column);
    setSelectedTemplateId(template.id);
  };

  const handleSaveTemplate = async () => {
    if (!preview) return;
    const name = templateName.trim();
    if (!name) {
      setError("Informe um nome para o template.");
      return;
    }

    setSavingTemplate(true);
    setError(null);
    try {
      const mappingPayload = {
        columns: columnMapping,
        headers: preview.headers,
      };
      await createIngestionTemplate({
        name,
        source_hint: templateSourceHint.trim() || undefined,
        canonical_type: canonicalType || undefined,
        canonical_column: canonicalColumn || undefined,
        mapping: mappingPayload,
        is_default: false,
      });
      await refetchTemplates();
      setTemplateName("");
      setTemplateSourceHint("");
    } catch (err: any) {
      setError(err?.message || "Erro ao salvar template.");
    } finally {
      setSavingTemplate(false);
    }
  };

  const handlePreview = async () => {
    if (!file || !circuitId) return;
    setParsing(true);
    setError(null);
    setPreviewError(null);
    try {
      const previewData = await buildPreview(file);
      const headers = previewData.headers || [];
      const detected: Record<string, DetectionResult> = {};
      const mapped: Record<string, string> = {};
      const ambiguous: string[] = [];

      headers.forEach((header) => {
        const result = detectMappingForHeader(header);
        if (!result) return;
        detected[header] = result;
        mapped[header] = result.target;
        const second = result.alternatives[0];
        if (
          second &&
          result.confidence >= 0.7 &&
          result.confidence - second.confidence < 0.15
        ) {
          ambiguous.push(header);
        }
      });

      setDetectionMap(detected);
      setColumnMapping(mapped);
      setAmbiguousHeaders(ambiguous);

      const headerSet = headers.map((h) => h.toLowerCase());
      const sisbovIndex = headerSet.findIndex((h) => h.includes("sisbov") || h.includes("bnd"));
      const cpfIndex = headerSet.findIndex((h) => h.includes("cpf"));
      if (!canonicalColumn && !canonicalType) {
        if (sisbovIndex >= 0) {
          setCanonicalColumn(headers[sisbovIndex]);
          setCanonicalType("sisbov");
        } else if (cpfIndex >= 0) {
          setCanonicalColumn(headers[cpfIndex]);
          setCanonicalType("cpf");
        }
      }
      if (templates.length > 0) {
        let bestTemplate: IngestionTemplate | null = null;
        let bestScore = 0;
        templates.forEach((template) => {
          const tplMapping = (template.mapping ?? {}) as Record<string, any>;
          const tplColumns = (tplMapping.columns ?? {}) as Record<string, string>;
          if (!tplColumns || Object.keys(tplColumns).length === 0) return;
          const score = headers.reduce((acc, header) => {
            return tplColumns[header] ? acc + 1 : acc;
          }, 0);
          if (score > bestScore) {
            bestScore = score;
            bestTemplate = template;
          }
        });
        if (bestTemplate && bestScore > 0) {
          applyTemplate(bestTemplate);
        }
      }
      setPreview({ ...previewData, preparedFile: file });
    } catch (err: any) {
      setPreviewError(err?.message || "Erro ao processar arquivo.");
    } finally {
      setParsing(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (!preview || !circuitId) return;
    if (!selectedTemplateId) {
      setError("Selecione um template de mapeamento antes de importar.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const mapped = applyColumnMapping(preview.headers, preview.rows, columnMapping);
      const canonicalized = applyCanonicalOverride(
        mapped.headers,
        mapped.rows,
        canonicalColumn || undefined,
        canonicalType || undefined
      );
      const csv = rowsToCsv(canonicalized.headers, canonicalized.rows);
      const prepared = new File(
        [csv],
        (file?.name || "import.csv").replace(/\.(xls|xlsx|csv|json)$/i, ".csv"),
        { type: "text/csv" }
      );
      const result = await bulkIngestItems(prepared, circuitId, {
        templateId: selectedTemplateId,
        idempotencyKey: buildIdempotencyKey(file, circuitId),
      });
      setReceipt(result);
      onSuccess?.();
    } catch (err: any) {
      setError(err?.message || "Erro ao importar arquivo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Importar Itens em Massa
          </DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV ou JSON. Planilhas Excel precisam ser exportadas para CSV.
          </DialogDescription>
        </DialogHeader>

        {receipt ? (
          /* ===== Receipt View ===== */
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20">
              <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Importação concluída</p>
                <p className="text-sm text-muted-foreground">
                  Receipt ID: <span className="font-mono text-xs">{receipt.receipt_id}</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted border border-border text-center">
                <p className="text-2xl font-bold text-foreground">{receipt.summary.rows_total}</p>
                <p className="text-xs text-muted-foreground">Linhas processadas</p>
              </div>
              <div className="p-3 rounded-lg bg-muted border border-border text-center">
                <p className="text-2xl font-bold text-primary">{receipt.summary.items_created}</p>
                <p className="text-xs text-muted-foreground">Itens criados</p>
              </div>
              <div className="p-3 rounded-lg bg-muted border border-border text-center">
                <p className="text-2xl font-bold text-foreground">{receipt.summary.items_updated}</p>
                <p className="text-xs text-muted-foreground">Itens atualizados</p>
              </div>
              <div className="p-3 rounded-lg bg-muted border border-border text-center">
                <p className="text-2xl font-bold text-foreground">{receipt.summary.events_created}</p>
                <p className="text-xs text-muted-foreground">Eventos gerados</p>
              </div>
            </div>

            {receipt.summary.unclassified_fields.length > 0 && (
              <div className="p-3 rounded-lg bg-accent/50 border border-border text-sm">
                <p className="font-medium text-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  Campos não classificados
                </p>
                <p className="text-muted-foreground mt-1 font-mono text-xs">
                  {receipt.summary.unclassified_fields.join(", ")}
                </p>
              </div>
            )}

            {receipt.quality && (
              <div className="p-3 rounded-lg bg-muted border border-border text-sm space-y-1">
                <p className="font-medium text-foreground">
                  Qualidade do lote: {receipt.quality.score}/100 ({receipt.quality.severity})
                </p>
                {receipt.quality.warnings.length > 0 && (
                  <ul className="list-disc pl-4 text-muted-foreground">
                    {receipt.quality.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {receipt.idempotency_replay && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm text-primary">
                Requisição idempotente detectada: este resultado reutilizou um receipt já existente.
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { reset(); }}>
                Importar outro
              </Button>
              <Button onClick={() => handleOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </div>
        ) : preview ? (
          /* ===== Preview / Confirmation View ===== */
          <div className="space-y-4 min-h-0 flex flex-col">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50 border border-border">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">{file?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {preview.rows.length} {preview.rows.length === 1 ? "item" : "itens"} encontrados · {preview.headers.length} colunas
                </p>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-border p-3">
              <p className="text-sm font-medium text-foreground">Templates de mapeamento</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Select
                  value={selectedTemplateId || "__none__"}
                  onValueChange={(value) => {
                    if (value === "__none__") {
                      setSelectedTemplateId("");
                      return;
                    }
                    const selected = templates.find((t) => t.id === value);
                    if (selected) applyTemplate(selected);
                  }}
                >
                  <SelectTrigger className="sm:col-span-2">
                    <SelectValue placeholder="Aplicar template salvo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem template</SelectItem>
                    {templates.map((tpl) => (
                      <SelectItem key={tpl.id} value={tpl.id}>
                        {tpl.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={handleSaveTemplate}
                  disabled={savingTemplate || !preview}
                >
                  {savingTemplate ? "Salvando..." : "Salvar template"}
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Nome do template (ex: CowPro v1)"
                />
                <Input
                  value={templateSourceHint}
                  onChange={(e) => setTemplateSourceHint(e.target.value)}
                  placeholder="Source hint (ex: cowpro)"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Template é obrigatório para upload de parceiro.
              </p>
            </div>

            <div className="space-y-2 rounded-lg border border-border p-3">
              <p className="text-sm font-medium text-foreground">Mapeamento automático de colunas</p>
              <p className="text-xs text-muted-foreground">
                Colunas foram detectadas automaticamente. Ajuste apenas as ambíguas.
              </p>
              {ambiguousHeaders.length > 0 && (
                <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-2 text-xs text-yellow-800">
                  Ambíguas: {ambiguousHeaders.join(", ")}.
                </div>
              )}
              <div className="max-h-40 overflow-auto rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left">Coluna origem</th>
                      <th className="px-2 py-1.5 text-left">Campo DeFarm</th>
                      <th className="px-2 py-1.5 text-left">Conf.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.headers.map((header) => {
                      const detection = detectionMap[header];
                      const selected = columnMapping[header] ?? "__ignore__";
                      return (
                        <tr key={header} className="border-t border-border">
                          <td className="px-2 py-1">{header}</td>
                          <td className="px-2 py-1">
                            <Select
                              value={selected}
                              onValueChange={(value) =>
                                setColumnMapping((prev) => ({ ...prev, [header]: value }))
                              }
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__ignore__">Ignorar</SelectItem>
                                {TARGET_FIELDS.map((field) => (
                                  <SelectItem key={field} value={field}>
                                    {TARGET_LABELS[field]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-2 py-1">
                            {detection ? `${Math.round(detection.confidence * 100)}%` : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Canonical Selection */}
            <div className="space-y-2 rounded-lg border border-border p-3">
              <p className="text-sm font-medium text-foreground">Identificador canônico</p>
              <p className="text-xs text-muted-foreground">
                Se o arquivo não tiver um identificador canônico reconhecido, selecione a coluna e o tipo.
              </p>
              <div className="grid grid-cols-1 gap-2">
                <Select value={canonicalType} onValueChange={setCanonicalType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo canônico (ex: SISBOV)" />
                  </SelectTrigger>
                  <SelectContent>
                    {CANONICAL_TYPES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={canonicalColumn} onValueChange={setCanonicalColumn}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    {preview.headers.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preview Table */}
            <div className="border border-border rounded-lg overflow-auto max-h-[40vh] min-h-0">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground border-b border-border w-8">#</th>
                    {preview.headers.map((h, i) => {
                      const displayHeader =
                        canonicalColumn && canonicalType && h === canonicalColumn
                          ? canonicalType
                          : h;
                      return (
                        <th key={i} className="px-2 py-1.5 text-left font-medium text-muted-foreground border-b border-border whitespace-nowrap">
                          {displayHeader}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, PREVIEW_LIMIT).map((row, ri) => (
                    <tr key={ri} className="border-b border-border last:border-b-0 hover:bg-muted/50">
                      <td className="px-2 py-1 text-muted-foreground">{ri + 1}</td>
                      {preview.headers.map((_, ci) => (
                        <td key={ci} className="px-2 py-1 text-foreground whitespace-nowrap max-w-[200px] truncate">
                          {row[ci] || ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {preview.rows.length > PREVIEW_LIMIT && (
              <p className="text-xs text-muted-foreground text-center">
                Mostrando {PREVIEW_LIMIT} de {preview.rows.length} linhas
              </p>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPreview(null)}>
                Voltar
              </Button>
              <Button onClick={handleConfirmUpload} disabled={uploading || !selectedTemplateId}>
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Confirmar Importação ({preview.rows.length} itens)
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* ===== Upload View ===== */
          <div className="space-y-4">
            {/* Templates */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Templates:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadTemplate(CSV_TEMPLATE, "template-itens.csv")}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadTemplate(JSON_TEMPLATE, "template-itens.json")}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                JSON
              </Button>
            </div>

            {/* Circuit Select */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Circuito destino</label>
              <Select value={circuitId} onValueChange={setCircuitId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um circuito" />
                </SelectTrigger>
                <SelectContent>
                  {circuits.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Drop Zone */}
            <div
              className={`relative flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : file
                  ? "border-primary/40 bg-primary/5"
                  : "border-border hover:border-muted-foreground/40"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.json,.xls,.xlsx"
                className="hidden"
                onChange={handleFileSelect}
              />
              {file ? (
                <>
                  <FileText className="h-8 w-8 text-primary" />
                  <div className="text-center">
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">
                      Arraste um arquivo CSV ou JSON aqui
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ou clique para selecionar
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Preview Error */}
            {previewError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-700">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                {previewError}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handlePreview}
                disabled={!file || !circuitId || parsing}
              >
                {parsing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Visualizar dados
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
