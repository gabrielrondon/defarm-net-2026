import { describe, expect, it } from "vitest";
import { commitmentJcs, commitmentOf } from "./canonical";
import lacunas from "../mocks/lacunas.json";
import type { Proof } from "./types";

/* O check "Ninguém alterou o conteúdo" só vale se tudo o que o destinatário lê como afirmação
   entra no hash, e se a canonicalização é a mesma do backend (JCS, RFC 8785, engines#652).
   Mutações = as da review do Hetzner no net#221 (expiresAt e legalBasis.purpose passavam
   verdes na primeira versão) + assinante, nível, modo, asOf, campo, DFID, selado, título.
   O vetor de conformidade byte a byte com o Rust entra quando o #652 o publicar. */
const base = (lacunas as { L1: { view: Proof } }).L1.view as unknown as Record<string, unknown>;
const clone = (): Proof => JSON.parse(JSON.stringify(base));
const hash = (p: Proof) => commitmentOf(p as unknown as Record<string, unknown>);

describe("commitment da Proof (blake3-jcs-v1)", () => {
  it("bate com o fixture", () => {
    expect(commitmentOf(base)).toBe(base.commitment);
  });

  it.each<[string, (p: Proof) => void]>([
    ["expiresAt esticado", (p) => { p.expiresAt = "2099-12-31T00:00:00.000000Z"; }],
    ["finalidade LGPD trocada", (p) => { p.legalBasis!.purpose = "FINALIDADE ADULTERADA"; }],
    ["assinante promovido", (p) => { p.issuer.signer = "defarm"; }],
    ["nível de identidade", (p) => { p.issuer.level = 1; }],
    ["modo", (p) => { p.mode = "live"; }],
    ["data da foto", (p) => { p.asOf = "2026-01-01T00:00:00.000000Z"; }],
    ["campo afirmado", (p) => { p.fields[0].value = "9.999"; }],
    ["DFID", (p) => { p.dfids[0] = "DFID-BEEF-BR-2026-004471-9f231X"; }],
    ["campo selado removido", (p) => { p.sealed = []; }],
    ["título", (p) => { p.title = "Outro título"; }],
    ["destinatário", (p) => { p.recipient = "Outro banco"; }],
    ["microssegundo da emissão", (p) => { p.issuedAt = "2026-09-12T12:41:00.314160Z"; }],
  ])("muda quando %s", (_name, mutate) => {
    const p = clone(); mutate(p);
    expect(hash(p)).not.toBe(base.commitment);
  });

  it.each<[string, (p: Proof) => void]>([
    ["state", (p) => { (p as { state: string }).state = "revoked"; }],
    ["commitmentAlg", (p) => { p.commitmentAlg = "outro"; }],
    ["commitment", (p) => { p.commitment = "0000"; }],
  ])("não muda com o campo meta %s", (_name, mutate) => {
    const p = clone(); mutate(p);
    expect(hash(p)).toBe(base.commitment);
  });

  it("é JCS, não sort textual: chave inteira ordena por código, número normaliza", () => {
    const jcs = commitmentJcs({ "2": 1, "10": 2, a: 390.0, s: "é\n" });
    expect(jcs).toBe('{"10":2,"2":1,"a":390,"s":"é\\n"}');
  });
});
