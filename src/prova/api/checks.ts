import { getPublicItemEventsLossless, getPublicItemProofs } from "@/lib/api/join-requests";
import { anchorStateOf } from "@/components/proof";
import { verifyEventSignatureInBrowser } from "@/lib/verify-inclusion";
import { COMMITMENT_ALG, type Proof } from "./types";
import { commitmentOf } from "./canonical";
import { getProof, ProofNotFound } from "./proofs";
import { copy } from "../copy";
import { fmtDateTime } from "../format";

/* Os quatro checks da página pública, em linguagem humana, cada um com o que prova de verdade:
   - hash:   BLAKE3 sobre JCS do JSON servido == commitment. Sempre real, no navegador.
   - anchor: a Proof NÃO é ancorada (engines#650 correção 1). O que se confere é que cada DFID do
             escopo tem âncora confirmada na rede, via /items/{dfid}/proofs/public (o que /v/ já usa).
   - sig:    signer "own" = eventos dos DFIDs assinados com a chave própria do emissor; Ed25519
             refeito no navegador (verifyEventSignatureInBrowser). signer "defarm" = chave operada
             pela plataforma; passa, mas o selo diz "irretratabilidade limitada".
   - revoke: relê GET /api/proofs/{id} agora; 200 = continua válida, 404 uniforme = cortada.
   Tudo real desde que a Proof entrou em produção (engines#652/#653, 17/09/2026). */

export type CheckKey = "hash" | "anchor" | "sig" | "revoke";
export interface CheckResult { ok: boolean; detail: string }
export interface CheckInput { id: string; proof: Proof }

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const CHECK_ORDER: CheckKey[] = ["hash", "anchor", "sig", "revoke"];

export const CHECKS: Record<CheckKey, (input: CheckInput) => Promise<CheckResult>> = {
  async hash({ proof }) {
    await wait(400);
    if (proof.commitmentAlg !== COMMITMENT_ALG) return { ok: false, detail: copy.kit.verify.checkDetail.hashAlg(proof.commitmentAlg) };
    const got = commitmentOf(proof as unknown as Record<string, unknown>);
    const ok = got === proof.commitment;
    return { ok, detail: ok ? copy.kit.verify.checkDetail.hash : copy.kit.verify.checkDetail.hashFail };
  },

  async anchor({ proof }) {
    const results = await Promise.all(proof.dfids.map(async (dfid) => {
      try {
        const p = await getPublicItemProofs(dfid);
        const status = p.identity_anchor?.status ?? p.nft_mint_anchor?.status ?? null;
        const at = p.identity_anchor?.anchored_at ?? p.nft_mint_anchor?.anchored_at ?? null;
        return { ok: anchorStateOf(status) === "confirmed", at };
      } catch {
        return { ok: false, at: null };
      }
    }));
    const okCount = results.filter((r) => r.ok).length;
    const latest = results.map((r) => r.at).filter((x): x is string => !!x).sort().pop();
    const ok = okCount === proof.dfids.length && proof.dfids.length > 0;
    return { ok, detail: ok ? copy.kit.verify.checkDetail.anchor(okCount, latest ? fmtDateTime(latest) : "") : copy.kit.verify.checkDetail.anchorFail(okCount, proof.dfids.length) };
  },

  async sig({ proof }) {
    if (proof.issuer.signer !== "own") {
      await wait(500);
      return { ok: true, detail: copy.kit.verify.checkDetail.sigDefarm };
    }
    let verified = 0; let failed = 0;
    for (const dfid of proof.dfids) {
      const events = await getPublicItemEventsLossless(dfid).catch(() => []);
      for (const e of events) {
        const r = verifyEventSignatureInBrowser(e);
        if (r === true) verified++; else if (r === false) failed++;
      }
    }
    const ok = verified > 0 && failed === 0;
    return { ok, detail: ok ? copy.kit.verify.checkDetail.sig(proof.issuer.name) : copy.kit.verify.checkDetail.sigFail(verified, failed) };
  },

  async revoke({ id }) {
    await wait(300);
    try {
      await getProof(id);
      return { ok: true, detail: copy.kit.verify.checkDetail.revoke };
    } catch (e) {
      if (e instanceof ProofNotFound) return { ok: false, detail: copy.kit.verify.checkDetail.revokeFail };
      return { ok: false, detail: copy.kit.verify.checkDetail.revokeUnknown };
    }
  },
};
