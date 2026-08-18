import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  ExternalLink,
  Globe,
  KeyRound,
  Settings,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { listPartnerApiKeys } from "@/lib/api/admin";
import { listRawPayloads, listRoutingIssues } from "@/lib/api/partner-routing";
import { getMyUsage } from "@/lib/api/partner-entitlements";

/**
 * Os 4 botões grandes da home do parceiro (fase 1 do redesign, fiel ao mock
 * "Home do Parceiro" do design system): Minha chave · Enviar dados · O que
 * aconteceu · Minha vitrine. O checklist de primeiros passos vira ESTADO dos
 * botões (feito ✓ / próximo passo destacado), no espírito Duolingo: um caminho
 * condicionado, não uma lista. Tudo o resto vive no rodapé "Avançado".
 */

// Tempo relativo curto ("há 2 h") na língua da UI, sem dependência nova.
function fmtRelative(iso: string, lang: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto", style: "narrow" });
  const mins = Math.round(diffMs / 60_000);
  if (mins < 60) return rtf.format(-Math.max(mins, 1), "minute");
  const hours = Math.round(mins / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  return rtf.format(-Math.round(hours / 24), "day");
}

/** Linha discreta de uso no header — substitui o card grande de Saldo & status. */
export function PartnerUsageInline() {
  const { t } = useTranslation();
  const usageQuery = useQuery({
    queryKey: ["partner-usage"],
    queryFn: getMyUsage,
    retry: false,
  });
  if (usageQuery.isError || !usageQuery.data) return null;
  const u = usageQuery.data;
  const unlimited = !u.entitlement_provisioned;

  return (
    <p className="text-xs text-muted-foreground text-right">
      {t("portal.home.usageLine", { total: u.tokenizations_total })}
      {" · "}
      {unlimited ? t("portal.home.usageUnlimited") : t("portal.home.usageBalance", { n: u.balance_remaining })}
      {u.holds_pending > 0 && (
        <>
          {" · "}
          <span className="text-amber-700 dark:text-amber-400">
            {t("portal.home.usageHolds", { n: u.holds_pending })}
          </span>{" "}
          <Link to="/contato" className="underline underline-offset-2 hover:text-foreground">
            {t("portal.home.requestBalance")}
          </Link>
        </>
      )}
    </p>
  );
}

interface EssentialCard {
  key: "apiKey" | "send" | "activity" | "showcase";
  to: string;
  icon: typeof KeyRound;
  /** Família de cor do chip do ícone — colorido com calma, um matiz por ação. */
  chip: string;
}

const CARDS: EssentialCard[] = [
  {
    key: "apiKey",
    to: "/app/api-keys",
    icon: KeyRound,
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  },
  {
    key: "send",
    to: "/app/parceiro/ingestao",
    icon: Upload,
    chip: "bg-primary/10 text-primary",
  },
  {
    key: "activity",
    to: "/app/parceiro/logs",
    icon: Activity,
    chip: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400",
  },
  {
    key: "showcase",
    to: "/app/parceiro/embed",
    icon: Globe,
    chip: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400",
  },
];

export function PartnerEssentials() {
  const { t, i18n } = useTranslation();

  const keysQuery = useQuery({ queryKey: ["partner-api-keys-home"], queryFn: listPartnerApiKeys });
  const lastUploadQuery = useQuery({
    queryKey: ["partner-last-upload"],
    queryFn: () => listRawPayloads(1),
  });
  const issuesQuery = useQuery({ queryKey: ["partner-routing-issues-home"], queryFn: listRoutingIssues });

  const activeKey = useMemo(
    () => (keysQuery.data ?? []).filter((k) => k.is_active).sort((a, b) => (b.last_used_at ?? "").localeCompare(a.last_used_at ?? ""))[0],
    [keysQuery.data]
  );
  const lastUpload = lastUploadQuery.data?.rows?.[0];
  const pendingIssues = issuesQuery.data?.count ?? 0;

  // O próximo passo do caminho condicionado: sem chave → "Minha chave";
  // com chave e sem envio → "Enviar dados"; rotina estabelecida → "Enviar
  // dados" segue como ação principal, sem badge.
  const hero: EssentialCard["key"] = !activeKey ? "apiKey" : "send";
  const heroBadge = !activeKey
    ? t("portal.home.badgeStart")
    : !lastUpload
      ? t("portal.home.badgeContinue")
      : null;

  const statusOf = (key: EssentialCard["key"]): { text: string; tone: "done" | "next" | "info" | "warn" } => {
    switch (key) {
      case "apiKey":
        if (!activeKey) return { text: t("portal.home.keyCta"), tone: "next" };
        return {
          text: activeKey.last_used_at
            ? t("portal.home.keyUsed", { when: fmtRelative(activeKey.last_used_at, i18n.language) })
            : t("portal.home.keyActive"),
          tone: "done",
        };
      case "send":
        return { text: t("portal.home.sendCta"), tone: "next" };
      case "activity":
        if (pendingIssues > 0) return { text: t("portal.home.activityIssues", { count: pendingIssues }), tone: "warn" };
        if (lastUpload) return { text: t("portal.home.activityLast", { when: fmtRelative(lastUpload.created_at, i18n.language) }), tone: "info" };
        return { text: t("portal.home.activityNone"), tone: "info" };
      case "showcase":
        return { text: `${t("portal.home.showcaseCta")} →`, tone: "next" };
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CARDS.map((card) => {
          const isHero = card.key === hero;
          const status = statusOf(card.key);
          return (
            <Link
              key={card.key}
              to={card.to}
              className={cn(
                "relative flex flex-col gap-3 rounded-xl border bg-card p-5 min-h-[168px] transition-all",
                "hover:shadow-md hover:-translate-y-0.5",
                isHero
                  ? "border-primary ring-1 ring-primary shadow-sm"
                  : "border-border hover:border-muted-foreground/40"
              )}
            >
              {isHero && heroBadge && (
                <Badge className="absolute -top-2.5 right-4 bg-primary text-primary-foreground hover:bg-primary text-[10px] uppercase tracking-wide">
                  {heroBadge}
                </Badge>
              )}
              <span className={cn("w-10 h-10 rounded-lg grid place-items-center", card.chip)}>
                <card.icon className="h-5 w-5" />
              </span>
              <h3 className="text-base font-semibold text-foreground">
                {t(`portal.home.${card.key}Title`)}
              </h3>
              <p className="text-[13px] leading-snug text-muted-foreground">
                {t(`portal.home.${card.key}Desc`)}
              </p>
              {/* Estado do botão = checklist absorvido: feito / próximo / info */}
              {isHero && card.key === "send" ? (
                <span className="mt-auto rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold text-center py-2">
                  {status.text}
                </span>
              ) : (
                <span
                  className={cn(
                    "mt-auto text-xs font-medium flex items-center gap-1.5",
                    status.tone === "done" && "text-primary",
                    status.tone === "next" && "text-primary",
                    status.tone === "warn" && "text-amber-700 dark:text-amber-400",
                    status.tone === "info" && "text-muted-foreground"
                  )}
                >
                  {status.tone === "done" && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {status.text}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Rodapé "Avançado" — espelha o grupo colapsável do menu */}
      <div className="mt-6 flex items-center gap-x-5 gap-y-1.5 flex-wrap text-[13px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Settings className="h-3.5 w-3.5" />
          {t("portal.home.advanced")}
        </span>
        <Link to="/app/parceiro/roteamento" className="hover:text-primary transition-colors">
          {t("portal.home.advRouting")}
        </Link>
        <Link to="/app/webhooks" className="hover:text-primary transition-colors">
          Webhooks
        </Link>
        <Link to="/app/cli" className="hover:text-primary transition-colors">
          CLI
        </Link>
        <Link to="/app/sdk" className="hover:text-primary transition-colors">
          SDK
        </Link>
        <Link to="/app/parceiro/kit" className="hover:text-primary transition-colors">
          {t("portal.home.advKit")}
        </Link>
        <a
          href="https://docs.defarm.net/docs/getting-started"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 hover:text-primary transition-colors"
        >
          Docs
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
