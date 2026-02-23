import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getEmbedPortfolio } from "@/lib/api/partner-routing";
import { Loader2 } from "lucide-react";

export default function EmbedPortfolio() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";

  const { data, isLoading, error } = useQuery({
    queryKey: ["embed-portfolio", token],
    queryFn: () => getEmbedPortfolio(token),
    enabled: Boolean(token),
    staleTime: 15_000,
  });

  const circuit = useMemo(() => data?.portfolio?.circuit as Record<string, unknown> | undefined, [data]);
  const stats = useMemo(() => data?.portfolio?.stats as Record<string, unknown> | undefined, [data]);
  const items = useMemo(() => (data?.portfolio?.recent_items || []) as Record<string, unknown>[], [data]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-6 max-w-lg w-full">
          <h1 className="text-lg font-semibold">Token de embed ausente</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Use a URL gerada no portal do parceiro para acessar este portfólio.
          </p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-6 max-w-lg w-full">
          <h1 className="text-lg font-semibold">Não foi possível carregar o embed</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Verifique se o token ainda está válido.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{String(circuit?.name || "Portfolio")}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {String(circuit?.description || "Portfólio de rastreabilidade DeFarm")}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">{String(circuit?.visibility || "private")}</Badge>
              <Badge variant="outline">{String(circuit?.circuit_type || "private")}</Badge>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4"><p className="text-xs text-muted-foreground">Itens totais</p><p className="text-xl font-bold">{String(stats?.total_items || 0)}</p></Card>
          <Card className="p-4"><p className="text-xs text-muted-foreground">Ativos</p><p className="text-xl font-bold">{String(stats?.active_items || 0)}</p></Card>
          <Card className="p-4"><p className="text-xs text-muted-foreground">Value chains</p><p className="text-xl font-bold">{Array.isArray(stats?.value_chains) ? (stats?.value_chains as unknown[]).length : 0}</p></Card>
          <Card className="p-4"><p className="text-xs text-muted-foreground">Atividade recente</p><p className="text-xl font-bold">{String(stats?.recent_activity_count || 0)}</p></Card>
        </div>

        <Card className="p-6">
          <h2 className="text-base font-semibold mb-3">Itens recentes</h2>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={String(item.id)} className="rounded-md border p-3 flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{String(item.dfid || item.id)}</p>
                  <p className="text-xs text-muted-foreground">
                    {String(item.value_chain || "-")} · {String(item.country || "-")} · {String(item.status || "-")}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">{new Date(String(item.registered_at || "")).toLocaleString("pt-BR")}</p>
              </div>
            ))}
            {items.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum item recente.</p> : null}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-base font-semibold mb-3">Proofs recentes (Stellar/IPFS)</h2>
          <div className="space-y-2">
            {data.recent_event_proofs.map((proof) => (
              <div key={proof.id} className="rounded-md border p-3">
                <p className="text-sm font-medium">{proof.event_type}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  stellar: {proof.stellar_tx_hash || "—"} · ipfs: {proof.ipfs_cid || "—"}
                </p>
              </div>
            ))}
            {data.recent_event_proofs.length === 0 ? <p className="text-sm text-muted-foreground">Sem proofs recentes.</p> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
