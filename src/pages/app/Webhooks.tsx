import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getCircuits } from "@/lib/api/circuits";
import { createWebhook, deleteWebhook, getWebhooks, updateWebhook } from "@/lib/api/webhooks";
import type { Circuit, Webhook } from "@/lib/api/types";
import { Copy, Loader2, Trash2, Webhook as WebhookIcon } from "lucide-react";

export default function WebhooksPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [circuitId, setCircuitId] = useState("");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [eventsText, setEventsText] = useState("item_created,event_created");
  const [secret, setSecret] = useState("");

  const circuitNameMap = useMemo(() => new Map(circuits.map((c) => [c.id, c.name])), [circuits]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [circuitsData, webhooksData] = await Promise.all([getCircuits(), getWebhooks()]);
      setCircuits(circuitsData);
      setWebhooks(webhooksData);
      if (!circuitId && circuitsData[0]) setCircuitId(circuitsData[0].id);
    } catch {
      toast({
        title: "Erro ao carregar webhooks",
        description: "Não foi possível buscar os webhooks.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, circuitId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!user?.id || !circuitId || !name.trim() || !url.trim()) return;
    const events = eventsText
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    if (events.length === 0) {
      toast({ title: "Informe ao menos 1 evento", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      await createWebhook({
        circuit_id: circuitId,
        name: name.trim(),
        url: url.trim(),
        events,
        created_by: user.id,
        secret: secret.trim() || undefined,
      });
      setName("");
      setUrl("");
      setSecret("");
      setEventsText("item_created,event_created");
      toast({ title: "Webhook criado", description: "Entrega automática ativada para este circuito." });
      await load();
    } catch (error) {
      toast({
        title: "Falha ao criar webhook",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (webhook: Webhook) => {
    try {
      await updateWebhook(webhook.id, { is_active: !webhook.is_active });
      toast({ title: webhook.is_active ? "Webhook pausado" : "Webhook ativado" });
      await load();
    } catch (error) {
      toast({
        title: "Falha ao atualizar webhook",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (webhook: Webhook) => {
    try {
      await deleteWebhook(webhook.id);
      toast({ title: "Webhook removido" });
      await load();
    } catch (error) {
      toast({
        title: "Falha ao remover webhook",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Webhooks</h1>
        <p className="text-sm text-muted-foreground">
          Receba notificações automáticas no seu sistema quando houver atualizações relevantes.
        </p>
      </div>

      <Card className="p-5 space-y-4">
        <h2 className="text-base font-semibold">Novo webhook</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Circuito</Label>
            <Select value={circuitId} onValueChange={setCircuitId}>
              <SelectTrigger><SelectValue placeholder="Selecione o circuito" /></SelectTrigger>
              <SelectContent>
                {circuits.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Atualização de lote" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>URL de destino</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://seu-sistema.com/webhooks/defarm" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Eventos (separados por vírgula)</Label>
            <Input value={eventsText} onChange={(e) => setEventsText(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Segredo (opcional)</Label>
            <Input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Assinatura de segurança" />
          </div>
        </div>
        <Button onClick={handleCreate} disabled={saving || !circuitId || !name.trim() || !url.trim()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Criar webhook
        </Button>
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="text-base font-semibold">Webhooks cadastrados</h2>
        {webhooks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum webhook cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {webhooks.map((webhook) => (
              <div key={webhook.id} className="rounded-lg border p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <WebhookIcon className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium text-sm">{webhook.name}</p>
                    <Badge variant={webhook.is_active ? "default" : "secondary"}>
                      {webhook.is_active ? "Ativo" : "Pausado"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{webhook.url}</p>
                  <p className="text-xs text-muted-foreground">
                    Circuito: {circuitNameMap.get(webhook.circuit_id) || webhook.circuit_id}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await navigator.clipboard.writeText(webhook.url);
                      toast({ title: "URL copiada" });
                    }}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar URL
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleToggle(webhook)}>
                    {webhook.is_active ? "Pausar" : "Ativar"}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(webhook)}>
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
