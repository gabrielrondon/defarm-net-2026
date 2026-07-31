import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Check, ExternalLink, GitBranch, Loader2 } from "lucide-react";
import { getCircuits } from "@/lib/api/circuits";
import { getCircuitItems } from "@/lib/api/items";
import { createEmbedToken, type CreateEmbedTokenResponse } from "@/lib/api/partner-routing";

/**
 * "Link de Visualização" — gera um link temporário e só-leitura (sem login) pra
 * alguém ver itens verificados de um circuito (provas on-chain incluídas).
 *
 * O contrato do backend é POR ITEM (item_ids obrigatório): o link só expõe os
 * DFIDs escolhidos e, por design, não serve pra contar o rebanho. É o "link de
 * lote" que o piloto frigorífico precisa — escolha os animais, rotule o
 * destinatário (audience, trilho de auditoria) e envie.
 */
export function PartnerEmbed() {
  const { t } = useTranslation();
  const circuitsQuery = useQuery({ queryKey: ["partner-circuits"], queryFn: () => getCircuits(), retry: false });

  const [circuitId, setCircuitId] = useState("");
  const [expires, setExpires] = useState(60);
  const [audience, setAudience] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<CreateEmbedTokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const itemsQuery = useQuery({
    queryKey: ["circuit-items-embed", circuitId],
    queryFn: () => getCircuitItems(circuitId),
    enabled: !!circuitId,
  });
  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);

  // Ao carregar os itens do circuito, começa com todos marcados (caso comum:
  // compartilhar o lote inteiro); desmarcar é o refinamento.
  useEffect(() => {
    setSelected(new Set(items.map((i) => i.id)));
  }, [items]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const generate = async () => {
    if (!circuitId || selected.size === 0) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await createEmbedToken({
        circuit_id: circuitId,
        item_ids: [...selected],
        expires_in_minutes: expires,
        audience: audience.trim() || undefined,
      });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const circuits = circuitsQuery.data ?? [];
  const iframeSnippet = result
    ? `<iframe src="${result.embed_url}" width="100%" height="640" frameborder="0"></iframe>`
    : "";

  const fields = result
    ? [
        {
          key: "url",
          label: t("portal.embed.viewLinkLabel"),
          value: result.embed_url,
        },
        {
          key: "iframe",
          label: t("portal.embed.iframeLabel"),
          value: iframeSnippet,
        },
        { key: "token", label: t("portal.embed.tokenLabel"), value: result.token },
      ]
    : [];

  return (
    <div className="space-y-6">
      <Card className="p-4 md:p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("portal.embed.circuit")}</Label>
            {circuits.length > 0 ? (
              <Select value={circuitId} onValueChange={setCircuitId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("portal.embed.selectCircuit")} />
                </SelectTrigger>
                <SelectContent>
                  {circuits.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              // Sem circuito não há o que compartilhar — o caminho é criar um,
              // não colar um UUID cru.
              <Button asChild variant="outline" size="sm" className="w-full justify-start">
                <Link to="/app/circuitos/novo">
                  <GitBranch className="h-3.5 w-3.5 mr-1.5" />
                  {t("portal.ingestion.noCircuit.create")}
                </Link>
              </Button>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("portal.embed.expiresMin")}</Label>
            <Input
              type="number"
              min={1}
              max={240}
              className="w-28"
              value={expires}
              onChange={(e) => setExpires(Number(e.target.value) || 60)}
            />
          </div>
        </div>

        {/* O lote: quais itens entram no link. Backend exige escolha explícita —
            o link nunca expõe além do selecionado. */}
        {circuitId && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Label className="text-xs">
                {t("portal.embed.itemsLabel")}
                {items.length > 0 && (
                  <span className="text-muted-foreground font-normal ml-1.5">
                    {t("portal.embed.itemsCount", { sel: selected.size, total: items.length })}
                  </span>
                )}
              </Label>
              {items.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs text-muted-foreground"
                    onClick={() => setSelected(new Set(items.map((i) => i.id)))}
                  >
                    {t("portal.embed.selectAll")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs text-muted-foreground"
                    onClick={() => setSelected(new Set())}
                  >
                    {t("portal.embed.selectNone")}
                  </Button>
                </div>
              )}
            </div>
            {itemsQuery.isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("portal.embed.noItems")}</p>
            ) : (
              <div className="max-h-44 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                {items.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2.5 px-3 py-1.5 text-xs cursor-pointer hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={selected.has(item.id)}
                      onCheckedChange={() => toggle(item.id)}
                      aria-label={item.dfid || item.id}
                    />
                    <span className="font-mono text-foreground/80">{item.dfid || item.id}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("portal.embed.audienceLabel")}</Label>
            <Input
              placeholder={t("portal.embed.audiencePlaceholder")}
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
            />
          </div>
          <Button onClick={generate} disabled={!circuitId || selected.size === 0 || loading}>
            {loading ? t("portal.embed.generating") : t("portal.embed.generate")}
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </Card>

      {result && (
        <Card className="p-4 md:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{t("portal.embed.linkGenerated")}</p>
            <span className="text-xs text-muted-foreground">
              {t("portal.embed.expiresAt")}: {new Date(result.expires_at).toLocaleString()}
            </span>
          </div>
          {fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label className="text-xs">{f.label}</Label>
              <div className="flex items-start gap-2">
                <code className="flex-1 break-all rounded-md border border-border bg-muted/40 p-2 text-xs">{f.value}</code>
                <Button size="sm" variant="outline" className="shrink-0" onClick={() => copy(f.key, f.value)}>
                  {copied === f.key ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          ))}
          <Button asChild size="sm" variant="outline">
            <a href={result.embed_url} target="_blank" rel="noreferrer">
              {t("portal.embed.seeAsClient")}
              <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
            </a>
          </Button>
        </Card>
      )}
    </div>
  );
}
