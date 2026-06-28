import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import {
  listTestCandidates,
  deprecateData,
  type HygieneCandidate,
} from "@/lib/api/data-hygiene";

export default function AdminDataHygiene() {
  const { toast } = useToast();
  const [days, setDays] = useState("30");
  const [target, setTarget] = useState<HygieneCandidate | null>(null);
  const [reason, setReason] = useState("");
  const [deprecating, setDeprecating] = useState(false);

  const candidatesQuery = useQuery({
    queryKey: ["admin-hygiene-candidates", days],
    queryFn: () => listTestCandidates({ days: Number(days), limit: 200 }),
    retry: false,
  });

  const candidates = candidatesQuery.data?.candidates ?? [];

  const openDeprecate = (c: HygieneCandidate) => {
    setTarget(c);
    setReason(`Higiene de dados: candidato a dado de teste (${c.reason})`);
  };

  const confirmDeprecate = async () => {
    if (!target) return;
    setDeprecating(true);
    try {
      const r = await deprecateData({
        target_type: "item",
        dfid: target.label,
        reason: reason.trim() || "Higiene de dados: dado de teste",
      });
      toast({
        title: "Item deprecado",
        description: `${r.result.item_dfid ?? target.label} · registros: ${r.result.inserted_records} · refs: ${r.result.deprecated_storage_refs} · âncoras: ${r.result.deprecated_anchors}`,
      });
      setTarget(null);
      candidatesQuery.refetch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: "Falha ao deprecar", description: msg, variant: "destructive" });
    } finally {
      setDeprecating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <p className="section-label mb-1">Admin</p>
        <h1 className="text-foreground">Higiene de dados</h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
          Candidatos a dado de teste (nome/DFID/metadata sugerem teste). A deprecação é{" "}
          <strong>lógica e reversível</strong> (registrada em auditoria), não apaga dados. Apenas
          itens podem ser deprecados aqui — circuitos aparecem para conferência.
        </p>
      </div>

      <Card className="p-4 md:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Janela</Label>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="365">Último ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={() => candidatesQuery.refetch()} disabled={candidatesQuery.isFetching}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${candidatesQuery.isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <div className="ml-auto text-sm text-muted-foreground">
            {candidatesQuery.data ? `${candidatesQuery.data.count} candidato(s)` : ""}
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        {candidatesQuery.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : candidatesQuery.isError ? (
          <div className="p-6 text-sm text-destructive">
            Falha ao carregar candidatos. {(candidatesQuery.error as Error)?.message}
          </div>
        ) : candidates.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            Nenhum candidato a dado de teste nesta janela.
          </div>
        ) : (
          <div className="divide-y">
            {candidates.map((c) => (
              <div key={`${c.entity_type}:${c.id}`} className="flex items-center gap-3 p-3">
                <Badge variant={c.entity_type === "item" ? "default" : "secondary"} className="shrink-0">
                  {c.entity_type === "item" ? "item" : "circuito"}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs truncate">{c.label}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {new Date(c.created_at).toLocaleString("pt-BR")} · {c.reason}
                  </p>
                </div>
                {c.entity_type === "item" ? (
                  <Button variant="outline" size="sm" className="shrink-0" onClick={() => openDeprecate(c)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Deprecar
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground shrink-0">deprecação de circuito não suportada aqui</span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deprecar item</DialogTitle>
            <DialogDescription>
              Deprecação lógica e reversível de <span className="font-mono">{target?.label}</span>. O
              item sai da superfície pública/ativa; nada é apagado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-xs">Motivo (auditoria)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTarget(null)} disabled={deprecating}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDeprecate} disabled={deprecating}>
              {deprecating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
              Deprecar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
