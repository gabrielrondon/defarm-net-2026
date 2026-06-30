import { useCallback, useEffect, useMemo, useState } from "react";
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

const IDENTIFIERS = [
  { value: "car", label: "CAR" },
  { value: "land_dfid", label: "LAND DFID" },
  { value: "cnpj", label: "CNPJ" },
  { value: "cpf", label: "CPF" },
  { value: "ccir", label: "CCIR" },
  { value: "nirf", label: "NIRF" },
  { value: "georef", label: "GEOREF" },
] as const;

export function PartnerRouting() {
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
      if (!circuitId && circuitsData[0]) setCircuitId(circuitsData[0].id);
    } catch {
      toast({ title: "Erro ao carregar roteamento", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, circuitId]);

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
      toast({ title: "Regra salva" });
    } catch {
      toast({ title: "Falha ao salvar regra", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    try {
      await deleteRoutingRule(id);
      await load();
      toast({ title: "Regra removida" });
    } catch {
      toast({ title: "Falha ao remover", variant: "destructive" });
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
        <p className="text-sm font-medium text-foreground mb-3">Nova regra</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <Select value={identifierType} onValueChange={setIdentifierType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {IDENTIFIERS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={identifierValue}
            onChange={(e) => setIdentifierValue(e.target.value)}
            placeholder="Valor"
          />
          <Select value={circuitId} onValueChange={setCircuitId}>
            <SelectTrigger><SelectValue placeholder="Circuito" /></SelectTrigger>
            <SelectContent>
              {circuits.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={onSaveRule} disabled={saving || !identifierValue.trim() || !circuitId}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
          </Button>
        </div>
      </div>

      {/* Rules list */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
          Regras ativas · {rules.length}
        </p>
        {rules.length === 0 ? (
          <EmptyState
            icon={Route}
            title="Nenhuma regra"
            description="Crie a primeira regra acima."
          />
        ) : (
          <div className="divide-y divide-border rounded-xl border">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="text-muted-foreground text-xs uppercase mr-2">{rule.identifier_type}</span>
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
