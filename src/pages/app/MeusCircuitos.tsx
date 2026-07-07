import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { getCircuits } from "@/lib/api/circuits";
import {
  getPartnerDefaultCircuit,
  updatePartnerDefaultCircuit,
} from "@/lib/api/partner-routing";
import type { Circuit } from "@/lib/api/types";
import { Star, Info, Copy, Plus, ArrowRight, Circle } from "lucide-react";
import { VerifiedBadge, isVerified } from "@/components/circuit/VerifiedBadge";
import { cn } from "@/lib/utils";

// Identificadores de TERRA/propriedade — circuito auto-criado por um deles = "de propriedade".
const PROPERTY_IDENTIFIERS = [
  "car",
  "exploracao",
  "land_dfid",
  "ccir",
  "nirf",
  "cib",
  "matricula",
  "georef",
  "inscricao_estadual",
];

// Circuitos auto-criados carregam metadata.auto_provisioned=true + routing_identifier_type (engine).
const isAutoProvisioned = (c: Circuit) =>
  (c.metadata as Record<string, unknown> | null | undefined)?.auto_provisioned === true;
const routingType = (c: Circuit) =>
  String((c.metadata as Record<string, unknown> | null | undefined)?.routing_identifier_type ?? "").toLowerCase();

export default function MeusCircuitos() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const circuitsQuery = useQuery({ queryKey: ["circuits"], queryFn: () => getCircuits() });
  const defaultQuery = useQuery({
    queryKey: ["partner-default-circuit"],
    queryFn: getPartnerDefaultCircuit,
  });

  const setDefault = useMutation({
    mutationFn: (circuitId: string) => updatePartnerDefaultCircuit(circuitId),
    onSuccess: (data) => {
      toast({
        title: t("portal.circuits.mine.defaultUpdatedTitle"),
        description: t("portal.circuits.mine.defaultUpdatedDesc", { name: data.name }),
      });
      qc.invalidateQueries({ queryKey: ["partner-default-circuit"] });
    },
    onError: () =>
      toast({ title: t("portal.circuits.mine.defaultUpdateError"), variant: "destructive" }),
  });

  const copy = (text: string, what: string) => {
    void navigator.clipboard.writeText(text);
    toast({ title: t("portal.circuits.mine.copied", { what }) });
  };

  const defaultId = defaultQuery.data?.circuit_id;

  // Exemplo de payload: o padrão recebe sem apontar (2 campos); os demais precisam
  // da 3ª linha com o circuit_id apontando pra este circuito.
  const payloadFor = (c: Circuit, isDefault: boolean) => {
    const idComment = t("portal.circuits.mine.payload.identifierComment");
    const vcComment = t("portal.circuits.mine.payload.valueChainComment");
    const ciComment = t("portal.circuits.mine.payload.circuitIdComment");
    if (isDefault) {
      return `[
  {
    "sisbov": "105705000000120",   // ${idComment}
    "value_chain": "BEEF"           // ${vcComment}
  }
]`;
    }
    const ref = c.slug || c.id;
    return `[
  {
    "sisbov": "105705000000120",   // ${idComment}
    "value_chain": "BEEF",          // ${vcComment}
    "circuit_id": "${ref}"          // ${ciComment}
  }
]`;
  };

  // Particiona: meus (não auto) em cima; propriedades e clientes (auto) separados.
  const { mine, properties, clients } = useMemo(() => {
    const all = circuitsQuery.data ?? [];
    const mine: Circuit[] = [];
    const properties: Circuit[] = [];
    const clients: Circuit[] = [];
    for (const c of all) {
      if (!isAutoProvisioned(c)) mine.push(c);
      else if (PROPERTY_IDENTIFIERS.includes(routingType(c))) properties.push(c);
      else clients.push(c);
    }
    // Meus: padrão primeiro, depois alfabético. Auto-criados: alfabético.
    // Ordem: padrão → verificados (destaque) → alfabético.
    const rank = (c: Circuit) => (c.id === defaultId ? 0 : isVerified(c) ? 1 : 2);
    mine.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
    properties.sort((a, b) => a.name.localeCompare(b.name));
    clients.sort((a, b) => a.name.localeCompare(b.name));
    return { mine, properties, clients };
  }, [circuitsQuery.data, defaultId]);

  const total = mine.length + properties.length + clients.length;

  const renderCard = (c: Circuit) => {
    const isDefault = c.id === defaultId;
    const targetRef = c.slug || c.id;
    return (
      <Card
        key={c.id}
        className={cn(
          "overflow-hidden",
          isDefault || isVerified(c) ? "border-primary/50 ring-1 ring-primary/20" : "",
        )}
      >
        {c.public_banner_url ? (
          <div className="h-24 w-full bg-muted">
            <img src={c.public_banner_url} alt="" className="h-full w-full object-cover" />
          </div>
        ) : null}
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <Link
              to={`/app/circuitos/${c.id}`}
              className="font-semibold text-foreground hover:underline truncate"
            >
              {c.name}
            </Link>
            {isDefault ? (
              <Badge className="shrink-0 gap-1">
                <Star className="h-3 w-3" /> {t("portal.circuits.mine.defaultBadge")}
              </Badge>
            ) : (
              <Badge variant="outline" className="shrink-0 text-[10px]">
                {t(`portal.enums.circuitVisibility.${c.visibility?.toLowerCase()}`, { defaultValue: c.visibility })}
              </Badge>
            )}
          </div>

          {isVerified(c) ? <VerifiedBadge /> : null}

          {isDefault ? (
            <p className="text-xs text-muted-foreground">
              <Trans i18nKey="portal.circuits.mine.defaultCardHint" components={{ strong: <strong /> }} />
            </p>
          ) : (
            <div className="text-xs text-muted-foreground space-y-1">
              <p>{t("portal.circuits.mine.pointHere")}</p>
              <button
                type="button"
                onClick={() => copy(targetRef, t("portal.circuits.mine.copyCircuitIdentifier"))}
                className="font-mono text-[11px] text-foreground inline-flex items-center gap-1 hover:text-primary"
              >
                {targetRef} <Copy className="h-3 w-3" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            {isDefault ? (
              <span className="text-[11px] text-primary inline-flex items-center gap-1">
                <Circle className="h-2 w-2 fill-current" /> {t("portal.circuits.mine.receivingDefault")}
              </span>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDefault.mutate(c.id)}
                disabled={setDefault.isPending}
              >
                <Star className="h-3.5 w-3.5 mr-1" /> {t("portal.circuits.mine.makeDefault")}
              </Button>
            )}

            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-primary"
                  aria-label={t("portal.circuits.mine.howToSendAria")}
                >
                  <Info className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground">
                    {t("portal.circuits.mine.howToSendTitle", { name: c.name })}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {isDefault
                      ? t("portal.circuits.mine.howDefault")
                      : t("portal.circuits.mine.howNonDefault")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {isDefault
                      ? t("portal.circuits.mine.minDefault")
                      : t("portal.circuits.mine.minNonDefault")}
                  </p>
                  <pre className="bg-muted/50 rounded-md p-2 text-[10px] font-mono overflow-x-auto text-foreground">
                    {payloadFor(c, isDefault)}
                  </pre>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => copy(payloadFor(c, isDefault), t("portal.circuits.mine.copyExampleLabel"))}
                    >
                      <Copy className="h-3 w-3 mr-1" /> {t("portal.circuits.mine.copyExample")}
                    </Button>
                    <Button asChild size="sm" variant="ghost" className="text-xs h-7">
                      <Link to="/app/parceiro/ingestao">
                        {t("portal.reception.sendData")} <ArrowRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>
    );
  };

  const section = (title: string, hint: string, list: Circuit[]) =>
    list.length === 0 ? null : (
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {title} <span className="text-muted-foreground/60">· {list.length}</span>
          </h2>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map(renderCard)}
        </div>
      </div>
    );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("portal.circuits.mine.title")}</h1>
          <p className="text-sm text-muted-foreground">
            <Trans
              i18nKey="portal.circuits.mine.subtitle"
              components={{ strong: <strong />, icon: <Info className="inline h-3.5 w-3.5" /> }}
            />
          </p>
        </div>
        <Button asChild>
          <Link to="/app/circuitos/novo">
            <Plus className="h-4 w-4 mr-1" /> {t("portal.circuits.mine.newCircuit")}
          </Link>
        </Button>
      </div>

      {circuitsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">{t("portal.common.loading")}</p>
      ) : total === 0 ? (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("portal.circuits.mine.empty")}
            </p>
            <Button asChild>
              <Link to="/app/circuitos/novo">
                <Plus className="h-4 w-4 mr-1" /> {t("portal.circuits.mine.createFirst")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {section(
            t("portal.circuits.mine.sections.mineTitle"),
            t("portal.circuits.mine.sections.mineHint"),
            mine,
          )}
          {section(
            t("portal.circuits.mine.sections.propertiesTitle"),
            t("portal.circuits.mine.sections.propertiesHint"),
            properties,
          )}
          {section(
            t("portal.circuits.mine.sections.clientsTitle"),
            t("portal.circuits.mine.sections.clientsHint"),
            clients,
          )}
        </>
      )}
    </div>
  );
}
