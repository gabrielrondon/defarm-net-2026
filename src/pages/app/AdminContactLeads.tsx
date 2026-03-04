import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mail, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { listContactLeads } from "@/lib/api/admin-users";

const ROLES = [
  "partner",
  "government",
  "producer",
  "processor",
  "certifier",
  "erp",
  "agregador",
  "other",
] as const;

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("pt-BR");
}

export default function AdminContactLeads() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const offset = (page - 1) * limit;
  const queryParams = useMemo(
    () => ({
      q: q.trim() || undefined,
      role: role === "all" ? undefined : role,
      limit,
      offset,
    }),
    [q, role, limit, offset]
  );

  const leadsQuery = useQuery({
    queryKey: ["admin-contact-leads", queryParams],
    queryFn: () => listContactLeads(queryParams),
    keepPreviousData: true,
  });

  const rows = leadsQuery.data?.rows ?? [];
  const total = leadsQuery.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(page, totalPages);
  const start = total === 0 ? 0 : (currentPage - 1) * limit + 1;
  const end = Math.min(total, currentPage * limit);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Mail className="h-6 w-6" />
          Leads de Contato
        </h1>
        <p className="text-muted-foreground">
          Mensagens enviadas pelo formulário público de contato.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Buscar por nome, e-mail, empresa ou mensagem"
          />
          <Select
            value={role}
            onValueChange={(v) => {
              setPage(1);
              setRole(v);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Perfil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os perfis</SelectItem>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(limit)}
            onValueChange={(v) => {
              setPage(1);
              setLimit(Number(v));
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tamanho da página" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / página</SelectItem>
              <SelectItem value="25">25 / página</SelectItem>
              <SelectItem value="50">50 / página</SelectItem>
              <SelectItem value="100">100 / página</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => leadsQuery.refetch()}
            disabled={leadsQuery.isFetching}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${leadsQuery.isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Lista</CardTitle>
          <div className="text-sm text-muted-foreground">
            {start}-{end} de {total}
          </div>
        </CardHeader>
        <CardContent>
          {leadsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando leads...</p>
          ) : leadsQuery.isError ? (
            <p className="text-sm text-destructive">
              {(leadsQuery.error as Error)?.message || "Erro ao carregar leads."}
            </p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lead encontrado com os filtros atuais.</p>
          ) : (
            <div className="space-y-3">
              {rows.map((lead) => (
                <div key={lead.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{lead.name}</p>
                    <Badge variant="outline">{lead.role || "sem perfil"}</Badge>
                    <Badge variant="secondary">{lead.source}</Badge>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatDateTime(lead.created_at)}
                    </span>
                  </div>
                  <p className="text-sm">
                    <span className="text-muted-foreground">E-mail:</span> {lead.email}
                  </p>
                  {lead.company ? (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Empresa:</span> {lead.company}
                    </p>
                  ) : null}
                  <p className="text-sm whitespace-pre-wrap">{lead.message}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || leadsQuery.isFetching}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || leadsQuery.isFetching}
            >
              Próxima
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
