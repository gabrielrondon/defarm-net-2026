import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileSpreadsheet, Mail, RefreshCw } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

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

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsv(
  rows: Array<{
    id: string;
    name: string;
    email: string;
    company?: string | null;
    role?: string | null;
    message: string;
    client_ip?: string | null;
    source: string;
    created_at: string;
  }>
): string {
  const headers = [
    "created_at",
    "id",
    "name",
    "email",
    "company",
    "role",
    "source",
    "client_ip",
    "message",
  ];
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.created_at,
        row.id,
        row.name,
        row.email,
        row.company || "",
        row.role || "",
        row.source,
        row.client_ip || "",
        row.message,
      ]
        .map((v) => csvEscape(String(v)))
        .join(",")
    );
  }
  return lines.join("\n");
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminContactLeads() {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [exportingCsv, setExportingCsv] = useState(false);

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

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const pageSize = 500;
      let exportOffset = 0;
      const allRows: typeof rows = [];
      while (true) {
        const resp = await listContactLeads({
          q: q.trim() || undefined,
          role: role === "all" ? undefined : role,
          limit: pageSize,
          offset: exportOffset,
        });
        allRows.push(...resp.rows);
        exportOffset += resp.rows.length;
        if (resp.rows.length === 0 || exportOffset >= resp.count) break;
      }
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      downloadCsv(toCsv(allRows), `contact-leads-${stamp}.csv`);
      toast({
        title: "CSV exportado",
        description: `${allRows.length} lead(s) exportado(s).`,
      });
    } catch (err) {
      toast({
        title: "Falha ao exportar CSV",
        description: err instanceof Error ? err.message : "Erro inesperado ao gerar CSV.",
        variant: "destructive",
      });
    } finally {
      setExportingCsv(false);
    }
  };

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
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Filtros</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={exportingCsv || leadsQuery.isLoading}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {exportingCsv ? "Exportando..." : "Export CSV"}
            </Button>
          </div>
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
