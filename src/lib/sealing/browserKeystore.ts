// Chaves de campo selado no navegador (engines #755). A privada nunca sai deste navegador nem
// passa pela DeFarm: fica no IndexedDB CIFRADA com uma senha local (PBKDF2-SHA256 -> AES-GCM) e
// só é aberta na memória da sessão. O formato aberto é o mesmo do FileKeystore dos SDKs
// ({"version":1,"keys":{"signing":{key_id,private_key_b64},"encryption":{...}}}), então o arquivo
// de chaves do sistema integrado (ERP) pode ser importado aqui.

export interface StoredKey {
  key_id: string;
  private_key_b64: string;
}

export interface Keystore {
  version: 1;
  keys: { signing?: StoredKey; encryption?: StoredKey };
}

interface EncryptedKeystore {
  format: "defarm-keystore-encrypted-v1";
  workspace_id: string;
  salt_b64: string;
  iv_b64: string;
  iterations: number;
  ciphertext_b64: string;
}

const DB_NAME = "defarm";
const STORE = "sealed-keystores";
const ITERATIONS = 310_000;

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idb<T>(mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = op(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/** Cifra o keystore com a senha. O workspace entra como dado autenticado: não abre em outro. */
export async function encryptKeystore(ks: Keystore, workspaceId: string, passphrase: string): Promise<EncryptedKeystore> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, ITERATIONS);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(workspaceId) },
    key,
    new TextEncoder().encode(JSON.stringify(ks))
  );
  return {
    format: "defarm-keystore-encrypted-v1",
    workspace_id: workspaceId,
    salt_b64: b64(salt),
    iv_b64: b64(iv),
    iterations: ITERATIONS,
    ciphertext_b64: b64(new Uint8Array(ct)),
  };
}

export class WrongPassphraseError extends Error {}

export async function decryptKeystore(enc: EncryptedKeystore, workspaceId: string, passphrase: string): Promise<Keystore> {
  const key = await deriveKey(passphrase, unb64(enc.salt_b64), enc.iterations);
  try {
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: unb64(enc.iv_b64), additionalData: new TextEncoder().encode(workspaceId) },
      key,
      unb64(enc.ciphertext_b64)
    );
    return parseKeystore(new TextDecoder().decode(pt));
  } catch (e) {
    if (e instanceof WrongPassphraseError || e instanceof InvalidKeystoreError) throw e;
    throw new WrongPassphraseError("wrong passphrase or another workspace");
  }
}

export class InvalidKeystoreError extends Error {}

/** Valida o formato aberto (o mesmo do FileKeystore dos SDKs). */
export function parseKeystore(text: string): Keystore {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    throw new InvalidKeystoreError("not JSON");
  }
  const d = doc as Keystore;
  const ok = (k?: StoredKey) =>
    !!k && typeof k.key_id === "string" && k.key_id.length > 0 && typeof k.private_key_b64 === "string" && unb64Safe(k.private_key_b64)?.length === 32;
  if (!d || d.version !== 1 || !d.keys || !ok(d.keys.signing) || !ok(d.keys.encryption)) {
    throw new InvalidKeystoreError("not a DeFarm keystore with signing and encryption keys");
  }
  return { version: 1, keys: { signing: d.keys.signing, encryption: d.keys.encryption } };
}

function unb64Safe(s: string): Uint8Array | null {
  try {
    return unb64(s);
  } catch {
    return null;
  }
}

export function isEncryptedKeystore(text: string): boolean {
  try {
    return (JSON.parse(text) as EncryptedKeystore).format === "defarm-keystore-encrypted-v1";
  } catch {
    return false;
  }
}

export async function loadEncrypted(workspaceId: string): Promise<EncryptedKeystore | undefined> {
  return idb<EncryptedKeystore | undefined>("readonly", (s) => s.get(workspaceId));
}

export async function saveEncrypted(workspaceId: string, enc: EncryptedKeystore): Promise<void> {
  await idb("readwrite", (s) => s.put(enc, workspaceId));
}

export async function removeEncrypted(workspaceId: string): Promise<void> {
  await idb("readwrite", (s) => s.delete(workspaceId));
}

export function privateKey(k: StoredKey): Uint8Array {
  return unb64(k.private_key_b64);
}

export { b64 as toB64 };
