import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { getCircuits } from "@/lib/api/circuits";
import { getItems } from "@/lib/api/items";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Package, GitBranch, Shield } from "lucide-react";

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
      {/* Identity */}
      <div>
        <h2 className="text-foreground">
          {user?.username || "Produtor"}
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Workspace: {user?.workspace_id?.slice(0, 8)}...
        </p>
        <Badge variant="outline" className="mt-2 font-mono text-xs border-primary/30 text-primary">
          DFID: {user?.id?.slice(0, 12)}...
        </Badge>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3">
        {isLoading ? (
          <>
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </>
        ) : (
          <>
            <MetricCard icon={Package} label="Ativos" value={items?.length ?? 0} />
            <MetricCard icon={GitBranch} label="Circuitos" value={circuits?.length ?? 0} />
            <MetricCard icon={Shield} label="Compliance" value="—" />
          </>
        )}
      </div>

      {/* Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted/40 p-4">
          <p className="metric-label">E-mail</p>
          <p className="text-sm font-medium text-foreground mt-1 truncate">{user?.email}</p>
        </div>
        <div className="rounded-xl bg-muted/40 p-4">
          <p className="metric-label">Status</p>
          <Badge className="mt-1.5 bg-primary text-primary-foreground">
            {user?.is_active ? "Ativo" : "Inativo"}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-muted/40 p-4 text-center">
      <Icon className="h-5 w-5 mx-auto text-primary mb-1.5" />
      <p className="metric-value text-xl">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
