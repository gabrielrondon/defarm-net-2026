import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Code2, Copy, Check, ExternalLink } from "lucide-react";
import { getCircuits } from "@/lib/api/circuits";
import { createEmbedToken, type CreateEmbedTokenResponse } from "@/lib/api/partner-routing";

/**
 * Embed token generator for the partner portal.
 * Lets the partner mint a short-lived token to embed the portfolio view
 * (items + blockchain proofs) into their end-client's app.
 */
export function PartnerEmbed({ locale = "pt-BR" }: { locale?: "pt-BR" | "en" }) {
  const t = (pt: string, en: string) => (locale === "en" ? en : pt);
  const circuitsQuery = useQuery({ queryKey: ["partner-circuits"], queryFn: () => getCircuits(), retry: false });

  const [circuitId, setCircuitId] = useState("");
  const [expires, setExpires] = useState(60);
  const [result, setResult] = useState<CreateEmbedTokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const generate = async () => {
    if (!circuitId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await createEmbedToken({ circuit_id: circuitId, expires_in_minutes: expires });
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
        { key: "token", label: "token", value: result.token },
        { key: "url", label: "embed_url", value: result.embed_url },
        { key: "iframe", label: "iframe", value: iframeSnippet },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Code2 className="h-5 w-5 text-primary" />
          {t("Embed do portfólio", "Portfolio embed")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          {t(
            "Gere um token de curta duração para embarcar a visão de portfólio (itens e provas em blockchain) na aplicação do seu cliente final.",
            "Generate a short-lived token to embed the portfolio view (items and blockchain proofs) into your end-client's application."
          )}
        </p>
      </div>

      <Card className="p-4 md:p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("Circuito", "Circuit")}</Label>
            {circuits.length > 0 ? (
              <select
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
                value={circuitId}
                onChange={(e) => setCircuitId(e.target.value)}
              >
                <option value="">{t("Selecione um circuito", "Select a circuit")}</option>
                {circuits.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                placeholder={t("ID do circuito", "Circuit ID")}
                value={circuitId}
                onChange={(e) => setCircuitId(e.target.value)}
              />
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("Expira (min)", "Expires (min)")}</Label>
            <Input
              type="number"
              min={1}
              className="w-28"
              value={expires}
              onChange={(e) => setExpires(Number(e.target.value) || 60)}
            />
          </div>
          <Button onClick={generate} disabled={!circuitId || loading}>
            {loading ? t("Gerando…", "Generating…") : t("Gerar token", "Generate token")}
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </Card>

      {result && (
        <Card className="p-4 md:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{t("Token gerado", "Token generated")}</p>
            <span className="text-xs text-muted-foreground">
              {t("Expira em", "Expires at")}: {new Date(result.expires_at).toLocaleString()}
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
              {t("Abrir preview", "Open preview")}
              <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
            </a>
          </Button>
        </Card>
      )}
    </div>
  );
}
