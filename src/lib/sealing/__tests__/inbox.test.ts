import { describe, expect, it } from "vitest";
import {
  ed25519PublicKey,
  generateEd25519KeyPair,
  generateX25519KeyPair,
  sealField,
  signSealedField,
  toBase64,
} from "@defarm/sdk/core";
import type { RecipientSealedField } from "@/lib/api/sealed";
import { acceptSealerKey, classifyAuthorship, wrapperMatchesEnvelope } from "../inbox";

const ME = "11111111-1111-1111-1111-111111111111";
const SEALER = "22222222-2222-2222-2222-222222222222";
const DFID = "DFID-BEEF-BR-2026-000001-abcdef";

async function field(
  sealerSeed: Uint8Array,
  keyId = "erp-sign-1",
  occurredAt = "2026-10-05T12:00:00Z",
  eventId = "evt-1"
): Promise<RecipientSealedField> {
  const enc = generateX25519KeyPair();
  const sealed = signSealedField(
    await sealField(DFID, "cev-1", "geo", "application/json", new TextEncoder().encode('{"lat":-20.4}'), [
      { workspaceId: ME, encKeyId: "web-enc-1", encPubkeyB64: toBase64(enc.publicKey) },
    ]),
    SEALER,
    keyId,
    sealerSeed
  );
  return {
    dfid: DFID,
    event_id: eventId,
    event_type: "observation",
    occurred_at: occurredAt,
    field_path: "geo",
    content_type: "application/json",
    recipient_enc_key_id: "web-enc-1",
    sealed_field: sealed,
    sealer_workspace_id: SEALER,
    sealer_key_id: keyId,
    authorship_verified: true,
    sealer_public_key_b64: toBase64(ed25519PublicKey(sealerSeed)),
  };
}

describe("sealed inbox checks (#755)", () => {
  it("the row shown must be what the envelope says", async () => {
    const f = await field(generateEd25519KeyPair().seed);
    expect(wrapperMatchesEnvelope(f)).toBe(true);
    for (const bad of [
      { dfid: "DFID-BEEF-BR-2026-000002-abcdef" },
      { field_path: "cpf" },
      { content_type: "text/plain" },
      { sealer_workspace_id: ME },
      { sealer_key_id: "outra" },
    ]) {
      expect(wrapperMatchesEnvelope({ ...f, ...bad })).toBe(false);
    }
  });

  it("pins the sealer key on first use and flags a later change", async () => {
    const first = await field(generateEd25519KeyPair().seed);
    const r1 = classifyAuthorship([first], {});
    expect(r1.byField["evt-1geo"]).toBe("ok");
    expect(r1.changed).toBe(true);

    // Mesma identidade de chave, outra chave pública (o servidor trocou): não é "ok".
    const swapped = await field(generateEd25519KeyPair().seed);
    const r2 = classifyAuthorship([swapped], r1.pins);
    expect(r2.byField["evt-1geo"]).toBe("changed");
    expect(r2.changed).toBe(false);

    // Outra chave com outro key_id no mesmo workspace selador (rotação ou key_id forjado): também
    // não passa em silêncio.
    const rotated = await field(generateEd25519KeyPair().seed, "rotated-sign-2");
    expect(classifyAuthorship([rotated], r1.pins).byField["evt-1geo"]).toBe("changed");
  });

  it("first use pins the oldest key, so a rotation shows as a change, and it can be accepted", async () => {
    const oldKey = await field(generateEd25519KeyPair().seed, "sign-f66", "2026-10-01T12:00:00Z", "evt-old");
    const newKey = await field(generateEd25519KeyPair().seed, "rotated-sign-2", "2026-10-05T12:00:00Z", "evt-new");
    // A caixa vem do mais novo para o mais antigo.
    const r = classifyAuthorship([newKey, oldKey], {});
    expect(r.byField["evt-oldgeo"]).toBe("ok");
    expect(r.byField["evt-newgeo"]).toBe("changed");

    const accepted = acceptSealerKey(r.pins, SEALER, newKey.sealer_public_key_b64!);
    const r2 = classifyAuthorship([newKey, oldKey], accepted);
    expect(r2.byField["evt-oldgeo"]).toBe("ok");
    expect(r2.byField["evt-newgeo"]).toBe("ok");
    expect(acceptSealerKey(accepted, SEALER, newKey.sealer_public_key_b64!)).toBe(accepted);
  });

  it("does not trust the server flag alone", async () => {
    const f = await field(generateEd25519KeyPair().seed);
    const otherPub = toBase64(ed25519PublicKey(generateEd25519KeyPair().seed));
    expect(classifyAuthorship([{ ...f, sealer_public_key_b64: otherPub }], {}).byField["evt-1geo"]).toBe("unknown");
    expect(classifyAuthorship([{ ...f, authorship_verified: false }], {}).byField["evt-1geo"]).toBe("unknown");
    expect(classifyAuthorship([{ ...f, field_path: "cpf" }], {}).byField["evt-1cpf"]).toBe("unknown");
  });
});
