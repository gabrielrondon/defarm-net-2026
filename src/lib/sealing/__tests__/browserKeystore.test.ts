import { describe, expect, it } from "vitest";
import { generateEd25519KeyPair, generateX25519KeyPair, openField, sealField, toBase64 } from "@defarm/sdk/core";
import {
  decryptKeystore,
  encryptKeystore,
  InvalidKeystoreError,
  isEncryptedKeystore,
  type Keystore,
  parseKeystore,
  passphraseIsStrong,
  privateKey,
  WrongPassphraseError,
} from "../browserKeystore";

const WS = "11111111-1111-1111-1111-111111111111";

function newKeystore(): Keystore {
  const s = generateEd25519KeyPair();
  const e = generateX25519KeyPair();
  return {
    version: 1,
    keys: {
      signing: { key_id: "web-sign-1", private_key_b64: toBase64(s.seed) },
      encryption: { key_id: "web-enc-1", private_key_b64: toBase64(e.privateKey) },
    },
  };
}

describe("browser keystore (#755)", () => {
  it("round-trips with the passphrase and keeps no private key in clear", async () => {
    const ks = newKeystore();
    const enc = await encryptKeystore(ks, WS, "senha-longa-de-teste");
    const text = JSON.stringify(enc);
    expect(isEncryptedKeystore(text)).toBe(true);
    expect(text).not.toContain(ks.keys.signing!.private_key_b64);
    expect(text).not.toContain(ks.keys.encryption!.private_key_b64);
    expect(await decryptKeystore(enc, WS, "senha-longa-de-teste")).toEqual(ks);
  });

  it("refuses a wrong passphrase and another workspace", async () => {
    const enc = await encryptKeystore(newKeystore(), WS, "senha-longa-de-teste");
    await expect(decryptKeystore(enc, WS, "outra-senha-qualquer")).rejects.toBeInstanceOf(WrongPassphraseError);
    await expect(decryptKeystore(enc, "22222222-2222-2222-2222-222222222222", "senha-longa-de-teste")).rejects.toBeInstanceOf(
      WrongPassphraseError
    );
  });

  it("refuses a backup with key derivation parameters out of range", async () => {
    const enc = await encryptKeystore(newKeystore(), WS, "senha-longa-de-teste");
    expect(enc.iterations).toBe(600_000);
    for (const iterations of [1, 99_999, 5_000_001, 1.5]) {
      await expect(decryptKeystore({ ...enc, iterations }, WS, "senha-longa-de-teste")).rejects.toBeInstanceOf(
        InvalidKeystoreError
      );
    }
  });

  it("asks for a passphrase with length and some variety", () => {
    expect(passphraseIsStrong("aaaaaaaaaaaa", 12)).toBe(false);
    expect(passphraseIsStrong("121212121212", 12)).toBe(false);
    expect(passphraseIsStrong("curta-1", 12)).toBe(false);
    expect(passphraseIsStrong("senha-longa-de-teste", 12)).toBe(true);
  });

  it("accepts the SDK key file format and rejects anything else", () => {
    const ks = newKeystore();
    expect(parseKeystore(JSON.stringify(ks))).toEqual(ks);
    for (const bad of ["{}", "nao-e-json", JSON.stringify({ version: 1, keys: { signing: ks.keys.signing } })]) {
      expect(() => parseKeystore(bad)).toThrow(InvalidKeystoreError);
    }
  });

  it("a field sealed to the browser key opens with the stored keystore", async () => {
    const ks = newKeystore();
    const back = await decryptKeystore(await encryptKeystore(ks, WS, "senha-longa-de-teste"), WS, "senha-longa-de-teste");
    const enc = back.keys.encryption!;
    const { x25519PublicKey } = await import("@defarm/sdk/core");
    const sealed = await sealField("DFID-BEEF-BR-2026-000001-abcdef", "cev-1", "geo", "application/json",
      new TextEncoder().encode('{"lat":-20.4697}'), [
        { workspaceId: WS, encKeyId: enc.key_id, encPubkeyB64: toBase64(x25519PublicKey(privateKey(enc))) },
      ]);
    const raw = await openField(sealed, enc.key_id, privateKey(enc));
    expect(new TextDecoder().decode(raw)).toBe('{"lat":-20.4697}');
  });
});
