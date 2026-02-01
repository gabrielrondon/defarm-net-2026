// Gerador de IDs fake realistas para demonstração
// Formatos que parecem reais mas não colidem com dados reais

export type IdType = "sisbov" | "brinco" | "lote" | "gta";

export interface GeneratedId {
  type: IdType;
  value: string;
  label: string;
}

// Prefixo especial para IDs fake (99 = código reservado para testes)
const FAKE_PREFIX = "99";

/**
 * Gera um número SISBOV fake
 * Formato real: BR + 15 dígitos
 * Formato fake: BR99 + 13 dígitos (99 indica fake)
 */
function generateSisbov(): string {
  const digits = Array.from({ length: 13 }, () => 
    Math.floor(Math.random() * 10)
  ).join("");
  return `BR${FAKE_PREFIX}${digits}`;
}

/**
 * Gera um número de brinco fake
 * Formato: 4-6 dígitos numéricos
 */
function generateBrinco(): string {
  const length = Math.floor(Math.random() * 3) + 4; // 4-6 dígitos
  const digits = Array.from({ length }, () => 
    Math.floor(Math.random() * 10)
  ).join("");
  return digits;
}

/**
 * Gera um número de lote fake
 * Formato: L + ano + sequencial (ex: L2024-0042)
 */
function generateLote(): string {
  const year = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 9000) + 1000;
  return `L${year}-${seq}`;
}

/**
 * Gera um número de GTA fake
 * Formato real: UF + série + número
 * Formato fake: XX99 + 8 dígitos (XX = estado fictício)
 */
function generateGta(): string {
  const ufs = ["SP", "MG", "MT", "MS", "GO", "PR", "RS", "BA", "TO", "PA"];
  const uf = ufs[Math.floor(Math.random() * ufs.length)];
  const serie = FAKE_PREFIX;
  const numero = Array.from({ length: 8 }, () => 
    Math.floor(Math.random() * 10)
  ).join("");
  return `${uf}${serie}${numero}`;
}

/**
 * Gera um ID fake aleatório de qualquer tipo
 */
export function generateFakeId(): GeneratedId {
  const types: { type: IdType; label: string; generator: () => string }[] = [
    { type: "sisbov", label: "SISBOV", generator: generateSisbov },
    { type: "brinco", label: "Brinco", generator: generateBrinco },
    { type: "lote", label: "Lote", generator: generateLote },
  ];
  
  const selected = types[Math.floor(Math.random() * types.length)];
  
  return {
    type: selected.type,
    value: selected.generator(),
    label: selected.label,
  };
}

/**
 * Gera um ID fake de um tipo específico
 */
export function generateFakeIdByType(type: IdType): GeneratedId {
  const generators: Record<IdType, { generator: () => string; label: string }> = {
    sisbov: { generator: generateSisbov, label: "SISBOV" },
    brinco: { generator: generateBrinco, label: "Brinco" },
    lote: { generator: generateLote, label: "Lote" },
    gta: { generator: generateGta, label: "GTA" },
  };
  
  const { generator, label } = generators[type];
  
  return {
    type,
    value: generator(),
    label,
  };
}

/**
 * Detecta o tipo provável de um ID baseado no formato
 */
export function detectIdType(value: string): IdType | null {
  const trimmed = value.trim().toUpperCase();
  
  if (trimmed.startsWith("BR") && trimmed.length >= 15) {
    return "sisbov";
  }
  
  if (trimmed.startsWith("L") && trimmed.includes("-")) {
    return "lote";
  }
  
  if (/^[A-Z]{2}\d{10,}$/.test(trimmed)) {
    return "gta";
  }
  
  if (/^\d{4,6}$/.test(trimmed)) {
    return "brinco";
  }
  
  return null;
}

/**
 * Gera um DFID (DeFarm ID) único para um item
 * Formato: DFID-[timestamp base36]-[random]
 */
export function generateDFID(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DFID-${timestamp}-${random}`;
}
