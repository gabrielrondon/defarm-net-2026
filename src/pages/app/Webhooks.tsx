import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getCircuits } from "@/lib/api/circuits";
import {
  createWebhook,
  deleteWebhook,
  getWebhookDeliveries,
  getWebhooks,
  getWebhookStats,
  updateWebhook,
} from "@/lib/api/webhooks";
import type { Circuit, Webhook, WebhookDelivery, WebhookStats } from "@/lib/api/types";
import { AlertTriangle, CheckCircle2, Clock3, Copy, FlaskConical, Loader2, RefreshCw, Trash2, Webhook as WebhookIcon, XCircle } from "lucide-react";

type WebhookHealth = {
  loading: boolean;
  stats?: WebhookStats;
  lastDelivery?: WebhookDelivery | null;
  deliveryCount?: number;
  error?: string;
};

function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function parseDeliveryError(delivery?: WebhookDelivery | null): { summary: string; details?: string } | null {
  if (!delivery) return null;

  if (delivery.status === "delivered") {
    return { summary: "Entrega concluída com sucesso" };
  }

  if (delivery.status === "pending") {
    if (delivery.next_retry_at) {
      return {
        summary: "Entrega pendente, nova tentativa agendada",
        details: `Próxima tentativa: ${formatDateTime(delivery.next_retry_at)}`,
      };
    }
    return { summary: "Entrega pendente na fila" };
  }

  const message = (delivery.error_message || "").trim();
  if (!message) {
    return { summary: "Falha de entrega", details: "Sem detalhes retornados pelo destino." };
  }

  const match = message.match(/status\s+(\d{3}):\s*(.*)$/i);
  if (match) {
    const statusCode = match[1];
    const rawTail = (match[2] || "").trim();

    try {
      const parsed = JSON.parse(rawTail) as {
        error?: { message?: string };
        message?: string;
      };
      const targetMessage = parsed?.error?.message || parsed?.message || rawTail;
      return {
        summary: `Falha HTTP ${statusCode}`,
        details: targetMessage,
      };
    } catch {
      return {
        summary: `Falha HTTP ${statusCode}`,
        details: rawTail,
      };
    }
  }

  return { summary: "Falha de entrega", details: message };
}

function resolveHealthBadge(health?: WebhookHealth): { label: string; variant: "default" | "secondary" | "destructive"; icon: ReactNode } {
  if (!health || health.loading) {
    return {
      label: "Verificando",
      variant: "secondary",
      icon: <Clock3 className="h-3.5 w-3.5" />,
    };
  }

  if (health.error) {
    return {
      label: "Erro de diagnóstico",
      variant: "destructive",
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
    };
  }

  const status = health.lastDelivery?.status;
  if (status === "delivered") {
    return {
      label: "Saudável",
      variant: "default",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    };
  }
  if (status === "failed") {
    return {
      label: "Falhando",
      variant: "destructive",
      icon: <XCircle className="h-3.5 w-3.5" />,
    };
  }

  return {
    label: "Aguardando",
    variant: "secondary",
    icon: <Clock3 className="h-3.5 w-3.5" />,
  };
}

export default function WebhooksPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [healthById, setHealthById] = useState<Record<string, WebhookHealth>>({});
  const [circuitId, setCircuitId] = useState("");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [eventsText, setEventsText] = useState("item_created,event_created");
  const [secret, setSecret] = useState("");

  const circuitNameMap = useMemo(() => new Map(circuits.map((c) => [c.id, c.name])), [circuits]);

  const loadHealth = useCallback(async (currentWebhooks: Webhook[]) => {
    if (currentWebhooks.length === 0) {
      setHealthById({});
      return;
    }

    setHealthLoading(true);
    setHealthById((prev) => {
      const next: Record<string, WebhookHealth> = { ...prev };
      for (const webhook of currentWebhooks) {
        next[webhook.id] = { ...(next[webhook.id] || {}), loading: true };
      }
      return next;
    });

    const healthEntries = await Promise.all(
      currentWebhooks.map(async (webhook) => {
        try {
          const [stats, deliveries] = await Promise.all([
            getWebhookStats(webhook.id),
            getWebhookDeliveries(webhook.id, 5),
          ]);
          return [
            webhook.id,
            {
              loading: false,
              stats,
              lastDelivery: deliveries[0] || null,
              deliveryCount: deliveries.length,
            } satisfies WebhookHealth,
          ] as const;
        } catch (error) {
          return [
            webhook.id,
            {
              loading: false,
              error: error instanceof Error ? error.message : "Falha ao carregar diagnóstico",
            } satisfies WebhookHealth,
          ] as const;
        }
      })
    );

    setHealthById(Object.fromEntries(healthEntries));
    setHealthLoading(false);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [circuitsData, webhooksData] = await Promise.all([getCircuits(), getWebhooks()]);
      setCircuits(circuitsData);
      setWebhooks(webhooksData);
      if (!circuitId && circuitsData[0]) setCircuitId(circuitsData[0].id);
      await loadHealth(webhooksData);
    } catch {
      toast({
        title: "Erro ao carregar webhooks",
        description: "Não foi possível buscar os webhooks.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, circuitId, loadHealth]);

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

  const healthSummary = useMemo(() => {
    const total = webhooks.length;
    const active = webhooks.filter((w) => w.is_active).length;

    let delivered = 0;
    let failed = 0;
    let totalDeliveries = 0;
    let pending = 0;

    for (const webhook of webhooks) {
      const health = healthById[webhook.id];
      if (health?.stats) {
        delivered += health.stats.successful_deliveries || 0;
        failed += health.stats.failed_deliveries || 0;
        totalDeliveries += health.stats.total_deliveries || 0;
      }
      if (health?.lastDelivery?.status === "pending") {
        pending += 1;
      }
    }

    const successRate = totalDeliveries > 0 ? Math.round((delivered / totalDeliveries) * 100) : 0;

    return { total, active, delivered, failed, totalDeliveries, successRate, pending };
  }, [webhooks, healthById]);

  const recentIssues = useMemo(() => {
    return webhooks
      .map((webhook) => ({ webhook, health: healthById[webhook.id] }))
      .filter(({ health }) => {
        const status = health?.lastDelivery?.status;
        return status === "failed" || status === "pending";
      })
      .slice(0, 6);
  }, [webhooks, healthById]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Webhooks</h1>
          <p className="text-sm text-muted-foreground">
            Receba notificações automáticas no seu sistema quando houver atualizações relevantes.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={healthLoading || loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${healthLoading ? "animate-spin" : ""}`} />
          Atualizar saúde
        </Button>
      </div>

      <Card className="p-4 border-amber-300/50 bg-amber-50/60 dark:bg-amber-950/20">
        <div className="flex items-start gap-3">
          <FlaskConical className="h-4 w-4 mt-0.5 text-amber-700 dark:text-amber-300" />
          <div className="space-y-1">
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 border border-amber-300/60">Beta</Badge>
            <p className="text-sm text-foreground">
              Esta seção está em fase beta. Como seu workspace está com Dev Experiment ativado, você já pode usar e validar os fluxos.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Saúde dos webhooks</h2>
          <p className="text-xs text-muted-foreground">Diagnóstico por entrega real</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
          <div className="rounded border p-3">
            <p className="text-muted-foreground">Total</p>
            <p className="text-xl font-semibold">{healthSummary.total}</p>
          </div>
          <div className="rounded border p-3">
            <p className="text-muted-foreground">Ativos</p>
            <p className="text-xl font-semibold">{healthSummary.active}</p>
          </div>
          <div className="rounded border p-3">
            <p className="text-muted-foreground">Entregas</p>
            <p className="text-xl font-semibold">{healthSummary.totalDeliveries}</p>
          </div>
          <div className="rounded border p-3">
            <p className="text-muted-foreground">Sucesso</p>
            <p className="text-xl font-semibold">{healthSummary.successRate}%</p>
          </div>
          <div className="rounded border p-3">
            <p className="text-muted-foreground">Falhas</p>
            <p className="text-xl font-semibold">{healthSummary.failed}</p>
          </div>
          <div className="rounded border p-3">
            <p className="text-muted-foreground">Pendentes</p>
            <p className="text-xl font-semibold">{healthSummary.pending}</p>
          </div>
        </div>

        {recentIssues.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Pendências recentes</p>
            {recentIssues.map(({ webhook, health }) => {
              const parsed = parseDeliveryError(health?.lastDelivery);
              return (
                <div key={`${webhook.id}-issue`} className="rounded border p-3 text-sm">
                  <p className="font-medium">{webhook.name}</p>
                  <p className="text-muted-foreground text-xs">{webhook.url}</p>
                  <p className="mt-1">{parsed?.summary || "Sem detalhes"}</p>
                  {parsed?.details ? <p className="text-muted-foreground">{parsed.details}</p> : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sem pendências críticas no momento.</p>
        )}
      </Card>

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
            {webhooks.map((webhook) => {
              const health = healthById[webhook.id];
              const badge = resolveHealthBadge(health);
              const parsed = parseDeliveryError(health?.lastDelivery);

              return (
                <div key={webhook.id} className="rounded-lg border p-3 flex flex-col gap-3">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <WebhookIcon className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium text-sm">{webhook.name}</p>
                        <Badge variant={webhook.is_active ? "default" : "secondary"}>
                          {webhook.is_active ? "Ativo" : "Pausado"}
                        </Badge>
                        <Badge variant={badge.variant} className="gap-1">
                          {badge.icon}
                          {badge.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground break-all">{webhook.url}</p>
                      <p className="text-xs text-muted-foreground">
                        Circuito: {circuitNameMap.get(webhook.circuit_id) || webhook.circuit_id}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Última entrega: {formatDateTime(health?.lastDelivery?.created_at || health?.stats?.last_delivery_at)}
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

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="rounded border p-2">
                      <p className="text-muted-foreground">Total</p>
                      <p className="font-semibold">{health?.stats?.total_deliveries ?? "-"}</p>
                    </div>
                    <div className="rounded border p-2">
                      <p className="text-muted-foreground">Sucesso</p>
                      <p className="font-semibold">{health?.stats?.successful_deliveries ?? "-"}</p>
                    </div>
                    <div className="rounded border p-2">
                      <p className="text-muted-foreground">Falha</p>
                      <p className="font-semibold">{health?.stats?.failed_deliveries ?? "-"}</p>
                    </div>
                    <div className="rounded border p-2">
                      <p className="text-muted-foreground">Status última</p>
                      <p className="font-semibold">{health?.lastDelivery?.status || "-"}</p>
                    </div>
                  </div>

                  {parsed ? (
                    <div className="rounded border p-2 text-xs bg-muted/30">
                      <p className="font-medium">{parsed.summary}</p>
                      {parsed.details ? <p className="text-muted-foreground break-all">{parsed.details}</p> : null}
                    </div>
                  ) : null}

                  {health?.error ? (
                    <div className="rounded border p-2 text-xs bg-destructive/10 text-destructive">
                      {health.error}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
