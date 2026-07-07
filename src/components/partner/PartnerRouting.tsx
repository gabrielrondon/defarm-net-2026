import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { DefaultCircuitCard } from "@/components/partner/DefaultCircuitCard";
import { useToast } from "@/hooks/use-toast";
import { getCircuits } from "@/lib/api/circuits";
import { deleteRoutingRule, listRoutingRules, upsertRoutingRule, type RoutingRule } from "@/lib/api/partner-routing";
import type { Circuit } from "@/lib/api/types";
import { Loader2, Route, Trash2 } from "lucide-react";

// Identificadores oferecidos na regra. O rótulo vem do catálogo portal.enums.routeType
// (mesmo enum do backend usado na ingestão) — value = a string do identifier_type.
const IDENTIFIERS = ["car", "exploracao", "land_dfid", "cnpj", "cpf", "ccir", "nirf", "georef"] as const;

export function PartnerRouting() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [identifierType, setIdentifierType] = useState<string>("car");
  const [identifierValue, setIdentifierValue] = useState("");
  const [circuitId, setCircuitId] = useState("");
  const [saving, setSaving] = useState(false);

  const circuitNameMap = useMemo(
    () => new Map(circuits.map((c) => [c.id, c.name])),
    [circuits]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesData, circuitsData] = await Promise.all([listRoutingRules(), getCircuits()]);
      setRules(rulesData);
      setCircuits(circuitsData);
      // Default só na primeira carga: o updater funcional lê o valor atual (prev),
      // então não precisamos de circuitId na dep-array (o que causava double-fetch,
      // #5) nem corremos o risco de resetar a seleção do usuário em load() manual.
      if (circuitsData[0]) setCircuitId((prev) => prev || circuitsData[0].id);
    } catch {
      toast({ title: t("portal.routing.toasts.loadError"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => { load(); }, [load]);

  const onSaveRule = async () => {
    if (!identifierValue.trim() || !circuitId) return;
    setSaving(true);
    try {
      await upsertRoutingRule({
        identifier_type: identifierType as any,
        identifier_value: identifierValue.trim(),
        circuit_id: circuitId,
      });
      setIdentifierValue("");
      await load();
      toast({ title: t("portal.routing.toasts.ruleSaved") });
    } catch {
      toast({ title: t("portal.routing.toasts.ruleSaveError"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    try {
      await deleteRoutingRule(id);
      await load();
      toast({ title: t("portal.routing.toasts.ruleRemoved") });
    } catch {
      toast({ title: t("portal.routing.toasts.ruleRemoveError"), variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DefaultCircuitCard />

      {/* Add rule */}
      <div className="rounded-xl bg-muted/40 p-4">
        <p className="text-sm font-medium text-foreground mb-3">{t("portal.routing.newRule")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <Select value={identifierType} onValueChange={setIdentifierType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {IDENTIFIERS.map((o) => (
                <SelectItem key={o} value={o}>{t(`portal.enums.routeType.${o}`, { defaultValue: o })}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={identifierValue}
            onChange={(e) => setIdentifierValue(e.target.value)}
            placeholder={t("portal.routing.valuePlaceholder")}
          />
          <Select value={circuitId} onValueChange={setCircuitId}>
            <SelectTrigger><SelectValue placeholder={t("portal.routing.circuitPlaceholder")} /></SelectTrigger>
            <SelectContent>
              {circuits.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={onSaveRule} disabled={saving || !identifierValue.trim() || !circuitId}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("portal.common.save")}
          </Button>
        </div>
      </div>

      {/* Rules list */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
          {t("portal.routing.activeRules", { count: rules.length })}
        </p>
        {rules.length === 0 ? (
          <EmptyState
            icon={Route}
            title={t("portal.routing.empty.title")}
            description={t("portal.routing.empty.desc")}
          />
        ) : (
          <div className="divide-y divide-border rounded-xl border">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="text-muted-foreground text-xs mr-2">{t(`portal.enums.routeType.${rule.identifier_type?.toLowerCase()}`, { defaultValue: rule.identifier_type })}</span>
                    <span className="font-mono">{rule.identifier_value}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    → {circuitNameMap.get(rule.circuit_id) || rule.circuit_id}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => onDelete(rule.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
