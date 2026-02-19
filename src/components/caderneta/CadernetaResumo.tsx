import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { getCircuits } from "@/lib/api/circuits";
import { getItems } from "@/lib/api/items";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MapPin, Package, GitBranch, Shield } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";

export function CadernetaResumo() {
  const { user } = useAuth();

  const { data: circuits, isLoading: loadingCircuits } = useQuery({
    queryKey: ["circuits"],
    queryFn: () => getCircuits(),
  });

  const { data: items, isLoading: loadingItems } = useQuery({
    queryKey: ["items"],
    queryFn: () => getItems(),
  });

  const isLoading = loadingCircuits || loadingItems;

  return (
    <div className="space-y-6">
      {/* Capa da Caderneta - Card 3D offset */}
      <Card className="border-[3px] border-foreground relative overflow-hidden" style={{ boxShadow: "6px 6px 0 0 hsl(var(--foreground))" }}>
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <CardContent className="p-6 sm:p-8 relative">
          <div className="flex items-start gap-4 sm:gap-6">
            {/* Selo DeFarm */}
            <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 bg-primary rounded-2xl flex items-center justify-center" style={{ boxShadow: "3px 3px 0 0 hsl(var(--foreground))" }}>
              <img src={logoIcon} alt="DeFarm" className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                {user?.username || "Produtor"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                Workspace: {user?.workspace_id?.slice(0, 8)}...
              </p>

              {/* DFID */}
              <div className="mt-3">
                <Badge variant="outline" className="font-mono text-xs border-primary/30 text-primary">
                  DFID: {user?.id?.slice(0, 12)}...
                </Badge>
              </div>
            </div>
          </div>

          {/* Métricas rápidas */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            {isLoading ? (
              <>
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-20 rounded-xl" />
              </>
            ) : (
              <>
                <MetricCard
                  icon={Package}
                  label="Ativos"
                  value={items?.length ?? 0}
                />
                <MetricCard
                  icon={GitBranch}
                  label="Circuitos"
                  value={circuits?.length ?? 0}
                />
                <MetricCard
                  icon={Shield}
                  label="Compliance"
                  value="—"
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info adicional */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-2 border-foreground" style={{ boxShadow: "4px 4px 0 0 hsl(var(--foreground))" }}>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">E-mail</p>
            <p className="text-sm font-medium text-foreground truncate">{user?.email}</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-foreground" style={{ boxShadow: "4px 4px 0 0 hsl(var(--foreground))" }}>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Status</p>
            <Badge className="bg-primary text-primary-foreground">
              {user?.is_active ? "Ativo" : "Inativo"}
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: number | string }) {
  return (
    <div className="bg-muted rounded-xl p-3 text-center">
      <Icon className="h-5 w-5 mx-auto text-primary mb-1" />
      <p className="text-lg sm:text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
