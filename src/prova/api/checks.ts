import type { Proof } from "./types";
import { commitmentOf } from "./canonical";
import { copy } from "../copy";
import { fmtDateTime } from "../format";

/* Os quatro checks da página pública, em linguagem humana. Cada um é uma função que recebe a
   prova e devolve ok + detalhe. Hoje:
   - hash: REAL. Recalcula blake3 do payload canônico no navegador e compara com o commitment.
   - anchor, sig, revoke: MOCK até a Proof carregar o que já existe em `src/lib/verify-inclusion.ts`
     (inclusão Merkle, assinatura Ed25519) e L5 (revoke) existir. Cada um avisa no console. */

export type CheckKey = "hash" | "anchor" | "sig" | "revoke";
export interface CheckResult { ok: boolean; detail: string }

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const CHECK_ORDER: CheckKey[] = ["hash", "anchor", "sig", "revoke"];

export const CHECKS: Record<CheckKey, (p: Proof) => Promise<CheckResult>> = {
  async hash(p) {
    await wait(500);
    const got = commitmentOf(p);
    const want = p.commitment.replace(/^blake3:/, "");
    return { ok: got === want, detail: got === want ? copy.kit.verify.checkDetail.hash : "o conteúdo não bate com o registro" };
  },
  async anchor(p) {
    console.warn("[mock L1] check anchor: inclusão na rede ainda não verificada (aguarda Proof com snapshot/CID)");
    await wait(1100);
    return { ok: true, detail: copy.kit.verify.checkDetail.anchor(fmtDateTime(p.issuedAt)) };
  },
  async sig(p) {
    console.warn("[mock L1] check sig: assinatura Ed25519 ainda não verificada (reaproveitar verifyEventSignatureInBrowser)");
    await wait(900);
    return { ok: true, detail: copy.kit.verify.checkDetail.sig(p.issuer.name) };
  },
  async revoke(p) {
    console.warn("[mock L5] check revoke: estado de revogação vem do próprio GET até L5 existir");
    await wait(600);
    return { ok: p.state === "valid", detail: p.state === "valid" ? copy.kit.verify.checkDetail.revoke : "cortada por quem emitiu" };
  },
};
