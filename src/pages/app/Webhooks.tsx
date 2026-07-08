import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation, type TFunction } from "react-i18next";
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

function parseDeliveryError(delivery: WebhookDelivery | null | undefined, t: TFunction): { summary: string; details?: string } | null {
  if (!delivery) return null;

  if (delivery.status === "delivered") {
    return { summary: t("portal.webhooks.delivery.success") };
  }

  if (delivery.status === "pending") {
    if (delivery.next_retry_at) {
      return {
        summary: t("portal.webhooks.delivery.pendingRetry"),
        details: t("portal.webhooks.delivery.nextRetry", { date: formatDateTime(delivery.next_retry_at) }),
      };
    }
    return { summary: t("portal.webhooks.delivery.pendingQueue") };
  }

  const message = (delivery.error_message || "").trim();
  if (!message) {
    return { summary: t("portal.webhooks.delivery.failure"), details: t("portal.webhooks.delivery.noTargetDetails") };
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
        summary: t("portal.webhooks.delivery.httpFailure", { code: statusCode }),
        details: targetMessage,
      };
    } catch {
      return {
        summary: t("portal.webhooks.delivery.httpFailure", { code: statusCode }),
        details: rawTail,
      };
    }
  }

  return { summary: t("portal.webhooks.delivery.failure"), details: message };
}

function resolveHealthBadge(health: WebhookHealth | undefined, t: TFunction): { label: string; variant: "default" | "secondary" | "destructive"; icon: ReactNode } {
  if (!health || health.loading) {
    return {
      label: t("portal.webhooks.badge.checking"),
      variant: "secondary",
      icon: <Clock3 className="h-3.5 w-3.5" />,
    };
  }

  if (health.error) {
    return {
      label: t("portal.webhooks.badge.diagnosticError"),
      variant: "destructive",
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
    };
  }

  const status = health.lastDelivery?.status;
  if (status === "delivered") {
    return {
      label: t("portal.webhooks.badge.healthy"),
      variant: "default",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    };
  }
  if (status === "failed") {
    return {
      label: t("portal.webhooks.badge.failing"),
      variant: "destructive",
      icon: <XCircle className="h-3.5 w-3.5" />,
    };
  }

  return {
    label: t("portal.webhooks.badge.waiting"),
    variant: "secondary",
    icon: <Clock3 className="h-3.5 w-3.5" />,
  };
}

export default function WebhooksPage() {
  const { t } = useTranslation();
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
              error: error instanceof Error ? error.message : t("portal.webhooks.diagnosticError"),
            } satisfies WebhookHealth,
          ] as const;
        }
      })
    );

    setHealthById(Object.fromEntries(healthEntries));
    setHealthLoading(false);
  }, [t]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [circuitsData, webhooksData] = await Promise.all([getCircuits(), getWebhooks()]);
      setCircuits(circuitsData);
      setWebhooks(webhooksData);
      // Default só na primeira carga via updater funcional (prev), pra não ter
      // circuitId na dep-array (double-fetch, #5) nem resetar a seleção no load() manual.
      if (circuitsData[0]) setCircuitId((prev) => prev || circuitsData[0].id);
      await loadHealth(webhooksData);
    } catch {
      toast({
        title: t("portal.webhooks.toasts.loadError"),
        description: t("portal.webhooks.toasts.loadErrorDesc"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [t, toast, loadHealth]);

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
      toast({ title: t("portal.webhooks.toasts.noEvent"), variant: "destructive" });
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
      toast({ title: t("portal.webhooks.toasts.created"), description: t("portal.webhooks.toasts.createdDesc") });
      await load();
    } catch (error) {
      toast({
        title: t("portal.webhooks.toasts.createError"),
        description: error instanceof Error ? error.message : t("portal.common.tryAgain"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (webhook: Webhook) => {
    try {
      await updateWebhook(webhook.id, { is_active: !webhook.is_active });
      toast({ title: webhook.is_active ? t("portal.webhooks.toasts.paused") : t("portal.webhooks.toasts.activated") });
      await load();
    } catch (error) {
      toast({
        title: t("portal.webhooks.toasts.updateError"),
        description: error instanceof Error ? error.message : t("portal.common.tryAgain"),
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (webhook: Webhook) => {
    try {
      await deleteWebhook(webhook.id);
      toast({ title: t("portal.webhooks.toasts.removed") });
      await load();
    } catch (error) {
      toast({
        title: t("portal.webhooks.toasts.removeError"),
        description: error instanceof Error ? error.message : t("portal.common.tryAgain"),
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
            {t("portal.webhooks.subtitle")}
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={healthLoading || loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${healthLoading ? "animate-spin" : ""}`} />
          {t("portal.webhooks.refreshHealth")}
        </Button>
      </div>

      <Card className="p-4 border-amber-300/50 bg-amber-50/60 dark:bg-amber-950/20">
        <div className="flex items-start gap-3">
          <FlaskConical className="h-4 w-4 mt-0.5 text-amber-700 dark:text-amber-300" />
          <div className="space-y-1">
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 border border-amber-300/60">{t("portal.common.beta")}</Badge>
            <p className="text-sm text-foreground">
              {t("portal.webhooks.betaNote")}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{t("portal.webhooks.health.title")}</h2>
          <p className="text-xs text-muted-foreground">{t("portal.webhooks.health.subtitle")}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
          <div className="rounded border p-3">
            <p className="text-muted-foreground">{t("portal.webhooks.stats.total")}</p>
            <p className="text-xl font-semibold">{healthSummary.total}</p>
          </div>
          <div className="rounded border p-3">
            <p className="text-muted-foreground">{t("portal.webhooks.stats.active")}</p>
            <p className="text-xl font-semibold">{healthSummary.active}</p>
          </div>
          <div className="rounded border p-3">
            <p className="text-muted-foreground">{t("portal.webhooks.stats.deliveries")}</p>
            <p className="text-xl font-semibold">{healthSummary.totalDeliveries}</p>
          </div>
          <div className="rounded border p-3">
            <p className="text-muted-foreground">{t("portal.webhooks.stats.success")}</p>
            <p className="text-xl font-semibold">{healthSummary.successRate}%</p>
          </div>
          <div className="rounded border p-3">
            <p className="text-muted-foreground">{t("portal.webhooks.stats.failures")}</p>
            <p className="text-xl font-semibold">{healthSummary.failed}</p>
          </div>
          <div className="rounded border p-3">
            <p className="text-muted-foreground">{t("portal.webhooks.stats.pending")}</p>
            <p className="text-xl font-semibold">{healthSummary.pending}</p>
          </div>
        </div>

        {recentIssues.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("portal.webhooks.recentIssues")}</p>
            {recentIssues.map(({ webhook, health }) => {
              const parsed = parseDeliveryError(health?.lastDelivery, t);
              return (
                <div key={`${webhook.id}-issue`} className="rounded border p-3 text-sm">
                  <p className="font-medium">{webhook.name}</p>
                  <p className="text-muted-foreground text-xs">{webhook.url}</p>
                  <p className="mt-1">{parsed?.summary || t("portal.webhooks.noDetails")}</p>
                  {parsed?.details ? <p className="text-muted-foreground">{parsed.details}</p> : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("portal.webhooks.noCriticalIssues")}</p>
        )}
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="text-base font-semibold">{t("portal.webhooks.new")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>{t("portal.webhooks.form.circuit")}</Label>
            <Select value={circuitId} onValueChange={setCircuitId}>
              <SelectTrigger><SelectValue placeholder={t("portal.webhooks.form.selectCircuit")} /></SelectTrigger>
              <SelectContent>
                {circuits.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("portal.webhooks.form.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("portal.webhooks.form.namePlaceholder")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>{t("portal.webhooks.form.url")}</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t("portal.webhooks.form.urlPlaceholder")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>{t("portal.webhooks.form.events")}</Label>
            <Input value={eventsText} onChange={(e) => setEventsText(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>{t("portal.webhooks.form.secret")}</Label>
            <Input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder={t("portal.webhooks.form.secretPlaceholder")} />
          </div>
        </div>
        <Button onClick={handleCreate} disabled={saving || !circuitId || !name.trim() || !url.trim()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {t("portal.webhooks.form.submit")}
        </Button>
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="text-base font-semibold">{t("portal.webhooks.registered")}</h2>
        {webhooks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("portal.webhooks.empty")}</p>
        ) : (
          <div className="space-y-2">
            {webhooks.map((webhook) => {
              const health = healthById[webhook.id];
              const badge = resolveHealthBadge(health, t);
              const parsed = parseDeliveryError(health?.lastDelivery, t);

              return (
                <div key={webhook.id} className="rounded-lg border p-3 flex flex-col gap-3">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <WebhookIcon className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium text-sm">{webhook.name}</p>
                        <Badge variant={webhook.is_active ? "default" : "secondary"}>
                          {webhook.is_active ? t("portal.webhooks.item.active") : t("portal.webhooks.item.paused")}
                        </Badge>
                        <Badge variant={badge.variant} className="gap-1">
                          {badge.icon}
                          {badge.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground break-all">{webhook.url}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("portal.webhooks.item.circuit", { name: circuitNameMap.get(webhook.circuit_id) || webhook.circuit_id })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("portal.webhooks.item.lastDelivery", { date: formatDateTime(health?.lastDelivery?.created_at || health?.stats?.last_delivery_at) })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await navigator.clipboard.writeText(webhook.url);
                          toast({ title: t("portal.webhooks.toasts.urlCopied") });
                        }}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        {t("portal.webhooks.item.copyUrl")}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleToggle(webhook)}>
                        {webhook.is_active ? t("portal.webhooks.item.pause") : t("portal.webhooks.item.activate")}
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(webhook)}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        {t("portal.webhooks.item.remove")}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="rounded border p-2">
                      <p className="text-muted-foreground">{t("portal.webhooks.itemStats.total")}</p>
                      <p className="font-semibold">{health?.stats?.total_deliveries ?? "-"}</p>
                    </div>
                    <div className="rounded border p-2">
                      <p className="text-muted-foreground">{t("portal.webhooks.itemStats.success")}</p>
                      <p className="font-semibold">{health?.stats?.successful_deliveries ?? "-"}</p>
                    </div>
                    <div className="rounded border p-2">
                      <p className="text-muted-foreground">{t("portal.webhooks.itemStats.failure")}</p>
                      <p className="font-semibold">{health?.stats?.failed_deliveries ?? "-"}</p>
                    </div>
                    <div className="rounded border p-2">
                      <p className="text-muted-foreground">{t("portal.webhooks.itemStats.lastStatus")}</p>
                      <p className="font-semibold">{health?.lastDelivery?.status ? t(`portal.enums.deliveryStatus.${health.lastDelivery.status}`, { defaultValue: health.lastDelivery.status }) : "-"}</p>
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
