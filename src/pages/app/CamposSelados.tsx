import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Lock, Download, Upload, KeyRound, ShieldCheck } from "lucide-react";
import {
  generateEd25519KeyPair,
  generateX25519KeyPair,
  ed25519PublicKey,
  openField,
  signEncKeyBinding,
  toBase64,
  x25519PublicKey,
} from "@defarm/sdk/core";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PARTNER_CANVAS } from "@/components/partner/PartnerPage";
import {
  decryptKeystore,
  encryptKeystore,
  isEncryptedKeystore,
  type Keystore,
  loadEncrypted,
  parseKeystore,
  passphraseIsStrong,
  privateKey,
  removeEncrypted,
  saveEncrypted,
  WrongPassphraseError,
} from "@/lib/sealing/browserKeystore";
import {
  listEncryptionKeys,
  listSealedFields,
  listSigningKeys,
  registerEncryptionKey,
  registerSigningKey,
  type RecipientSealedField,
} from "@/lib/api/sealed";
import { classifyAuthorship, loadSealerPins, saveSealerPins, wrapperMatchesEnvelope } from "@/lib/sealing/inbox";

const MIN_PASSPHRASE = 12;

class AnotherEncryptionKeyError extends Error {}
class WorkspaceChangedError extends Error {}

function randomId(prefix: string) {
  const b = crypto.getRandomValues(new Uint8Array(4));
  return prefix + Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// #755: abrir campos selados pelo navegador. O dashboard faz a parte do SDK aqui mesmo: as chaves
// nascem e ficam neste navegador (cifradas com uma senha local), e o valor é aberto localmente.
// A DeFarm não recebe a chave privada nem o valor.
export default function CamposSelados() {
  const { user } = useAuth();
  const workspaceId = user?.workspace_id ?? "";
  // Uma instância por workspace: trocar de workspace desmonta esta e descarta o estado dela.
  return <CamposSeladosDoWorkspace key={workspaceId} workspaceId={workspaceId} />;
}

function CamposSeladosDoWorkspace({ workspaceId }: { workspaceId: string }) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  // A sessão (token) já pode ser de outro workspace quando uma operação lenta termina (PBKDF2,
  // rede). Nenhuma escrita sai de uma instância desmontada.
  const alive = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
    },
    []
  );
  const ensureAlive = () => {
    if (!alive.current) throw new WorkspaceChangedError();
  };

  const [hasLocal, setHasLocal] = useState<boolean | null>(null);
  const [keystore, setKeystore] = useState<Keystore | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [opened, setOpened] = useState<Record<string, string>>({});

  const encKeys = useQuery({
    queryKey: ["workspace-encryption-keys", workspaceId],
    queryFn: listEncryptionKeys,
    enabled: !!workspaceId,
  });
  const activeEncKeys = useMemo(
    () => (encKeys.data ?? []).filter((k) => k.is_active && !k.revoked_at && !k.retired_at),
    [encKeys.data]
  );

  useEffect(() => {
    if (!workspaceId) return;
    let current = true;
    loadEncrypted(workspaceId).then((e) => current && setHasLocal(!!e));
    return () => {
      current = false;
    };
  }, [workspaceId]);

  const myEncKeyId = keystore?.keys.encryption?.key_id;
  const myKeyIsActive =
    !!keystore &&
    activeEncKeys.some(
      (k) => k.key_id === myEncKeyId && k.public_key_b64.trim() === toBase64(x25519PublicKey(privateKey(keystore.keys.encryption!)))
    );

  const myEncKeyRegistered = !!myEncKeyId && (encKeys.data ?? []).some((k) => k.key_id === myEncKeyId);

  const inbox = useQuery({
    queryKey: ["sealed-inbox", workspaceId, myEncKeyId],
    enabled: !!keystore,
    queryFn: async () => {
      const all: RecipientSealedField[] = [];
      let cursor: string | null = null;
      do {
        const page = await listSealedFields(cursor);
        all.push(...page.sealed_fields);
        cursor = page.next_cursor;
      } while (cursor && all.length < 2000);
      return all.filter((f) => f.recipient_enc_key_id === myEncKeyId);
    },
  });

  const authorship = useMemo(() => {
    if (!inbox.data) return {};
    const r = classifyAuthorship(inbox.data, loadSealerPins(workspaceId));
    if (r.changed) saveSealerPins(workspaceId, r.pins);
    return r.byField;
  }, [inbox.data, workspaceId]);

  const strongEnough = passphraseIsStrong(passphrase, MIN_PASSPHRASE);

  async function protectAndSave(ks: Keystore) {
    await saveEncrypted(workspaceId, await encryptKeystore(ks, workspaceId, passphrase));
    setKeystore(ks);
    setHasLocal(true);
  }

  async function unlock() {
    setBusy(true);
    try {
      const enc = await loadEncrypted(workspaceId);
      if (!enc) return;
      setKeystore(await decryptKeystore(enc, workspaceId, passphrase));
    } catch (e) {
      toast({
        title: e instanceof WrongPassphraseError ? t("sealed.errors.wrongPassphrase") : t("sealed.errors.generic"),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  // Registra no workspace as chaves já guardadas neste navegador. Retomável: pula o que já está
  // registrado, então uma falha no meio se resolve com "concluir registro", sem chave órfã.
  async function finishRegistration(ks: Keystore) {
    const signing = ks.keys.signing!;
    const encryption = ks.keys.encryption!;
    const signingPub = toBase64(ed25519PublicKey(privateKey(signing)));
    const encPub = toBase64(x25519PublicKey(privateKey(encryption)));
    const [signingKeys, encryptionKeys] = await Promise.all([listSigningKeys(), listEncryptionKeys()]);
    const otherActiveEnc = encryptionKeys.some(
      (k) => k.key_id !== encryption.key_id && k.is_active && !k.revoked_at && !k.retired_at
    );
    if (otherActiveEnc) throw new AnotherEncryptionKeyError();
    if (!signingKeys.some((k) => k.key_id === signing.key_id)) {
      ensureAlive();
      await registerSigningKey(signing.key_id, signingPub);
    }
    if (!encryptionKeys.some((k) => k.key_id === encryption.key_id)) {
      ensureAlive();
      await registerEncryptionKey(
        encryption.key_id,
        encPub,
        signing.key_id,
        signEncKeyBinding(workspaceId, encryption.key_id, encPub, privateKey(signing))
      );
    }
  }

  const registrationError = (e: unknown) =>
    e instanceof AnotherEncryptionKeyError
      ? t("sealed.errors.anotherKey")
      : e instanceof ApiError && e.code === "key_management_requires_admin"
        ? t("sealed.errors.adminOnly")
        : t("sealed.errors.incomplete");

  async function completeRegistration() {
    if (!keystore) return;
    setBusy(true);
    try {
      await finishRegistration(keystore);
      toast({ title: t("sealed.registered") });
    } catch (e) {
      if (e instanceof WorkspaceChangedError) return;
      toast({
        title: registrationError(e),
        variant: "destructive",
      });
    } finally {
      encKeys.refetch();
      setBusy(false);
    }
  }

  async function createKeys() {
    if (!strongEnough || passphrase !== confirm) return;
    setBusy(true);
    try {
      // A lista na tela pode estar velha: o sistema integrado pode ter registrado a chave dele agora.
      const fresh = await listEncryptionKeys();
      if (fresh.some((k) => k.is_active && !k.revoked_at && !k.retired_at)) {
        toast({ title: t("sealed.errors.anotherKey"), variant: "destructive" });
        return;
      }
      const signing = generateEd25519KeyPair();
      const encryption = generateX25519KeyPair();
      const ks: Keystore = {
        version: 1,
        keys: {
          signing: { key_id: randomId("web-sign-"), private_key_b64: toBase64(signing.seed) },
          encryption: { key_id: randomId("web-enc-"), private_key_b64: toBase64(encryption.privateKey) },
        },
      };
      // Nada é registrado aqui. As chaves ficam guardadas e o backup é baixado; o registro só vem
      // quando a pessoa confirma que guardou o backup ("concluir registro"). O download pode falhar
      // calado, e sem backup perder este navegador é perder o que for selado para estas chaves.
      ensureAlive();
      await protectAndSave(ks);
      await navigator.storage?.persist?.().catch(() => false);
      download(`defarm-chaves-${workspaceId}.json`, JSON.stringify(await encryptKeystore(ks, workspaceId, passphrase), null, 2));
      toast({ title: t("sealed.created") });
    } catch (e) {
      if (e instanceof WorkspaceChangedError) return;
      toast({ title: t("sealed.errors.generic"), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function importFile(file: File) {
    if (!strongEnough) return;
    setBusy(true);
    try {
      const text = await file.text();
      const ks = isEncryptedKeystore(text)
        ? await decryptKeystore(JSON.parse(text), workspaceId, passphrase)
        : parseKeystore(text);
      // Só faz sentido importar chaves que o workspace reconhece: senão os campos não abrem.
      const pub = toBase64(x25519PublicKey(privateKey(ks.keys.encryption!)));
      if (!activeEncKeys.some((k) => k.key_id === ks.keys.encryption!.key_id && k.public_key_b64.trim() === pub)) {
        toast({ title: t("sealed.errors.notThisWorkspace"), variant: "destructive" });
        return;
      }
      await protectAndSave(ks);
      toast({ title: t("sealed.imported") });
    } catch (e) {
      toast({
        title: e instanceof WrongPassphraseError ? t("sealed.errors.wrongPassphrase") : t("sealed.errors.badFile"),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function exportBackup() {
    if (!keystore || !strongEnough) return;
    download(`defarm-chaves-${workspaceId}.json`, JSON.stringify(await encryptKeystore(keystore, workspaceId, passphrase), null, 2));
  }

  async function forget() {
    if (!window.confirm(t("sealed.forgetConfirm"))) return;
    await removeEncrypted(workspaceId);
    setKeystore(null);
    setHasLocal(false);
    setPassphrase("");
    setConfirm("");
    setOpened({});
  }

  async function open(f: RecipientSealedField) {
    if (!keystore) return;
    if (!wrapperMatchesEnvelope(f)) {
      toast({ title: t("sealed.errors.mismatch"), variant: "destructive" });
      return;
    }
    try {
      const raw = await openField(f.sealed_field, keystore.keys.encryption!.key_id, privateKey(keystore.keys.encryption!));
      let text = new TextDecoder().decode(raw);
      if (f.content_type === "application/json") {
        try {
          text = JSON.stringify(JSON.parse(text), null, 2);
        } catch {
          /* mostra como veio */
        }
      }
      setOpened((o) => ({ ...o, [f.event_id + f.field_path]: text }));
    } catch {
      toast({ title: t("sealed.errors.openFailed"), variant: "destructive" });
    }
  }

  const passphraseInput = (
    <div className="space-y-1.5">
      <Label htmlFor="pass">{t("sealed.passphrase")}</Label>
      <Input id="pass" type="password" autoComplete="new-password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />
      <p className="text-xs text-muted-foreground">{t("sealed.passphraseHint", { min: MIN_PASSPHRASE })}</p>
    </div>
  );

  return (
    <div className={PARTNER_CANVAS}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Lock className="h-6 w-6 text-primary" />
            {t("sealed.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("sealed.subtitle")}</p>
        </div>

        {/* Chaves deste navegador */}
        <div className="rounded-2xl border border-border p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            {t("sealed.keys.title")}
          </h2>

          {hasLocal === null || encKeys.isLoading ? null : keystore ? (
            <div className="space-y-3">
              <p className="text-sm">
                {myKeyIsActive
                  ? t("sealed.keys.ready")
                  : myEncKeyRegistered
                    ? t("sealed.keys.inactive")
                    : t("sealed.keys.unregistered")}
              </p>
              {!myEncKeyRegistered && (
                <Button onClick={completeRegistration} disabled={busy}>
                  {t("sealed.keys.complete")}
                </Button>
              )}
              <div className="flex flex-wrap gap-2 items-end">
                <div className="min-w-[16rem]">{passphraseInput}</div>
                <Button variant="outline" onClick={exportBackup} disabled={!strongEnough}>
                  <Download className="h-4 w-4 mr-2" />
                  {t("sealed.keys.export")}
                </Button>
                <Button variant="ghost" className="text-muted-foreground" onClick={forget}>
                  {t("sealed.keys.forget")}
                </Button>
              </div>
            </div>
          ) : hasLocal ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t("sealed.keys.locked")}</p>
              {passphraseInput}
              <Button onClick={unlock} disabled={busy || passphrase.length === 0}>
                {t("sealed.keys.unlock")}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {passphraseInput}
              {activeEncKeys.length > 0 ? (
                <p className="text-sm text-muted-foreground">{t("sealed.keys.importOnly")}</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{t("sealed.keys.createHint")}</p>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm">{t("sealed.confirmPassphrase")}</Label>
                    <Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                  </div>
                  <Button onClick={createKeys} disabled={busy || !strongEnough || passphrase !== confirm}>
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    {t("sealed.keys.create")}
                  </Button>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="import">
                  <Upload className="inline h-4 w-4 mr-1" />
                  {t("sealed.keys.import")}
                </Label>
                <Input
                  id="import"
                  type="file"
                  accept="application/json,.json"
                  disabled={busy || !strongEnough}
                  onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])}
                />
              </div>
            </div>
          )}
        </div>

        {/* Caixa de entrada */}
        {keystore && (
          <div className="rounded-2xl border border-border p-6 space-y-4">
            <h2 className="text-lg font-semibold">{t("sealed.inbox.title")}</h2>
            {inbox.isLoading ? null : (inbox.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("sealed.inbox.empty")}</p>
            ) : (
              <ul className="divide-y divide-border">
                {(inbox.data ?? []).map((f) => {
                  const k = f.event_id + f.field_path;
                  const a = authorship[k] ?? "unknown";
                  return (
                    <li key={k} className="py-3 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-sm truncate">{f.dfid}</p>
                          <p className="text-xs text-muted-foreground">
                            {f.field_path} · {new Date(f.occurred_at).toLocaleString(i18n.language)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={a === "ok" ? "secondary" : a === "changed" ? "destructive" : "outline"}
                            title={t(`sealed.inbox.authorshipHint.${a}`)}
                          >
                            {t(`sealed.inbox.authorship.${a}`)}
                          </Badge>
                          <Button size="sm" variant="outline" onClick={() => open(f)}>
                            {t("sealed.inbox.open")}
                          </Button>
                        </div>
                      </div>
                      {opened[k] !== undefined && (
                        <pre className="text-xs bg-muted rounded-lg p-3 whitespace-pre-wrap break-all">{opened[k]}</pre>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
