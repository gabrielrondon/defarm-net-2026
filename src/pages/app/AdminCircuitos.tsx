import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { adminListCircuits, setCircuitVerified } from "@/lib/api/circuits";
import { VerifiedBadge, isVerified } from "@/components/circuit/VerifiedBadge";
import { ExternalLink, BadgeCheck, Search } from "lucide-react";

export default function AdminCircuitos() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const circuitsQuery = useQuery({
    queryKey: ["admin-circuits"],
    queryFn: () => adminListCircuits({ limit: 500 }),
  });

  const verify = useMutation({
    mutationFn: ({ id, verified }: { id: string; verified: boolean }) =>
      setCircuitVerified(id, verified),
    onMutate: ({ id }) => setSavingId(id),
    onSuccess: (_d, { verified }) => {
      toast({ title: verified ? "Selo concedido" : "Selo removido" });
      qc.invalidateQueries({ queryKey: ["admin-circuits"] });
      qc.invalidateQueries({ queryKey: ["circuits"] });
    },
    onError: () => toast({ title: "Não foi possível alterar o selo", variant: "destructive" }),
    onSettled: () => setSavingId(null),
  });

  const rows = useMemo(() => {
    const all = circuitsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    const filtered = q ? all.filter((c) => c.name.toLowerCase().includes(q)) : all;
    // Verificados primeiro, depois alfabético.
    return [...filtered].sort(
      (a, b) => Number(isVerified(b)) - Number(isVerified(a)) || a.name.localeCompare(b.name),
    );
  }, [circuitsQuery.data, search]);

  const verifiedCount = (circuitsQuery.data ?? []).filter(isVerified).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="section-label mb-1">Admin</p>
        <h1 className="text-2xl font-bold text-foreground">Circuitos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Todos os circuitos da plataforma. Conceda o selo{" "}
          <span className="inline-flex items-center gap-1 text-primary">
            <BadgeCheck className="h-3.5 w-3.5" /> Verificado pela DeFarm
          </span>{" "}
          aos circuitos oficiais — como o <strong>Sistema de Rastreabilidade Independente</strong>.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar circuito por nome…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {rows.length} circuito(s) · {verifiedCount} verificado(s)
        </p>
      </div>

      {circuitsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum circuito encontrado.</p>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Visibilidade</TableHead>
                <TableHead>Selo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => {
                const verified = isVerified(c);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <Link to={`/app/circuitos/${c.id}`} className="hover:underline inline-flex items-center gap-1.5">
                        {c.name}
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.circuit_type}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {c.visibility}
                      </Badge>
                    </TableCell>
                    <TableCell>{verified ? <VerifiedBadge /> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={verified ? "outline" : "default"}
                        disabled={savingId === c.id}
                        onClick={() => verify.mutate({ id: c.id, verified: !verified })}
                      >
                        {verified ? "Remover selo" : "Conceder selo"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
