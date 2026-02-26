import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/hooks/use-toast";
import { getCircuits } from "@/lib/api/circuits";
import { createEmbedToken, deleteRoutingRule, listRoutingRules, upsertRoutingRule, type RoutingRule } from "@/lib/api/partner-routing";
import type { Circuit } from "@/lib/api/types";
import { Copy, ExternalLink, Loader2, Route, Trash2 } from "lucide-react";

const IDENTIFIERS = [
  { value: "land_dfid", label: "LAND DFID" },
  { value: "car", label: "CAR" },
  { value: "ccir", label: "CCIR" },
  { value: "cib", label: "CIB" },
  { value: "cnpj", label: "CNPJ" },
  { value: "cpf", label: "CPF" },
  { value: "incra", label: "INCRA" },
  { value: "nirf", label: "NIRF" },
  { value: "matricula", label: "MATRÍCULA" },
  { value: "georef", label: "GEOREF (município/UF ou referência geográfica)" },
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
        description: "Link copiado para a área de transferência. Você também pode copiar o snippet de embed.",
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
    <div className="space-y-8">
      {/* New rule form */}
      <div>
        <p className="section-label mb-1">Roteamento</p>
        <h2 className="text-foreground">Roteamento por Cliente</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-lg">
          Defina para qual circuito cada identificador deve ir. Evita mistura de dados entre clientes.
        </p>
      </div>

      <Card className="p-4 space-y-3">
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

      {/* Active rules */}
      <div>
        <p className="section-label mb-3">Regras ativas · {rules.length}</p>
        {rules.length === 0 ? (
          <EmptyState
            icon={Route}
            title="Nenhuma regra cadastrada"
            description="Crie a primeira regra de roteamento acima para direcionar dados ao circuito correto."
          />
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <Card key={rule.id} className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {rule.identifier_type}
                      </span>
                      <span className="font-mono text-sm text-foreground truncate">{rule.identifier_value}</span>
                      {rule.auto_created && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">auto</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      → {circuitNameMap.get(rule.circuit_id) || rule.circuit_id}
                    </p>
                    {shareLinks[rule.circuit_id] && (
                      <p className="text-xs text-muted-foreground">
                        Link válido até {new Date(shareLinks[rule.circuit_id].expiresAt).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onGenerateEmbed(rule.circuit_id)}>
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      Página cliente
                    </Button>
                    {shareLinks[rule.circuit_id] && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => window.open(shareLinks[rule.circuit_id].url, "_blank", "noopener,noreferrer")}
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          Abrir
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={async () => {
                            const snippet = `<iframe src="${shareLinks[rule.circuit_id].url}" width="100%" height="720" style="border:0;border-radius:12px;" loading="lazy"></iframe>`;
                            await navigator.clipboard.writeText(snippet);
                            toast({ title: "Snippet copiado", description: "Cole no portal do seu cliente." });
                          }}
                        >
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          Embed
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={async () => {
                        const link = shareLinks[rule.circuit_id]?.url || `${window.location.origin}/app/circuitos/${rule.circuit_id}`;
                        await navigator.clipboard.writeText(link);
                        toast({ title: "Link copiado" });
                      }}
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Link
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive" onClick={() => onDelete(rule.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
