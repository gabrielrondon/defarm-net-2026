import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getCircuits } from "@/lib/api/circuits";
import { createEmbedToken, deleteRoutingRule, listRoutingRules, upsertRoutingRule, type RoutingRule } from "@/lib/api/partner-routing";
import type { Circuit } from "@/lib/api/types";
import { Copy, ExternalLink, Loader2, Trash2 } from "lucide-react";

const IDENTIFIERS = [
  { value: "land_dfid", label: "LAND DFID" },
  { value: "car", label: "CAR" },
  { value: "cnpj", label: "CNPJ" },
  { value: "cpf", label: "CPF" },
  { value: "incra", label: "INCRA" },
  { value: "nirf", label: "NIRF" },
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
  const [shareLinks, setShareLinks] = useState<Record<string, { url: string; expiresAt: string }>>({});

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
    } catch (error) {
      toast({
        title: "Erro no roteamento",
        description: "Não foi possível carregar regras de roteamento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, circuitId]);

  useEffect(() => {
    load();
  }, [load]);

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
      toast({ title: "Regra salva", description: "Roteamento atualizado com sucesso." });
    } catch (error) {
      toast({
        title: "Falha ao salvar",
        description: "Não foi possível salvar a regra de roteamento.",
        variant: "destructive",
      });
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
      toast({
        title: "Falha ao remover",
        description: "A regra não pôde ser removida.",
        variant: "destructive",
      });
    }
  };

  const onGenerateEmbed = async (targetCircuitId: string) => {
    try {
      const response = await createEmbedToken({ circuit_id: targetCircuitId, expires_in_minutes: 60 });
      setShareLinks((prev) => ({
        ...prev,
        [targetCircuitId]: { url: response.embed_url, expiresAt: response.expires_at },
      }));
      await navigator.clipboard.writeText(response.embed_url);
      toast({
        title: "Link da página do cliente gerado",
        description: "Link copiado para a área de transferência.",
      });
    } catch {
      toast({
        title: "Erro ao gerar link",
        description: "Não foi possível gerar a página compartilhável deste cliente.",
        variant: "destructive",
      });
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
      <Card className="p-5 space-y-4">
        <h3 className="text-base font-semibold">Roteamento por Cliente</h3>
        <p className="text-sm text-muted-foreground">
          Defina para qual cliente cada identificador deve ir. Isso evita mistura de dados entre clientes.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Select value={identifierType} onValueChange={setIdentifierType}>
            <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              {IDENTIFIERS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={identifierValue}
            onChange={(e) => setIdentifierValue(e.target.value)}
            placeholder="Valor do identificador"
          />
          <Select value={circuitId} onValueChange={setCircuitId}>
            <SelectTrigger><SelectValue placeholder="Circuito destino" /></SelectTrigger>
            <SelectContent>
              {circuits.map((circuit) => (
                <SelectItem key={circuit.id} value={circuit.id}>{circuit.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={onSaveRule} disabled={saving || !identifierValue.trim() || !circuitId}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar regra"}
          </Button>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="text-base font-semibold">Regras Ativas</h3>
        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma regra cadastrada.</p>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <div key={rule.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-lg border p-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{rule.identifier_type}</Badge>
                    <span className="font-mono text-sm">{rule.identifier_value}</span>
                    {rule.auto_created ? <Badge className="bg-amber-100 text-amber-700 border-amber-300">Auto</Badge> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Destino: <span className="text-foreground">{circuitNameMap.get(rule.circuit_id) || rule.circuit_id}</span>
                  </p>
                  {shareLinks[rule.circuit_id] ? (
                    <p className="text-xs text-muted-foreground">
                      Link da página do cliente válido até{" "}
                      {new Date(shareLinks[rule.circuit_id].expiresAt).toLocaleString("pt-BR")}.
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => onGenerateEmbed(rule.circuit_id)}>
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Gerar página do cliente
                  </Button>
                  {shareLinks[rule.circuit_id] ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(shareLinks[rule.circuit_id].url, "_blank", "noopener,noreferrer")}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Abrir página
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const link = shareLinks[rule.circuit_id]?.url || `${window.location.origin}/app/circuitos/${rule.circuit_id}`;
                      await navigator.clipboard.writeText(link);
                      toast({ title: "Link copiado", description: "Link do cliente copiado." });
                    }}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar link
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => onDelete(rule.id)}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remover
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
