import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type WithMetadata = { metadata?: Record<string, unknown> | null } | null | undefined;

/** Circuito com selo "Verificado pela DeFarm" (metadata.verified, concedido pelo admin). */
export function isVerified(circuit: WithMetadata): boolean {
  return (circuit?.metadata as Record<string, unknown> | null | undefined)?.verified === true;
}

/** Selo de confiança. `compact` mostra só o ícone (pra listas densas). */
export function VerifiedBadge({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      title="Verificado pela DeFarm"
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary font-medium",
        compact ? "p-0.5" : "text-[11px] px-2 py-0.5",
        className,
      )}
    >
      <BadgeCheck className="h-3.5 w-3.5 shrink-0" />
      {compact ? null : "Verificado pela DeFarm"}
    </span>
  );
}
