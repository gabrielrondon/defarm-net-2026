import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plug, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCircuits } from "@/lib/api/circuits";
import { listCircuitAdapters } from "@/lib/api/circuit-adapters";
import type { Circuit, CircuitAdapter } from "@/lib/api/types";

interface CircuitWithAdapters {
  circuit: Circuit;
  adapters: CircuitAdapter[];
}

export function PartnerAdapters() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CircuitWithAdapters[]>([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const circuits = await getCircuits();
        const results = await Promise.all(
          circuits.map(async (circuit) => {
            try {
              const adapters = await listCircuitAdapters(circuit.id);
              return { circuit, adapters };
            } catch {
              return { circuit, adapters: [] };
            }
          })
        );
        setData(results);
      } catch (err) {
        toast({
          title: "Erro ao carregar adaptadores",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [toast]);

  const adapterIcon = (type: string) => {
    switch (type) {
      case "stellar":
        return "⭐";
      case "ipfs":
        return "📦";
      case "nft":
        return "🎨";
      default:
        return "🔌";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalAdapters = data.reduce((acc, d) => acc + d.adapters.length, 0);

  return (
    <div className="space-y-6">
      <Card className="p-4 flex items-center gap-3">
        <Plug className="h-5 w-5 text-primary" />
        <div>
          <p className="text-sm font-medium text-foreground">
            {totalAdapters} adaptador{totalAdapters !== 1 ? "es" : ""} configurado
            {totalAdapters !== 1 ? "s" : ""} em {data.length} circuito
            {data.length !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            Adaptadores publicam dados automaticamente em redes externas
          </p>
        </div>
      </Card>

      {data.map(({ circuit, adapters }) => (
        <div key={circuit.id}>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            {circuit.name}
          </h3>
          {adapters.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum adaptador configurado neste circuito
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {adapters.map((adapter) => (
                <Card key={adapter.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {adapterIcon(adapter.adapter_type)}
                      </span>
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {adapter.adapter_name}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {adapter.adapter_type}
                        </p>
                      </div>
                    </div>
                    <Badge
                      className={
                        adapter.is_enabled
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {adapter.is_enabled ? "Ativo" : "Pausado"}
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    {adapter.auto_publish && (
                      <div className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        Auto-publish
                      </div>
                    )}
                    {adapter.rate_limit_per_hour && (
                      <span>{adapter.rate_limit_per_hour}/hora</span>
                    )}
                    {adapter.rate_limit_per_day && (
                      <span>{adapter.rate_limit_per_day}/dia</span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
