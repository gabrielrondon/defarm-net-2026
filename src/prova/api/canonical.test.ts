import { describe, expect, it } from "vitest";
import { commitmentOf } from "./canonical";
import lacunas from "../mocks/lacunas.json";
import type { Proof } from "./types";

/* O check "Ninguém alterou o conteúdo" só vale se tudo o que o destinatário lê como afirmação
   entra no hash. Mutações abaixo = as que o Hetzner usou na review do net#221 (expiresAt e
   legalBasis.purpose passavam verdes na primeira versão) + issuer.signer. */
const base = (lacunas as { L1: Proof }).L1;
const clone = (): Proof => JSON.parse(JSON.stringify(base));

describe("commitment da Proof", () => {
  it("bate com o fixture", () => {
    expect(`blake3:${commitmentOf(base)}`).toBe(base.commitment);
  });

  it.each<[string, (p: Proof) => void]>([
    ["expiresAt esticado", (p) => { p.expiresAt = "2099-12-31T00:00:00-03:00"; }],
    ["finalidade LGPD trocada", (p) => { p.legalBasis.purpose = "FINALIDADE ADULTERADA"; }],
    ["assinante promovido", (p) => { p.issuer.signer = "owner"; p.issuer.signer = "defarm"; }],
    ["nível de identidade", (p) => { p.issuer.level = 1; }],
    ["modo viva/congelada", (p) => { p.mode = "live"; }],
    ["data da foto", (p) => { p.asOf = "2026-01-01T00:00:00-03:00"; }],
    ["campo afirmado", (p) => { p.fields[0].value = "9.999"; }],
    ["DFID", (p) => { p.dfids[0] = "DFID-BEEF-BR-2026-004471-9f231X"; }],
    ["campo selado removido", (p) => { p.sealed = []; }],
  ])("muda quando %s", (_name, mutate) => {
    const p = clone(); mutate(p);
    expect(commitmentOf(p)).not.toBe(commitmentOf(base));
  });

  it("não muda com o e-mail do destinatário (fora do hash de propósito)", () => {
    const p = clone(); p.recipient = { ...p.recipient!, email: "outro@banco.com" };
    expect(commitmentOf(p)).toBe(commitmentOf(base));
  });
});
