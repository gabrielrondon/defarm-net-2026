import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Moldura padrão das páginas do parceiro (redesign, rodada de consistência):
 * canvas off-white da marca escopado via bleed do <main>, container único e
 * header eyebrow + h1 + subtítulo. Antes desta rodada o conjunto tinha 9
 * larguras de container e 5 variações de h1 — este componente mata a deriva.
 */
export const PARTNER_CANVAS =
  "-m-4 lg:-m-6 min-h-full p-4 lg:p-6 bg-[hsl(60,18%,96%)] dark:bg-background";

interface PartnerPageProps {
  /** Eyebrow (já traduzido), ex.: "Operação". */
  section: string;
  title: ReactNode;
  /** Badge inline ao lado do h1 (ex.: Beta). */
  titleBadge?: ReactNode;
  subtitle?: ReactNode;
  /** Ações à direita do header (botões primários da página). */
  actions?: ReactNode;
  /** wide = padrão (home, listas); focused = fluxos de foco (forms, wizard). */
  width?: "wide" | "focused";
  children: ReactNode;
}

export function PartnerPage({
  section,
  title,
  titleBadge,
  subtitle,
  actions,
  width = "wide",
  children,
}: PartnerPageProps) {
  return (
    <div className={PARTNER_CANVAS}>
      <div className={cn("mx-auto space-y-6", width === "wide" ? "max-w-6xl" : "max-w-3xl")}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="section-label mb-1">{section}</p>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-foreground">{title}</h1>
              {titleBadge}
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{subtitle}</p>
            )}
          </div>
          {actions && <div className="shrink-0 pt-1">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}
