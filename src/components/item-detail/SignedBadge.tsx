import { BadgeCheck } from "lucide-react";

/**
 * The cryptographic attribution seal shown on the public item timeline.
 * `true`  -> green "✓ assinado" (the issuer's signature verifies against its key);
 * `false` -> amber "assinatura inválida" (a signature is present but does not verify);
 * `null`/`undefined` -> nothing (unsigned).
 */
export function SignedBadge({
  signatureVerified,
  signatureKeyId,
  size = "sm",
}: {
  signatureVerified?: boolean | null;
  signatureKeyId?: string | null;
  size?: "sm" | "xs";
}) {
  if (signatureVerified !== true && signatureVerified !== false) return null;
  const textSize = size === "xs" ? "text-[10px]" : "";

  if (signatureVerified === true) {
    return (
      <span
        className={`inline-flex items-center gap-0.5 font-medium text-emerald-600 ${textSize}`}
        title={`Assinatura verificada criptograficamente${
          signatureKeyId ? ` — chave ${signatureKeyId}` : ""
        }`}
      >
        · <BadgeCheck className="h-3 w-3" /> assinado
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-amber-600 ${textSize}`}
      title="Este evento traz uma assinatura que NÃO foi verificada contra a chave do emissor"
    >
      · <BadgeCheck className="h-3 w-3" /> assinatura inválida
    </span>
  );
}
