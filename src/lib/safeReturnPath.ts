// Destino de volta depois do login (net#237). Só aceita caminho interno desta aplicação, para o
// redirect não virar open redirect: nada de URL absoluta, "//host", barra invertida, caractere de
// controle ou variante codificada disso. Prefixos aceitos: a área logada e as páginas públicas que
// já mandam o visitante para o login (animal, circuito, verificação).
const ALLOWED_PREFIXES = ["/app/", "/i/", "/c/", "/v/"];
const ALLOWED_EXACT = ["/app"];
const BASE = "https://return.invalid";

function hasUnsafeChars(s: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /[\u0000-\u001f\u007f\\]/.test(s);
}

function allowedPath(pathname: string): boolean {
  return ALLOWED_EXACT.includes(pathname) || ALLOWED_PREFIXES.some((p) => pathname.startsWith(p));
}

export function safeReturnPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (value.length === 0 || value.length > 2048) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (hasUnsafeChars(value)) return null;

  // Variantes codificadas (%2F%2F, %5C, %0A...) não podem esconder um destino externo.
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }
  if (decoded.startsWith("//") || hasUnsafeChars(decoded)) return null;

  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return null;
  }
  if (url.origin !== BASE) return null;
  // "/app/../admin" vira "/admin" depois da normalização: confere o caminho já normalizado.
  if (!allowedPath(url.pathname)) return null;
  return url.pathname + url.search + url.hash;
}
