import { useQuery } from "@tanstack/react-query";
import { getItems } from "@/lib/api/items";
import { getCircuits } from "@/lib/api/circuits";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Plus, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function CadernetaRebanho() {
  const navigate = useNavigate();

  const { data: items, isLoading: loadingItems } = useQuery({
    queryKey: ["items"],
    queryFn: () => getItems(),
  });

  const { data: circuits, isLoading: loadingCircuits } = useQuery({
    queryKey: ["circuits"],
    queryFn: () => getCircuits(),
  });

  const isLoading = loadingItems || loadingCircuits;

  // Group items by circuit (using metadata or just show all)
  const circuitMap = new Map(circuits?.map((c) => [c.id, c]) ?? []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">Meu Rebanho</h3>
          <p className="text-sm text-muted-foreground">
            {items?.length ?? 0} ativo{(items?.length ?? 0) !== 1 ? "s" : ""} rastreado{(items?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          size="sm"
          className="btn-offset border-2 border-foreground bg-primary text-primary-foreground"
          onClick={() => navigate("/app/itens/novo")}
        >
          <Plus className="h-4 w-4 mr-1" />
          Novo Item
        </Button>
      </div>

      {!items?.length ? (
        <Card className="border-2 border-dashed border-muted-foreground/30">
          <CardContent className="p-8 text-center">
            <Package className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm">
              Nenhum ativo registrado ainda.
            </p>
            <Button
              variant="link"
              className="text-primary mt-2"
              onClick={() => navigate("/app/itens/novo")}
            >
              Registrar primeiro item →
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => {
            const circuit = circuitMap.get(item.metadata?.circuit_id as string);
            return (
              <Card
                key={item.id}
                className="border-2 border-foreground cursor-pointer hover:translate-x-0.5 hover:translate-y-0.5 transition-transform"
                style={{ boxShadow: "4px 4px 0 0 hsl(var(--foreground))" }}
                onClick={() => navigate(`/app/itens/${item.id}`)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {item.dfid}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.value_chain} · {item.country} · {item.year}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={item.status === "active" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {item.status}
                    </Badge>
                    {circuit && (
                      <Badge variant="outline" className="text-xs">
                        {circuit.name}
                      </Badge>
                    )}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {(items?.length ?? 0) > 0 && (
        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={() => navigate("/app/itens")}
        >
          Ver todos os itens →
        </Button>
      )}
    </div>
  );
}
