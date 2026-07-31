import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Guarda-corpo dos locales (nasceu do incidente do nav duplicado — QA PR #178):
 * 1. JSON com chave duplicada não quebra o parse: a última vence e ENGOLE a
 *    primeira silenciosamente (foi assim que o nav da landing sumiu e o botão
 *    renderizou "nav.getStarted" cru em produção-preview).
 * 2. Blocos que devem existir nos 3 idiomas precisam ter o MESMO conjunto de
 *    chaves-folha — senão o fallback mascara tradução faltando.
 */

const LOCALES = ["pt-BR", "en", "es"] as const;
const dir = join(__dirname, "locales");

function findDuplicateKeys(raw: string): string[] {
  const dups: string[] = [];
  JSON.parse(raw, function reviver(this: Record<string, unknown>, key, value) {
    return value;
  });
  // JSON.parse não expõe duplicatas — detectamos com um parser de pares.
  const stack: Array<Set<string>> = [];
  let i = 0;
  const n = raw.length;
  let inString = false;
  let escape = false;
  let lastString = "";
  let current = "";
  let expectingKey: boolean[] = [];
  while (i < n) {
    const ch = raw[i];
    if (inString) {
      if (escape) {
        escape = false;
        current += ch;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
        lastString = current;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inString = true;
      current = "";
    } else if (ch === "{") {
      stack.push(new Set());
      expectingKey.push(true);
    } else if (ch === "}") {
      stack.pop();
      expectingKey.pop();
    } else if (ch === "[") {
      expectingKey.push(false);
    } else if (ch === "]") {
      expectingKey.pop();
    } else if (ch === ":") {
      if (expectingKey[expectingKey.length - 1] && stack.length > 0) {
        const scope = stack[stack.length - 1];
        if (scope.has(lastString)) dups.push(lastString);
        scope.add(lastString);
      }
    }
    i += 1;
  }
  return dups;
}

function leafKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? leafKeys(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`]
  );
}

describe("locales", () => {
  const raws = Object.fromEntries(
    LOCALES.map((l) => [l, readFileSync(join(dir, `${l}.json`), "utf-8")])
  );
  const parsed = Object.fromEntries(
    LOCALES.map((l) => [l, JSON.parse(raws[l]) as Record<string, unknown>])
  );

  it.each(LOCALES)("%s não tem chaves duplicadas", (l) => {
    expect(findDuplicateKeys(raws[l])).toEqual([]);
  });

  // Blocos introduzidos/mantidos pelo redesign do parceiro: simetria obrigatória.
  const SYMMETRIC_BLOCKS = ["nav", "settings", "portal"] as const;

  it.each(SYMMETRIC_BLOCKS)("bloco '%s' tem as mesmas chaves nos 3 idiomas", (block) => {
    const sets = LOCALES.map((l) => {
      const node = parsed[l][block];
      expect(node, `${l} não tem o bloco ${block}`).toBeTruthy();
      return new Set(leafKeys(node as Record<string, unknown>));
    });
    const [pt, en, es] = sets;
    const diff = (a: Set<string>, b: Set<string>) => [...a].filter((k) => !b.has(k));
    expect(diff(pt, en), "pt-BR tem chaves que faltam no en").toEqual([]);
    expect(diff(en, pt), "en tem chaves que faltam no pt-BR").toEqual([]);
    expect(diff(pt, es), "pt-BR tem chaves que faltam no es").toEqual([]);
    expect(diff(es, pt), "es tem chaves que faltam no pt-BR").toEqual([]);
  });
});
